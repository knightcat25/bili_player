// B站 API — 通过服务器代理转发
const API_BASE = '/api/bilibili'
const PASSPORT_BASE = '/api/passport'
const LIVE_BASE = '/api/live'

// 图片/视频走 CDN 代理（B站 CDN 需要 bilibili.com Referer）
export function proxyMedia(url: string): string {
  if (!url) return url
  let full = url
  if (full.startsWith('//')) full = 'https:' + full
  if (!full.startsWith('http')) full = 'https://' + full
  if (/hdslb|bilivideo|biliapi|acgvideo|b23\.tv/.test(full)) {
    return `/api/cdn?url=${encodeURIComponent(full)}`
  }
  return full
}

export async function biliFetch<T = any>(
  path: string, options: RequestInit = {}, base = API_BASE,
): Promise<T> {
  const url = `${base}${path}`
  const res = await fetch(url, {
    ...options,
    headers: { Accept: 'application/json', ...(options.headers || {}) },
    credentials: 'include', referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const ct = res.headers.get('content-type') || ''
  if (ct.includes('text/html')) {
    const text = await res.text()
    if (text.includes('jstcache') || text.includes('拒绝') || text.includes('未发送')) throw new Error('BLOCKED')
    throw new Error('非JSON响应')
  }
  return res.json()
}

export async function passportFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> { return biliFetch<T>(path, options, PASSPORT_BASE) }
export async function liveFetch<T = any>(path: string, options: RequestInit = {}): Promise<T> { return biliFetch<T>(path, options, LIVE_BASE) }
