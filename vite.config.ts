import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import type { IncomingMessage, ServerResponse } from 'http'

// Cookie 改写：去掉域名/Secure/HttpOnly，让浏览器能存
function rewriteCookies(proxyRes: any) {
  const cookies = proxyRes.headers['set-cookie']
  if (!cookies) return
  const list = Array.isArray(cookies) ? cookies : [cookies]
  proxyRes.headers['set-cookie'] = list.map((c: string) =>
    c.replace(/Domain=\.?bilibili\.com/gi, '')
     .replace(/;\s*Secure/gi, '')
     .replace(/;\s*HttpOnly/gi, '')
     .replace(/;\s*SameSite=\w+/gi, '; SameSite=Lax')
     .replace(/;\s*Path=\S+/gi, '; Path=/'),
  )
}

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'cdn-proxy',
      configureServer(server) {
        server.middlewares.use('/api/cdn', async (req: IncomingMessage, res: ServerResponse) => {
          try {
            let raw = new URL(req.url!, 'http://localhost').searchParams.get('url')
            if (!raw) { res.statusCode = 400; res.end('missing url'); return }
            if (raw.startsWith('//')) raw = 'https:' + raw
            if (!raw.startsWith('http')) raw = 'https://' + raw

            const reqHeaders: Record<string, string> = {
              Referer: 'https://www.bilibili.com/', Origin: 'https://www.bilibili.com',
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            }
            const range = req.headers['range']
            if (range) reqHeaders['Range'] = range

            const f = await fetch(raw, { headers: reqHeaders })
            if (!f.ok && f.status !== 206) { res.statusCode = f.status; res.end(); return }
            const ct = f.headers.get('content-type')
            if (ct) res.setHeader('Content-Type', ct)
            const cl = f.headers.get('content-length')
            if (cl) res.setHeader('Content-Length', cl)
            const cr = f.headers.get('content-range')
            if (cr) res.setHeader('Content-Range', cr)
            res.setHeader('Accept-Ranges', 'bytes')
            res.setHeader('Access-Control-Allow-Origin', '*')
            res.statusCode = f.status
            if (f.body) {
              const reader = f.body.getReader()
              for (;;) { const { done, value } = await reader.read(); if (done) break; res.write(value) }
            }
            res.end()
          } catch (e: any) { if (!res.headersSent) { res.statusCode = 502; res.end(e.message) } }
        })
      },
    },
  ],
  server: {
    proxy: {
      '/api/bilibili': {
        target: 'https://api.bilibili.com', changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api\/bilibili/, ''),
        headers: { Referer: 'https://www.bilibili.com/' },
        configure: (proxy: any) => { proxy.on('proxyRes', rewriteCookies) },
      },
      '/api/passport': {
        target: 'https://passport.bilibili.com', changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api\/passport/, ''),
        configure: (proxy: any) => { proxy.on('proxyRes', rewriteCookies) },
      },
      '/api/live': {
        target: 'https://api.live.bilibili.com', changeOrigin: true,
        rewrite: (p: string) => p.replace(/^\/api\/live/, ''),
        configure: (proxy: any) => { proxy.on('proxyRes', rewriteCookies) },
      },
    },
  },
})
