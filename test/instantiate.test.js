const assert = require('assert')
const { v4: uuidv4 } = require('uuid')
const Odrix = require('../src/index')

const config = require('../src/config')

describe('wait for odrix to be ready', () => {
  const client = new Odrix(config)
  
  client.on('state', async state => {
    assert.strictEqual(state, 'READY')
    const isReady = client.isReady()
    assert.strictEqual(isReady, true)
    client.stop()
  })

  client.start()
  const isReady = client.isReady()
  assert.strictEqual(isReady, false)
})

describe('create space and rooms from project structure' , () => {

  const projectStructure = {
    id: uuidv4(),
    name: 'Simply the best project name, ever',
    layers: [
      { id: uuidv4(), name: 'Own Situation'},
      { id: uuidv4(), name: 'Friendly Force Tracking'},
      { id: uuidv4(), name: 'Plans and Orders'},
      { id: uuidv4(), name: 'Globally significant'},
    ]
  }

  const client = new Odrix(config)

  client.on('state', async state => {
    assert.strictEqual(state, 'READY')
    assert.doesNotReject(client.shareProject(projectStructure))
    client.stop()
  })

  client.start()
})