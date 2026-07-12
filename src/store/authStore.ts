// 认证状态管理
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserInfo } from '../api/types'
import * as authApi from '../api/auth'

interface AuthState {
  isLoggedIn: boolean
  user: UserInfo | null
  qrcodeKey: string | null
  qrcodeUrl: string | null
  qrStatus: 'idle' | 'waiting' | 'scanned' | 'expired' | 'success' | 'error'
  qrMessage: string

  generateQR: () => Promise<void>
  startPolling: () => Promise<void>
  stopPolling: () => void
  checkLoginStatus: () => Promise<void>
  logout: () => void
  _pollTimer: ReturnType<typeof setInterval> | null
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isLoggedIn: false,
      user: null,
      qrcodeKey: null,
      qrcodeUrl: null,
      qrStatus: 'idle',
      qrMessage: '',
      _pollTimer: null,

      generateQR: async () => {
        try {
          const res = await authApi.generateQRCode()
          if (res.code === 0) {
            set({
              qrcodeUrl: res.data.url,
              qrcodeKey: res.data.qrcode_key,
              qrStatus: 'waiting',
              qrMessage: '请用B站客户端扫码',
            })
          } else {
            set({
              qrStatus: 'error',
              qrMessage: res.message || '生成二维码失败',
            })
          }
        } catch (err: any) {
          set({
            qrStatus: 'error',
            qrMessage: err.message || '网络错误',
          })
        }
      },

      startPolling: async () => {
        const { qrcodeKey, _pollTimer } = get()
        if (!qrcodeKey) return
        if (_pollTimer) clearInterval(_pollTimer)

        const poll = async () => {
          const { qrcodeKey: key, qrStatus } = get()
          if (!key || qrStatus === 'success' || qrStatus === 'error') return

          try {
            const res = await authApi.pollQRCode(key)
            if (res.code !== 0) return

            const code = res.data.code
            if (code === 0) {
              // 扫码成功，等 cookie 写入后再获取用户信息
              set({ qrStatus: 'success', qrMessage: '登录成功' })
              const oldTimer = get()._pollTimer
              if (oldTimer) clearInterval(oldTimer)
              // 延迟确保 cookie 已写入
              await new Promise((r) => setTimeout(r, 800))
              await get().checkLoginStatus()
            } else if (code === 86090) {
              set({ qrStatus: 'scanned', qrMessage: '已扫码，请在手机上确认' })
            } else if (code === 86038) {
              set({ qrStatus: 'expired', qrMessage: '二维码已过期，请重新生成' })
              const oldTimer = get()._pollTimer
              if (oldTimer) clearInterval(oldTimer)
            }
            // 86101: 等待扫码，不更新状态
          } catch {
            // 轮询失败继续
          }
        }

        // 立即执行一次
        await poll()

        const timer = setInterval(poll, 2000)
        set({ _pollTimer: timer })
      },

      stopPolling: () => {
        const timer = get()._pollTimer
        if (timer) {
          clearInterval(timer)
          set({ _pollTimer: null })
        }
      },

      checkLoginStatus: async () => {
        try {
          const res = await authApi.getLoginUserInfo()
          console.log('[auth] checkLoginStatus 返回:', res.code, (res.data as any)?.isLogin)
          if (res.code === 0 && (res.data as any).isLogin === true) {
            console.log('[auth] 登录成功!', (res.data as any).uname)
            set({
              isLoggedIn: true,
              user: res.data,
            })
          } else {
            console.log('[auth] 未登录, code:', res.code, 'isLogin:', (res.data as any)?.isLogin)
            set({ isLoggedIn: false, user: null })
          }
        } catch (err) {
          console.error('[auth] checkLoginStatus 异常:', err)
          set({ isLoggedIn: false, user: null })
        }
      },

      logout: () => {
        set({
          isLoggedIn: false,
          user: null,
          qrcodeKey: null,
          qrcodeUrl: null,
          qrStatus: 'idle',
          qrMessage: '',
        })
      },
    }),
    {
      name: 'bili-auth',
      partialize: (state) => ({
        isLoggedIn: state.isLoggedIn,
        user: state.user,
      }),
      // 防止 localStorage 不可用时崩溃
      skipHydration: typeof window === 'undefined',
    },
  ),
)
