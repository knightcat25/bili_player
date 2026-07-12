import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { createProxyMiddleware } from 'http-proxy-middleware'
import httpProxy from 'http-proxy'

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

// CDN 代理 — 用 http-proxy 原生支持 Range 请求
const cdnProxy = httpProxy.createProxyServer({ changeOrigin: true, secure: false })
cdnProxy.on('proxyReq', (pr) => {
  pr.setHeader('Referer', 'https://www.bilibili.com/')
  pr.setHeader('Origin', 'https://www.bilibili.com')
  pr.setHeader('User-Agent', 'Mozilla/5.0')
})

app.get('/api/cdn', (req, res) => {
  let url = req.query.url
  if (!url) return res.status(400).end()
  if (url.startsWith('//')) url = 'https:' + url
  if (!url.startsWith('http')) url = 'https://' + url

  const { protocol, host, pathname, search } = new URL(url)
  req.url = pathname + search
  cdnProxy.web(req, res, { target: protocol + '//' + host, changeOrigin: true })
})

app.use(express.static(path.join(__dirname, 'dist')))
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'dist', 'index.html')))

app.listen(PORT, () => console.log(`🚀 BiliPlay http://localhost:${PORT}`))
