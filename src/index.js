/* ODRIX is an interface that allows using ODIN primitives to be mapped to Matrix */

const EventEmitter = require('events')
const matrixSDK = require('matrix-js-sdk')
const { URL } = require('url')

const MAX_NUMBER_OF_ROOMS = 1000
const MAX_DEPTH = 1

const ODIN_MESSAGE_TYPE = 'io.syncpoint.odin.action'

const extractServerName = baseUrl => {
  const url = new URL(baseUrl)
  return url.hostname
}

class Odirx extends EventEmitter{
  constructor (config) {
    super()
  
    this.client = matrixSDK.createClient(config)
    this.matrixServer = extractServerName(config.baseUrl)

    /* this.client.on('sync', (state) => {
      if (state === 'PREPARED') {
        this.emit('state', 'READY')
      }
    }) */

    /*
      We assume that invitations, kicks or bans are made on a project (aka space) basis. 
    */
    this.client.on('RoomMember.membership', async (event, member) => {
      if (member.userId !== this.client.getUserId()) return // does not affect the current user

      const affectedRoom = await this.client.getRoom(member.roomId)
      if (!affectedRoom || affectedRoom.getType() !== 'm.space') return // not a SPACE      
      // TODO: UNCOMMENT THIS LINE 
      // if (!affectedRoom.getCanonicalAlias()) return // not an ODIN project

      const projectStructure = this.#toOdinStructure(affectedRoom)
      const actionVerb = `membership/${member.membership}`

      this.#emit(actionVerb, projectStructure)
    })


    this.client.on('Room.timeline', async (event, room) => {
      if (event.getType() !== ODIN_MESSAGE_TYPE) return
      if (room.getType() === 'm.space') return // no messages posted in spaces
      
      const stateEvent = room.currentState.events.get('m.space.parent')
      if (!stateEvent) {
        return console.error(`Room ${$room.id} does not have a m.space.parent event! Will not handle this!`)
      }
      // stateEvent is of type "Map"
      const { event: parentEvent } = stateEvent.values().next().value
      const space = await this.client.getRoom(parentEvent.state_key)
      const projectStructure = this.#toOdinStructure(space)
      
      const payload = {
        project: projectStructure,
        layer: this.#toOdinStructure(room),  
        body: event.event.content
      }

      this.#emit('data', payload)
    })
  }

  /**** private functions ****/

  #handleSyncState


