// B站 API — 通过服务器代理转发
const API_BASE = '/api/bilibili'
const PASSPORT_BASE = '/api/passport'
const LIVE_BASE = '/api/live'

// 图片 URL 补全协议即可（公网部署直连 B站 CDN）
export function proxyMedia(url: string): string {
  if (!url) return url
  if (url.startsWith('//')) return 'https:' + url
  if (!url.startsWith('http') && !url.startsWith('//')) return 'https://' + url
  return url
}

export async function biliFetch<T = any>(
  path: string,
  options: RequestInit = {},
  base = API_BASE,
): Promise<T> {
  const url = `${base}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    referrerPolicy: 'no-referrer',
  })

  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/html')) {
    const text = await res.text()
    if (text.includes('jstcache') || text.includes('拒绝') || text.includes('未发送')) {
      throw new Error('BLOCKED')
    }
    throw new Error('非JSON响应')
  }

  return res.json()
}

export async function passportFetch<T = any>(
  path: string, options: RequestInit = {},
): Promise<T> { return biliFetch<T>(path, options, PASSPORT_BASE) }

export async function liveFetch<T = any>(
  path: string, options: RequestInit = {},
): Promise<T> { return biliFetch<T>(path, options, LIVE_BASE) }
