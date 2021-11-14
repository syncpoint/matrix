'use strict'

const config = require('../config')

const matrixSDK = require('matrix-js-sdk')
const client = matrixSDK.createClient(config)

const ROOM_TO_EXPLORE = 'ODIN-Projekt'


client.startClient({ initialSyncLimit: 1 })
    .catch(error => console.error(error))

  client.once('sync', state => {
    console.log(`sync state is now ${state}`)
    if (state !== 'PREPARED') return
    const rooms = client.getRooms() 


    const room = rooms.find(room => {
      console.log(`room ${room.name} is of type ${room.room_type}`)
      return room.name === ROOM_TO_EXPLORE
    })
    if (!room) { console.error(`${ROOM_TO_EXPLORE} not found`); process.exit(76) }


    client.getRoomHierarchy(room.roomId, 10, 2, false).then(result => console.dir(result))
    
    client.on('event', ({ event }) => {
      // console.dir(event)
      if (event.type.startsWith('m.space')) {
        client.getRoomHierarchy(room.roomId, 10, 2, false).then(result => console.dir(result))
      }
    })
  })
