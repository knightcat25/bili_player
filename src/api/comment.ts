// B站评论 API
import { biliFetch } from '../utils/request'
import type { BiliResponse, ReplyData } from './types'

// 获取评论
export async function getReplies(
  oid: number,
  type = 1, // 1=视频, 12=专栏, 17=动态
  page = 1,
  sort = 2, // 0=按时间, 2=按热度
): Promise<BiliResponse<ReplyData>> {
  return biliFetch(
    `/x/v2/reply?type=${type}&oid=${oid}&pn=${page}&sort=${sort}`,
  )
}

// 获取评论的子回复
export async function getReplyChildren(
  oid: number,
  rootId: number,
  type = 1,
  page = 1,
): Promise<BiliResponse<ReplyData>> {
  return biliFetch(
    `/x/v2/reply/reply?type=${type}&oid=${oid}&root=${rootId}&pn=${page}`,
  )
}

// 发送评论
export async function sendReply(
  oid: number,
  message: string,
  type = 1,
  parentId?: number,
): Promise<BiliResponse> {
  const form = new URLSearchParams({
    oid: String(oid),
    type: String(type),
    message,
    plat: '1',
  })
  if (parentId) form.set('parent', String(parentId))

  return biliFetch('/x/v2/reply/add', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}

// 点赞评论
export async function likeReply(
  oid: number,
  rpid: number,
  type = 1,
  action = 1, // 1=点赞, 0=取消
): Promise<BiliResponse> {
  const form = new URLSearchParams({
    oid: String(oid),
    type: String(type),
    rpid: String(rpid),
    action: String(action),
  })
  return biliFetch('/x/v2/reply/action', {
    method: 'POST',
    body: form,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
}
