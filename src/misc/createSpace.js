'use strict'

const config = require('../config')

const matrixSDK = require('matrix-js-sdk')
const client = matrixSDK.createClient(config)

client.startClient({ initialSyncLimit: 1 })
    .catch(error => console.error(error))

client.once('sync', async (state) => {
  const { room_id: spaceId } = await client.createRoom({
    name: `ODIN-SPACE-${new Date().toISOString()}`,
    visibility: 'private',
    creation_content: {
      type: 'm.space' // indicates that the room has the role of a SPACE
    }
  })

  console.log(`created SPACE with roomId ${spaceId}`)
    
  const { room_id: childRoomId } = await client.createRoom({
    name: `ODIN-SPACE-CHILD-${new Date().toISOString()}`,
    visibility: 'private'
  })
  
  console.log(`created ROOM with roomId ${childRoomId}`)

  await client.sendStateEvent(spaceId, 'm.space.child', 
    {
      auto_join: false,
      suggested: false,
      via: [
        'matrix.org'
      ]
    },
    childRoomId
  )
  console.log('created link PARENT SPACE => CHILD ROOM')

  await client.sendStateEvent(childRoomId, 'm.space.parent', {}, spaceId)
  console.log('created link CHILD ROOM => PARENT SPACE')


})
