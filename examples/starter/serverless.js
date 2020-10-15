const { createServer, proxy } = require('../../src/index')
const Koa = require('koa')

const app = new Koa()

app.use(async ctx => {
  ctx.body = 'Hello, world!';
})

const server = createServer(app.callback())
module.exports.handler = (event, context, callback) => proxy(server, event, context, callback)