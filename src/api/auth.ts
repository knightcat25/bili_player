// B站登录 API
import { passportFetch, biliFetch } from '../utils/request'
import type { BiliResponse, QRCodeData, QRCodePollData, UserInfo } from './types'

// 生成登录二维码
export async function generateQRCode(): Promise<BiliResponse<QRCodeData>> {
  return passportFetch('/x/passport-login/web/qrcode/generate')
}

// 轮询扫码状态
export async function pollQRCode(
  qrcodeKey: string,
): Promise<BiliResponse<QRCodePollData>> {
  return passportFetch(
    `/x/passport-login/web/qrcode/poll?qrcode_key=${qrcodeKey}`,
  )
}

// 获取当前登录用户信息（验证登录态）
export async function getLoginUserInfo(): Promise<BiliResponse<UserInfo>> {
  return biliFetch('/x/web-interface/nav')
}

// 检查登录状态
export async function checkLogin(): Promise<boolean> {
  try {
    const res = await getLoginUserInfo()
    return res.code === 0 && (res.data as any).isLogin !== false
  } catch {
    return false
  }
}
