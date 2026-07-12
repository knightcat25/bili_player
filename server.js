import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import http from 'http'
import https from 'https'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

function rewriteCookies(proxyRes) {
  const c = proxyRes.headers['set-cookie']
  if (!c) return
  const list = Array.isArray(c) ? c : [c]
  proxyRes.headers['set-cookie'] = list.map(s =>
    s.replace(/Domain=\.?bilibili\.com/gi, '')
     .replace(/;\s*Secure/gi, '')
     .replace(/;\s*HttpOnly/gi, '')
     .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
     .replace(/;\s*Path=\S+/gi, '; Path=/')
  )
}

const apiProxy = (t, r) => createProxyMiddleware({
  target: t, changeOrigin: true, secure: false,
  on: {
    proxyReq(pr) {
      pr.setHeader('Referer', r)
      pr.setHeader('Origin', r.replace(/\/$/, ''))
      pr.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
      pr.setHeader('Accept-Language', 'zh-CN,zh;q=0.9')
    },
    proxyRes: rewriteCookies,
  },
})

app.use('/api/bilibili', apiProxy('https://api.bilibili.com', 'https://www.bilibili.com/'))
app.use('/api/passport', apiProxy('https://passport.bilibili.com', 'https://www.bilibili.com/'))
app.use('/api/live', apiProxy('https://api.live.bilibili.com', 'https://live.bilibili.com/'))

app.get('/api/cdn', async (req, res) => {
  try {
    let url = req.query.url
    if (!url) return res.status(400).end()
    if (url.startsWith('//')) url = 'https:' + url
    if (!url.startsWith('http')) url = 'https://' + url

    const { protocol, hostname, pathname, search } = new URL(url)
    const mod = protocol === 'https:' ? https : http

    const opts = {
      hostname,
      path: pathname + search,
      method: 'GET',
      headers: {
        Referer: 'https://www.bilibili.com/',
        Origin: 'https://www.bilibili.com',
        'User-Agent': 'Mozilla/5.0',
      },
      timeout: 10000,
    }
    if (req.headers.range) opts.headers.Range = req.headers.range

    const proxyReq = mod.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
      proxyRes.pipe(res)
    })
    proxyReq.on('timeout', () => { proxyReq.destroy(); res.status(504).end() })
    proxyReq.on('error', () => { if (!res.headersSent) res.status(502).end() })
    proxyReq.end()
  } catch {
    if (!res.headersSent) res.status(502).end()
  }
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 BiliPlay http://localhost:${PORT}`))
