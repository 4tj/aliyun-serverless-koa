const { createServer, proxy } = require('../../index')
const Koa = require('koa')
const cors = require('@koa/cors')
const bodyParser = require('koa-bodyparser')
const Router = require('@koa/router')

const app = new Koa()
const router = new Router()

app.use(cors())
app.use(bodyParser())

router.get('/', (ctx) => {
  ctx.body = 'Hello, World!'
})

router.post('/post', (ctx) => {
  ctx.body = ctx.request.body
})

app.use(router.routes())
app.use(router.allowedMethods())

const server = createServer(app.callback())
module.exports.handler = (event, context, callback) => proxy(server, event, context, callback)