const assert = require('assert')
const { v4: uuidv4 } = require('uuid')
const Odrix = require('../src/index')

const config = require('../src/config')
const { checkServerIdentity } = require('tls')

describe('Use ODRIX API', async () => {
  /* it('wait for ODRIX to be ready', async () => {
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
  }) */

  it('create space and rooms from project structure' , async () => {

    const projectStructure = {
      // id: '219f5f10-2bd9-4774-9343-a5a6794fe53f', // fixed UUID in order to test idempotency
      id: uuidv4(),
      name: 'Simply the best project name, ever',
      layers: [
        { id: uuidv4(), name: 'Own Situation'}
      ]
    }

    // const INVITEE = '@s2:thomass-macbook-pro.local'
    const INVITEE = '@thomas:thomass-macbook-pro.local'
  
    // console.dir(projectStructure)
  
    const client = new Odrix(config)
  
  
    client.on('state', async (state) => {
      console.log(`STATE: ${state}`)
      assert.strictEqual(state, 'READY')
      try {
        /* await client.shareProject(projectStructure)
        await client.invite(projectStructure, INVITEE) */
        // const spacedWIthInvitation = await client.invitedProjects()
        const projects = await client.projects()
        console.dir(projects)

        if (projects.length > 0) {
          console.dir(projects[0].layers)
        }

        // should be alias #c05054c7-deb1-43e9-b021-7d8b63e32022:thomass-macbook-pro.local
      } catch (error) {
        console.error(error)
      } finally {
        client.stop()
      }
      
      
    })
  
    client.start()
  })

})



