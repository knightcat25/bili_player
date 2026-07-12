// B站 API 类型定义

export interface BiliResponse<T = any> {
  code: number
  message: string
  data: T
  ttl?: number
}

// 登录
export interface QRCodeData {
  url: string
  qrcode_key: string
}

export interface QRCodePollData {
  code: number // 86101=等待扫码, 86090=已扫码待确认, 0=确认成功, 86038=过期
  message: string
  refresh_token?: string
  url?: string
  timestamp?: number
}

export interface UserInfo {
  mid: number
  uname: string
  face: string
  level: number
  isVip: boolean
  vipStatus: number
}

// 搜索
export interface SearchResult {
  seid: string
  page: number
  pagesize: number
  numResults: number
  numPages: number
  result: SearchResultItem[]
}

export interface SearchResultItem {
  type: string
  id: number
  bvid: string
  title: string
  author: string
  mid: number
  pic: string
  description: string
  play: number
  video_review: number
  duration: string
  pubdate: number
  tag: string
  arcurl: string
}

// 视频信息
export interface VideoInfo {
  bvid: string
  aid: number
  cid: number
  title: string
  desc: string
  pic: string
  owner: { mid: number; name: string; face: string }
  stat: {
    view: number
    danmaku: number
    reply: number
    favorite: number
    coin: number
    share: number
    like: number
  }
  duration: number
  pages: { cid: number; page: number; part: string; duration: number }[]
  subtitle?: { allow_submit: boolean; list: any[] }
  honor_reply?: any
}

// 视频播放地址
export interface VideoPlayUrl {
  from: string
  result: string
  message: string
  quality: number
  format: string
  timelength: number
  accept_format: string
  accept_description: string[]
  accept_quality: number[]
  video_codecid: number
  dash?: DashData
  durl?: DurlItem[]
}

export interface DashData {
  duration: number
  minBufferTime: number
  video: DashStream[]
  audio: DashStream[]
}

export interface DashStream {
  id: number
  baseUrl: string
  backupUrl: string[]
  bandwidth: number
  mimeType: string
  codecs: string
  width?: number
  height?: number
  frameRate?: string
  sar?: string
  startWithSap?: number
  segmentBase: any
  codecid: number
}

export interface DurlItem {
  url: string
  backup_url: string[]
  length: number
  size: number
  order: number
}

// 弹幕 (protobuf 简化)
export interface DanmakuSegment {
  dms: DanmakuItem[]
}

export interface DanmakuItem {
  mode: number // 1=滚动, 4=底部, 5=顶部
  fontsize: number
  color: number
  midHash: string
  content: string
  ctime: number
  weight: number
  id: number
  progress: number // 视频时间(ms)
  pool: number // 0=普通, 1=字幕
}

// 评论
export interface ReplyData {
  page: { acount: number; count: number; num: number; size: number }
  replies: Reply[]
  top?: any
  upper?: { top: any }
}

export interface Reply {
  rpid: number
  mid: number
  member: { mid: string; uname: string; avatar: string; level_info: any }
  content: { message: string; jump_url?: Record<string, any> }
  ctime: number
  like: number
  rcount: number
  replies?: Reply[]
}

// 直播
export interface LiveRoomInfo {
  room_id: number
  short_id: number
  uid: number
  live_status: number // 0=未开播, 1=直播中, 2=轮播
  title: string
  cover: string
  online: number
  area_name: string
  tags: string
  parent_area_name: string
  live_time: string
  description: string
  keyframe: string
  user_cover: string
}

export interface LivePlayUrl {
  room_id: number
  short_id: number
  uid: number
  live_status: number
  live_time: number
  covers: string[]
  play_url?: {
    durl: { url: string; length: number; order: number; stream_type: number }[]
  }
}
