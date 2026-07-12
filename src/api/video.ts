// B站视频相关 API
import { biliFetch } from '../utils/request'
import type {
  BiliResponse,
  SearchResult,
  VideoInfo,
  VideoPlayUrl,
  DanmakuItem,
} from './types'

// 搜索
export async function searchVideos(
  keyword: string,
  page = 1,
): Promise<BiliResponse<SearchResult>> {
  const params = new URLSearchParams({
    keyword,
    page: String(page),
    search_type: 'video',
    order: 'totalrank',
  })
  return biliFetch(`/x/web-interface/search/all/v2?${params}`)
}

// 获取视频信息
export async function getVideoInfo(bvid: string): Promise<BiliResponse<VideoInfo>> {
  return biliFetch(`/x/web-interface/view?bvid=${bvid}`)
}

// 获取视频播放地址
export async function getVideoPlayUrl(
  bvid: string,
  cid: number,
  quality = 64, // 720p — 10Mbps 服务器
): Promise<BiliResponse<VideoPlayUrl>> {
  const params = new URLSearchParams({
    bvid,
    cid: String(cid),
    qn: String(quality),
    fnval: '1', // FLV 格式（音视频合一，适合 flv.js 播放）
    fnver: '0',
    fourk: '1',
  })
  return biliFetch(`/x/player/playurl?${params}`)
}

// 获取弹幕 (XML 接口 — 简单可靠)
export async function fetchDanmakuXml(oid: number): Promise<DanmakuItem[]> {
  const url = `/api/bilibili/x/v1/dm/list.so?oid=${oid}`
  const res = await fetch(url, {
    credentials: 'include',
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error(`Danmaku HTTP ${res.status}`)
  const text = await res.text()
  return parseDanmakuXml(text)
}

function parseDanmakuXml(xml: string): DanmakuItem[] {
  const items: DanmakuItem[] = []
  const re = /<d p="([^"]*)">([^<]*)<\/d>/g
  let m
  while ((m = re.exec(xml)) !== null) {
    const attrs = m[1].split(',')
    items.push({
      progress: parseFloat(attrs[0]) * 1000 || 0,
      mode: parseInt(attrs[1]) || 1,
      fontsize: parseInt(attrs[2]) || 25,
      color: parseInt(attrs[3]) || 0xFFFFFF,
      ctime: parseInt(attrs[4]) || 0,
      pool: parseInt(attrs[5]) || 0,
      midHash: attrs[6] || '',
      id: parseInt(attrs[7]) || 0,
      weight: parseInt(attrs[8]) || 1,
      content: m[2],
    })
  }
  return items
}

// 旧 protobuf 接口（保留备用）
export async function fetchDanmakuProto(
  oid: number,
  segmentIndex = 1,
): Promise<ArrayBuffer> {
  const params = new URLSearchParams({
    type: '1',
    oid: String(oid),
    segment_index: String(segmentIndex),
  })
  const url = `/api/bilibili/x/v2/dm/web/seg.so?${params}`
  const res = await fetch(url, {
    credentials: 'include',
    referrerPolicy: 'no-referrer',
  })
  if (!res.ok) throw new Error(`Danmaku HTTP ${res.status}`)
  return res.arrayBuffer()
}

// 解析 protobuf 弹幕
export function parseDanmakuProto(
  buffer: ArrayBuffer,
): DanmakuItem[] {
  const dataView = new DataView(buffer)
  const items: DanmakuItem[] = []
  let offset = 0

  while (offset < buffer.byteLength) {
    if (offset + 4 > buffer.byteLength) break

    const msgLen = dataView.getUint32(offset, false)
    offset += 4
    if (offset + msgLen > buffer.byteLength) break

    const msgData = new Uint8Array(buffer, offset, msgLen)
    offset += msgLen

    const danmaku = parseSingleDanmaku(msgData)
    if (danmaku) items.push(danmaku)
  }

  return items
}

// 解析单条弹幕
function parseSingleDanmaku(data: Uint8Array): DanmakuItem | null {
  try {
    let pos = 0

    // skip field 1 (id as string? usually)
    // Actually let me use a simpler approach - scan for known fields
    // B站弹幕 protobuf 结构:
    // 1: int64 id
    // 2: int32 progress (ms)
    // 3: int32 mode
    // 4: int32 fontsize
    // 5: int32 color
    // 6: string midHash
    // 7: string content
    // 8: int64 ctime
    // 9: int32 weight
    // 10: string action
    // 11: int32 pool

    const fields: Record<number, any> = {}

    while (pos < data.length) {
      const tag = readVarint(data, pos)
      if (tag === null) break
      pos = tag.nextPos

      const fieldNum = (tag.value >> 3) >>> 0
      const wireType = tag.value & 0x07

      if (wireType === 0) {
        // varint
        const v = readVarint(data, pos)
        if (v === null) break
        fields[fieldNum] = v.value
        pos = v.nextPos
      } else if (wireType === 2) {
        // length-delimited
        const len = readVarint(data, pos)
        if (len === null) break
        const strStart = len.nextPos
        const strEnd = strStart + len.value
        const bytes = data.slice(strStart, strEnd)
        fields[fieldNum] = new TextDecoder().decode(bytes)
        pos = strEnd
      } else if (wireType === 5) {
        // 32-bit
        if (pos + 4 > data.length) break
        const dv = new DataView(data.buffer, data.byteOffset + pos, 4)
        // little-endian for fixed32
        fields[fieldNum] = dv.getUint32(0, true)
        pos += 4
      } else {
        break // unknown type, stop
      }
    }

    if (fields[7] === undefined) return null // no content

    return {
      id: (fields[1] as number) || 0,
      progress: (fields[2] as number) || 0,
      mode: (fields[3] as number) || 1,
      fontsize: (fields[4] as number) || 25,
      color: (fields[5] as number) || 0xFFFFFF,
      midHash: (fields[6] as string) || '',
      content: fields[7] as string,
      ctime: (fields[8] as number) || 0,
      weight: (fields[9] as number) || 1,
      pool: (fields[11] as number) || 0,
    }
  } catch {
    return null
  }
}

// 读取 varint
function readVarint(
  data: Uint8Array,
  offset: number,
): { value: number; nextPos: number } | null {
  let value = 0
  let shift = 0
  let pos = offset

  while (pos < data.length) {
    const byte = data[pos]
    value |= (byte & 0x7f) << shift
    pos++
    if ((byte & 0x80) === 0) {
      return { value, nextPos: pos }
    }
    shift += 7
    if (shift >= 35) break
  }

  return null
}

// 点赞视频
export async function likeVideo(bvid: string, like = true): Promise<BiliResponse> {
  const form = new URLSearchParams({ bvid, type: '1', like: like ? '1' : '2' })
  return biliFetch('/x/web-interface/archive/like', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

// 收藏视频
export async function favoriteVideo(aid: number): Promise<BiliResponse> {
  const form = new URLSearchParams({ rid: String(aid), type: '2', add_media_ids: '' })
  return biliFetch('/x/v3/fav/resource/deal', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

// 三连
export async function tripleVideo(bvid: string): Promise<BiliResponse> {
  const form = new URLSearchParams({ bvid })
  return biliFetch('/x/web-interface/archive/like/triple', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
