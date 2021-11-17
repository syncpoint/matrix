/* ODRIX is an interface that allows using ODIN primitives to be mapped to Matrix */

const EventEmitter = require('events')
const matrixSDK = require('matrix-js-sdk')
const { URL } = require('url')


const extractServerName = baseUrl => {
  const url = new URL(baseUrl)
  return url.hostname
}

class Odirx extends EventEmitter{
  constructor (config) {
    super()
  
    this.client = matrixSDK.createClient(config)
    this.matrixServer = extractServerName(config.baseUrl)

    this.client.on('sync', (state) => {
      if (state === 'PREPARED') {
        this.emit('state', 'READY')
      }
    })

    /* this.client.on('event', (event) => {
      console.dir(event)
    }) */
  }

  start () {
    this.client.startClient()
  }

  stop () {
    this.client.stopClient()
  }

  isReady () {
    const syncState = this.client.getSyncState()
    // syncState is one out of ERROR, PREPARED, STOPPED, SYNCING, CATCHUP, RECONNECTING
    // https://github.com/matrix-org/matrix-js-sdk/blob/develop/src/sync.api.ts
    return (syncState !== null && syncState === 'PREPARED')
  }

  async clearStores () {
    return this.client.clearStores()
  }

  async projectExists (projectId, matrixServer) {
    const alias = `#${projectId}:${matrixServer}`
    console.log(`looking for alias ${alias}`)
    return this.client.resolveRoomAlias(alias)
      .then((data) => {return Promise.resolve({ ...data, ...{ exists: true }})})
      .catch((err) => {return Promise.resolve({ exists: false })})
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
       
      console.log('Creating SPACE and ROOMS ...')

      const { room_id: spaceId } = await this.client.createRoom({
        name: projectStructure.name,
        room_alias_name: projectStructure.id, // Sets the canonical_alias which is UNIQUE for ALL rooms!
        visibility: 'private',
        room_version: '9', // latest stable version as of nov21 (must be a string)
        creation_content: {
          type: 'm.space' // indicates that the room has the role of a SPACE
        }
      })

      console.log(`created SPACE for ${projectStructure.name} with roomId ${spaceId}`)
      
      for (const layer of projectStructure.layers) {

        const { room_id: childRoomId } = await this.client.createRoom({
          name: layer.name,
          room_alias_name: layer.id,
          visibility: 'private',
          room_version: '9', // latest stable version as of nov21 (must be a string)
        })
        
        console.log(`created ROOM for ${layer.name} with roomId ${childRoomId}`)
      
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
        console.log('created link PARENT SPACE => CHILD ROOM')

        await this.client.sendStateEvent(childRoomId, 'm.space.parent', {}, spaceId)
        console.log('created link CHILD ROOM => PARENT SPACE')

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

        console.log('created join_rules for making CHILD ROOM visible if PARENT SPACE is joined')
      }
          
      return Promise.resolve(projectStructure)


    // create space and the first room for the default layer
    // subscribe to room events
    // * messages
    // * invitations
    // * membership changes?
  }

  async invite (projectStructure, matrixUserId) {
    // by making use of auto-join the invitation should be accepted immediadetly 
    const {exists, room_id: roomId } = await this.projectExists(projectStructure.id, this.matrixServer)
    if (!exists) return Promise.reject(new Error(`No [Matrix] room found for projectId ${projectStructure.id}`))

    const result = await this.client.invite(roomId, matrixUserId)
    
    return Promise.resolve(result)
  }

  /**
   * 
   * @returns [ProjectStructure] that the current user is invited
   * @async
   */
  async pendingInvitations () {

    const spacesWithInvitation = await this.client.getRooms()
      .filter(room => room.getType() === 'm.space')
      .filter(space => space.selfMembership === 'invite')

    const projects = spacesWithInvitation.map(space => {
      const alias = space.getCanonicalAlias()
      if (!alias) return

      const projectId = alias
        .replace(`:${this.matrixServer}`,'')
        .substr(1)

      return {
        id: projectId,
        name: space.name,
        layers: [] // not visible unless we join the project
      }
      
    }).filter(entry => entry !== undefined)
 
    return Promise.resolve(projects)
  }

  async join (projectId) {

  }

  async post (layerId, message) {
    // post a CRUD message affecting the layerId
  }

}

module.exports = Odirx
