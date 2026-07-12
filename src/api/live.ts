// B站直播 API
import { liveFetch, biliFetch } from '../utils/request'
import type { BiliResponse, LiveRoomInfo, LivePlayUrl } from './types'

// 获取直播间信息
export async function getLiveRoomInfo(
  roomId: number,
): Promise<BiliResponse<LiveRoomInfo>> {
  return liveFetch(`/room/v1/Room/room_init?id=${roomId}`)
}

// 获取直播流地址
export async function getLivePlayUrl(
  roomId: number,
): Promise<BiliResponse<LivePlayUrl>> {
  return liveFetch(
    `/xlive/web-room/v2/index/getRoomPlayInfo?room_id=${roomId}&protocol=0,1&format=0,1,2&codec=0,1&platform=web`,
  )
}

// 获取直播间弹幕信息（token等）
export async function getLiveDanmakuInfo(
  roomId: number,
): Promise<BiliResponse<{ token: string; host_list: any[] }>> {
  return liveFetch(`/xlive/web-room/v1/index/getDanmuInfo?id=${roomId}&type=0`)
}

// 搜索直播
export async function searchLive(
  keyword: string,
  page = 1,
): Promise<BiliResponse<any>> {
  return biliFetch(
    `/x/web-interface/search/type?keyword=${keyword}&search_type=live&page=${page}`,
  )
}
