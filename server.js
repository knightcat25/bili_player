import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.PORT || 3000

function rewriteCookies(proxyRes) {
  const c = proxyRes.headers['set-cookie']
  if (!c) return
  const list = Array.isArray(c) ? c : [c]
  proxyRes.headers['set-cookie'] = list.map(s =>
    s.replace(/Domain=\.?bilibili\.com/gi,'')
     .replace(/;\s*Secure/gi,'').replace(/;\s*HttpOnly/gi,'')
     .replace(/;\s*SameSite=\w+/gi,'; SameSite=Lax')
     .replace(/;\s*Path=\S+/gi,'; Path=/')
  )
}

const apiProxy = (t,r) => createProxyMiddleware({
  target:t, changeOrigin:true, secure:false,
  on:{ proxyReq(pr){ pr.setHeader('Referer',r); pr.setHeader('Origin',r.replace(/\/$/,'')); pr.setHeader('User-Agent','Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'); pr.setHeader('Accept-Language','zh-CN,zh;q=0.9') }, proxyRes:rewriteCookies }
})

app.use('/api/bilibili', apiProxy('https://api.bilibili.com','https://www.bilibili.com/'))
app.use('/api/passport', apiProxy('https://passport.bilibili.com','https://www.bilibili.com/'))
app.use('/api/live', apiProxy('https://api.live.bilibili.com','https://live.bilibili.com/'))

app.get('/api/cdn', async (req, res) => {
  let url = req.query.url
  if (!url) return res.status(400).end()
  if (url.startsWith('//')) url = 'https:' + url
  if (!url.startsWith('http')) url = 'https://' + url

  try {
    const ctrl = new AbortController()
    setTimeout(() => ctrl.abort(), 25000) // 25s 超时
    const f = await fetch(url, {
      headers: { Referer:'https://www.bilibili.com/', Origin:'https://www.bilibili.com', 'User-Agent':'Mozilla/5.0' },
      signal: ctrl.signal,
    })
    if (!f.ok && f.status !== 206) return res.redirect(url)
    if (f.body) {
      const ct = f.headers.get('content-type'); if (ct) res.set('Content-Type', ct)
      const cl = f.headers.get('content-length'); if (cl) res.set('Content-Length', cl)
      res.status(f.status)
      const reader = f.body.getReader()
      for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value) }
    }
    res.end()
  } catch {
    // 代理失败 → 重定向到原 URL（浏览器直连兜底）
    res.redirect(url)
  }
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 BiliPlay http://localhost:${PORT}`))
