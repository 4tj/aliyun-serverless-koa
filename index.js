const http = require('http')
const path = require('path')
const os = require('os')
const url = require('url')

function getQueryString(event) {
  return url.format({pathname: event.path, query: event.queryParameters})
}

function getSocketPath (suffix) {
  return path.join(os.tmpdir(), `server-${suffix}.sock`)
}

function getEventBody (event) {
  return Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8').toString()
}

function getEventJSON(event) {
  return JSON.parse(event.toString())
}

function getRequestOptions (event, socketPath) {
  const headers = { ...event.headers }
  delete headers['content-length']
  delete headers['accept-encoding']

  return {
    method: event.httpMethod,
    path: getQueryString(event),
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

function forwardResponse (response, callback) {
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
    const requestOptions = getRequestOptions(event, getSocketPath(server._socketPath))
    const req = http.request(requestOptions, (response) => forwardResponse(response, callback))
    if (event.body) {
      req.write(getEventBody(event))
    }
    req.on('error', (err) => console.error(err)).end()
  } catch (err) {
    forwardError(err, callback)
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
  const eventJSON = getEventJSON(event)
  if (server._isListening) {
    forwardRequest(server, eventJSON, context, callback)
    return server
  } else {
    startServer(server).on('listening', () => forwardRequest(server, eventJSON, context, callback))
  }
}

exports.createServer = createServer
exports.proxy = proxy
