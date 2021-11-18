'use strict'

require('dotenv').config()
// , 'MATRIX_ACCESS_TOKEN'
const config = ['MATRIX_BASE_URL', 'MATRIX_USER_ID']

config.forEach(matrixConfig => {
  if (!process.env[matrixConfig]) {
    console.error(`${matrixConfig} is not defined. Required variables are`)
    console.dir(config)
    process.exit(77)
  }
})

module.exports = {
  baseUrl: process.env.MATRIX_BASE_URL,
  userId: process.env.MATRIX_USER_ID,
  accessToken: process.env.MATRIX_ACCESS_TOKEN
}
