const http = require('http')
const path = require('path')
const os = require('os')

function getSocketPath (suffix) {
  return path.join(os.tmpdir(), `server-${suffix}.sock`)
}

function getEventBody (event) {
  return Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8')
}

function getRequestOptions (event, context, socketPath) {
  const headers = { ...event.headers }
  delete headers['content-length']
  delete headers['accept-encoding']

  return {
    method: event.httpMethod,
    path: event.path,
    headers,
    socketPath
  }
}

function forwardError (error, callback) {
  console.error(error)
  callback(null, {
    isBase64Encoded: false,
    statusCode: 500,
    headers: {},
    body: '',
  })
}

function forwardResponse (server, response, callback) {
  const buf = []
  response
    .on('data', (chunk) => buf.push(chunk))
    .on('end', () => {
      const bodyBuffer = Buffer.concat(buf)

      callback(null, {
        isBase64Encoded: true,
        statusCode: response.statusCode,
        headers: response.headers,
        body: bodyBuffer.toString('base64'),
      })
    })
}

function forwardRequest (server, event, context, callback) {
  try {
    const requestOptions = getRequestOptions(event, context, getSocketPath(server._socketPath))
    const req = http.request(requestOptions, (response) => forwardResponse(server, response, callback))
    if (event.body) {
      req.write(getEventBody(event))
    }

    req.on('error', (err) => forwardError(err)).end()
  } catch (err) {
    console.log(err)
  }
}

function getRandomString () {
  return Math.random().toString(36).substring(2, 15)
}

function startServer (server) {
  return server.listen(getSocketPath(server._socketPath))
}

function createServer (requestListener, listenCallback) {
  const server = http.createServer(requestListener)

  server._socketPath = getRandomString()

  server.on('listening', () => {
    server._isListening = true

    if (listenCallback) {
      listenCallback()
    }
  })

  server.on('close', () => {
    server._isListening = false
  })
    .on('error', (error) => {
      console.log('ERROR: server error')
      console.error(error)
    })

  return server
}

function proxy (server, event, context, callback) {
  if (server._isListening) {
    forwardRequest(server, event, context, callback)
    return server
  } else {
    startServer(server).on('listening', () => forwardRequest(server, event, context, callback))
  }
}

exports.createServer = createServer
exports.proxy = proxy