  #emit = (action, entity) => {
    process.nextTick(() => this.emit(action, entity))
  }

  #toOdinId = matrixId => matrixId 
    ? matrixId
      .replace(`:${this.matrixServer}`,'')
      .substr(1)
    : matrixId

  #toMatrixAlias = odinId => `#${odinId}:${this.matrixServer}`

  #toOdinStructure = (room) => {
    if (!room) return
    const alias = (room.canonical_alias || (room.getCanonicalAlias ? room.getCanonicalAlias() : undefined))
    if (!alias) return
  
    const id = this.#toOdinId(alias)

    return {
      id,
      name: room.name
    }
  }

  #removeEmpty = (value) => {
    return (value !== undefined)
  }
  
  /**** public functions ****/

  async login (userId, password) {
    return this.client.loginWithPassword(userId, password)
  }

  /**
   * 
   * @returns 
   * @async
   */
  start () {
    return this.client.startClient()
  }

  /**
   * @async
   */
  stop () {
    return this.client.stopClient()
  }

  isReady () {
    const syncState = this.client.getSyncState()
    // syncState is one out of ERROR, PREPARED, STOPPED, SYNCING, CATCHUP, RECONNECTING
    // https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/sync.api.ts
    return (syncState !== null && syncState === 'PREPARED')
  }

  async toBeReady () {
    return new Promise(resolve => {
      if (this.isReady()) return resolve()

      const readyChecker = state => {
        if (state === 'PREPARED') {
          this.client.off('sync', readyChecker)
          return resolve()
        }          
      }

      this.client.on('sync', readyChecker)
    })
  }

  /**
   * 
   * @returns {[User]} "All known users": whatever that means for servers wit tons of users
   */
  users () {
    return this.client.getUsers().map(user => ({
      userId: user.userId,
      displayName: user.displayName,
      currentlyActive: user.currentlyActive,
      presence: user.presence
    }))
  }

  async projectExists (projectId) {
    const alias = this.#toMatrixAlias(projectId)

    return this.client.resolveRoomAlias(alias)
      .then((data) => {return Promise.resolve({ ...data, ...{ exists: true }})})
      .catch(() => {return Promise.resolve({ exists: false })})
  }

  /**
   * 
   * @param {*} projectStructure : An object that contains the projectId, project name and an array of layers (ids and names)
   * 
   * {
   *  "id": "project-UUID",
   *  "name": "Human readable project name",
   *  "layers": [
   *    { "id": "layerId-1", "name": "human readable layer name 1" },
   *    { "id": "layerId-2", "name": "human readable layer name 2" },
   *    { "id": "layerId-3", "name": "human readable layer name 3" },
   *    { "id": "layerId-4", "name": "human readable layer name 4" },
   *  ]
   * }
   */
  async shareProject (projectStructure) {
    if (!this.isReady()) return Promise.reject(new Error('[Matrix] API is not ready'))

      const { exists } = await this.projectExists(projectStructure.id, this.matrixServer)
      if (exists) return Promise.reject(new Error(`The project identified by ${projectStructure.id} has already been shared`))
       
      // console.log('Creating SPACE and ROOMS ...')

      const { room_id: spaceId } = await this.client.createRoom({
        name: projectStructure.name,
        room_alias_name: projectStructure.id, // Sets the canonical_alias which is UNIQUE for ALL rooms!
        visibility: 'private',
        room_version: '9', // latest stable version as of nov21 (must be a string)
        creation_content: {
          type: 'm.space' // indicates that the room has the role of a SPACE
        }
      })

      // console.log(`created SPACE for ${projectStructure.name} with roomId ${spaceId}`)
      
      for (const layer of projectStructure.layers) {

        const { room_id: childRoomId } = await this.client.createRoom({
          name: layer.name,
          room_alias_name: layer.id,
          visibility: 'private',
          room_version: '9', // latest stable version as of nov21 (must be a string)
        })
        
        // console.log(`created ROOM for ${layer.name} with roomId ${childRoomId}`)
      
        // create link PARENT SPACE => CHILD ROOM
        await this.client.sendStateEvent(spaceId, 'm.space.child', 
          {
            auto_join: false,
            suggested: false,
            via: [
              this.matrixServer
            ]
          },
          childRoomId
        )

        // create link CHILD ROOM => PARENT SPACE
        await this.client.sendStateEvent(childRoomId, 'm.space.parent', {}, spaceId)

        /*
          we need to send a m.room.join_rules event in order to allow all users that are invited to the space
          to see all participating rooms
        */
        await this.client.sendStateEvent(
          childRoomId,
          'm.room.join_rules',
          {
            join_rule: 'restricted', // see enum JoinRule from @types/partials.ts
            allow: [
              {
                type: 'm.room_membership', // see enum RestrictedAllowType from @types/partials.ts
                room_id: spaceId
              }
            ]
        })
      }
          
      return Promise.resolve()
  }

  async invite (projectStructure, matrixUserId) {
    // by making use of auto-join the invitation should be accepted immediadetly 
    const {exists, room_id: roomId } = await this.projectExists(projectStructure.id, this.matrixServer)
    if (!exists) return Promise.reject(new Error(`No [Matrix] room found for projectId ${projectStructure.id}`))

    await this.client.invite(roomId, matrixUserId)
    return Promise.resolve()
  }

  /**
   * 
   * @returns [ProjectStructure] that the current user is invited
   * @async
   */
  async invitedProjects () {

    const spacesWithInvitation = await this.client.getRooms()
      .filter(room => room.getType() === 'm.space')
      .filter(space => space.selfMembership === 'invite')
      .filter(space => (space.getCanonicalAlias())) // must have an ODIN project ID

    const projects = spacesWithInvitation
      .map(this.#toOdinStructure)
      .filter(this.#removeEmpty)
      .map(project => ({ ...project, ...{ layers: []} })) // a non-joined project can't show us it's hierarchy
 
    return Promise.resolve(projects)
  }

  /**
   * @returns [ProjectStructure] An array of projects the user is a member of
   * @async
   */
  async projects () {
    const rooms = await this.client.getRooms()
    
    const joinedProjectSpaces = rooms
      .filter(room => room.getType() === 'm.space')
      .filter(space => space.selfMembership === 'join')
      .filter(space => (space.getCanonicalAlias())) // must have an ODIN project ID

    const hierarchy = (await Promise.allSettled(
      joinedProjectSpaces.map(async (space) =>  {
        // strange behaviour! Calling getRoomHierarchy with just the room id FAILS although 
        // the other params are defined as optional
        const h = (await this.client.getRoomHierarchy(space.roomId, MAX_NUMBER_OF_ROOMS, MAX_DEPTH, false, null))

        return Promise.resolve({
          spaceId: this.#toOdinId(space.getCanonicalAlias()),
          rooms: h.rooms.filter(room => room.room_id !== space.roomId) // the space itself is also a room that is part of the hierarchy, but we don't want it bo be listed as a child room
        })
      })
    )).map(promise => promise.value)
    
    const projects = joinedProjectSpaces
      .map(this.#toOdinStructure)
      .map(odinProjectStructure => {
        const space = hierarchy.find(space => space.spaceId === odinProjectStructure.id)

        const layers = (space)
          ? (space.rooms.map(room => this.#toOdinStructure(room)).filter(room => (room !== undefined)))
          : []
        return {...odinProjectStructure, ...{ layers }}
      })

    return Promise.resolve(projects)
  }

  /**
   * 
   * @param {*} projectId The ODIN project ID 
   * @returns {Promise<void>}
   * @async
   */
  async join (projectId) {
    // join the space room and all rooms within the hierarchy (depth of room hierarchy is supposed to be 1)
    const alias = this.#toMatrixAlias(projectId)
    const space = await this.client.joinRoom(alias)

    // after joining all child-rooms of the space should be visible
    const hierarchy = await this.client.getRoomHierarchy(space.roomId, MAX_NUMBER_OF_ROOMS, MAX_DEPTH, false)
    // one line of code to join them all ;-)
    await Promise.allSettled(
      hierarchy.rooms
        .filter(room => room.room_id !== space.roomId) // remove the space itself from the hierarchy list
        .map(childRoom => this.client.joinRoom(childRoom.room_id))
    )
    // It's annoying that the matrix-js-sdk uses inconsistent property names (roomId vs. room_id)

    return Promise.resolve()
  }

  async post (layerId, message) {
    const alias = this.#toMatrixAlias(layerId)
    const { room_id: roomId } = await this.client.resolveRoomAlias(alias)
    if (!roomId) return Promise.reject(new Error(`Layer with id ${layerId} does not exist or you don't have access to it`))
    console.dir(roomId)

    return this.client.sendEvent(roomId, ODIN_MESSAGE_TYPE, message)
  }

}

module.exports = Odirx
