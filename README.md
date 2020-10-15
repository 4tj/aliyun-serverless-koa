# Aliyun Serverless Koa
阿里云的函数计算Koa框架的迁移方案，更简洁的方式，实际已上线使用。

## Getting Started

```javascript
npm install aliyun-serverless-koa
```

```javascript
const { createServer, proxy } = require('aliyun-serverless-koa')
const Koa = require('koa')

app.use(async ctx => {
  ctx.body = 'Hello, World!'
})

const server = createServer(app.callback())
module.exports.handler = (event, context, callback) => proxy(server, event, context, callback)
```

## Example

[example](examples/starter)