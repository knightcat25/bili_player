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

// CDN 代理 — http-proxy-middleware 路由模式，原生支持 Range
app.use('/api/cdn', createProxyMiddleware({
  router(req) {
    const raw = new URL(req.url, 'http://localhost').searchParams.get('url')
    if (!raw) return undefined
    let url = raw.startsWith('//') ? 'https:' + raw : raw
    if (!url.startsWith('http')) url = 'https://' + url
    return new URL(url).origin
  },
  changeOrigin: true,
  secure: false,
  on: {
    proxyReq(pr, req) {
      const raw = new URL(req.url, 'http://localhost').searchParams.get('url')
      if (!raw) return
      let url = raw.startsWith('//') ? 'https:' + raw : raw
      if (!url.startsWith('http')) url = 'https://' + url
      const u = new URL(url)
      pr.path = u.pathname + u.search
      pr.setHeader('Referer', 'https://www.bilibili.com/')
      pr.setHeader('Origin', 'https://www.bilibili.com')
      pr.setHeader('User-Agent', 'Mozilla/5.0')
    },
  },
}))

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 BiliPlay http://localhost:${PORT}`))
