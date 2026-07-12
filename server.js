// BiliPlay 服务器 — 一体化部署（静态前端 + API代理 + CDN代理）
import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

// === Cookie 改写 ===
function rewriteCookies(proxyRes) {
  const cookies = proxyRes.headers['set-cookie']
  if (!cookies) return
  const list = Array.isArray(cookies) ? cookies : [cookies]
  proxyRes.headers['set-cookie'] = list.map(c =>
    c.replace(/Domain=\.?bilibili\.com/gi, '')
     .replace(/;\s*Secure/gi, '')
     .replace(/;\s*HttpOnly/gi, '')
     .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
     .replace(/;\s*Path=\S+/gi, '; Path=/')
  )
}

// === API 代理 ===
const apiProxy = (target, referer) => createProxyMiddleware({
  target, changeOrigin: true, secure: false,
  on: {
    proxyReq(proxyReq) {
      proxyReq.setHeader('Referer', referer)
      proxyReq.setHeader('Origin', referer.replace(/\/$/, ''))
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36')
      proxyReq.setHeader('Accept-Language', 'zh-CN,zh;q=0.9')
    },
    proxyRes: rewriteCookies,
  },
})

app.use('/api/bilibili', apiProxy('https://api.bilibili.com', 'https://www.bilibili.com/'))
app.use('/api/passport', apiProxy('https://passport.bilibili.com', 'https://www.bilibili.com/'))
app.use('/api/live', apiProxy('https://api.live.bilibili.com', 'https://live.bilibili.com/'))

// === CDN 代理（视频/图片） ===
app.get('/api/cdn', async (req, res) => {
  try {
    let url = req.query.url
    if (!url) return res.status(400).end('missing url')
    if (url.startsWith('//')) url = 'https:' + url
    if (!url.startsWith('http')) url = 'https://' + url

    const headers = {
      Referer: 'https://www.bilibili.com/', Origin: 'https://www.bilibili.com',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    }
    if (req.headers.range) headers['Range'] = req.headers.range

    const f = await fetch(url, { headers })
    if (!f.ok && f.status !== 206) return res.status(f.status).end()

    const ct = f.headers.get('content-type')
    if (ct) res.set('Content-Type', ct)
    if (f.headers.get('content-length')) res.set('Content-Length', f.headers.get('content-length'))
    if (f.headers.get('content-range')) res.set('Content-Range', f.headers.get('content-range'))
    res.set('Accept-Ranges', 'bytes')
    res.status(f.status)

    if (f.body) {
      const reader = f.body.getReader()
      for (;;) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    }
    res.end()
  } catch (e) {
    if (!res.headersSent) res.status(502).end(e.message)
  }
})

// === 静态前端（必须放最后） ===
app.use(express.static(path.join(__dirname, 'dist')))
// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, () => {
  console.log(`🚀 BiliPlay 运行在 http://localhost:${PORT}`)
})
