/* ODRIX is an interface that allows using ODIN primitives to be mapped to Matrix */

const EventEmitter = require('events')
const matrixSDK = require('matrix-js-sdk')

class odirx extends EventEmitter{
  constructor (config) {
    super()
    this.client = matrixSDK.createClient(config)

    this.client.on('sync', (state) => {
      if (state === 'PREPARED') {
        this.emit('state', 'READY')
      }
    })

    this.client.on('event', (event) => {
      console.dir(event)
    })
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
    if (!this.isReady()) return Promise.reject(new Error('[MATRIX] API is not ready'))

    // this must to be idempotent, so we need to check if the project is already shared
    const space = await this.client.getRoom(projectStructure.id)
    if (space) return Promise.resolve()

    try {
      const { room_id: spaceId } = await this.client.createRoom({
        name: projectStructure.name,
        visibility: 'private',
        creation_content: {
          type: 'm.space' // indicates that the room has the role of a SPACE
        }
      })
    
      console.log(`created SPACE for ${projectStructure.name} with roomId ${spaceId}`)
      
      for (const layer of projectStructure.layers) {
        const { room_id: childRoomId } = await this.client.createRoom({
          name: layer.name,
          visibility: 'private'
        })
        
        console.log(`created ROOM for ${layer.name} with roomId ${childRoomId}`)
      
        await this.client.sendStateEvent(spaceId, 'm.space.child', 
          {
            auto_join: true,
            suggested: true,
            via: [
              'matrix.org'
            ]
          },
          childRoomId
        )
        console.log('created link PARENT SPACE => CHILD ROOM')
      }
          
      await this.client.sendStateEvent(childRoomId, 'm.space.parent', {}, spaceId)
      console.log('created link CHILD ROOM => PARENT SPACE')
      
      return Promise.resolve(projectStructure)
    } catch (error) {
      return Promise.reject(error)
    }

    // create space and the first room for the default layer
    // subscribe to room events
    // * messages
    // * invitations
    // * membership changes?
  }

  async invite (projectId, matrixUserName) {
    // by making use of auto-join the invitation should be accepted immediadetly 
  }

  async post (layerId, message) {
    // post a CRUD message affecting the layerId
  }

}

module.exports = odirx
