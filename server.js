const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const path = require('path')

const dev = false
const hostname = 'localhost'
const port = process.env.PORT || 3120

const app = next({
  dev,
  hostname,
  port,
  dir: path.join(__dirname)
})
const handle = app.getRequestHandler()

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('Internal Server Error')
    }
  }).listen(port, (err) => {
    if (err) throw err
    console.log(`> Ready on http://${hostname}:${port}`)
  })
}).catch((ex) => {
  console.error('Fatal error during app preparation:')
  console.error(ex.stack)
  process.exit(1)
})
