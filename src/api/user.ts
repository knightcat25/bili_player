// 用户个人 API：收藏、历史记录
import { biliFetch } from '../utils/request'

// 收藏夹列表
export async function getFavoriteFolders(upMid: number) {
  return biliFetch(`/x/v3/fav/folder/created/list-all?up_mid=${upMid}&type=2`)
}

// 收藏夹中的视频
export async function getFavorites(mediaId: number, page = 1) {
  return biliFetch(`/x/v3/fav/resource/list?media_id=${mediaId}&pn=${page}&ps=20`)
}

// 播放历史
export async function getHistory(page = 1) {
  return biliFetch(`/x/web-interface/history/cursor?type=archive&ps=20&pn=${page}`)
}

// 关注列表
export async function getFollowings(mid: number, page = 1) {
  return biliFetch(`/x/relation/followings?vmid=${mid}&pn=${page}&ps=20`)
}
