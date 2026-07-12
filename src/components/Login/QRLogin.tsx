import { useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuthStore } from '../../store/authStore'
import styles from './QRLogin.module.css'

interface Props {
  onSuccess: () => void
  onClose: () => void
}

export function QRLogin({ onSuccess, onClose }: Props) {
  const {
    qrcodeUrl,
    qrcodeKey,
    qrStatus,
    qrMessage,
    generateQR,
    startPolling,
    stopPolling,
    isLoggedIn,
  } = useAuthStore()

  useEffect(() => {
    generateQR()
    return () => stopPolling()
  }, [])

  useEffect(() => {
    if (qrcodeKey) {
      startPolling()
    }
  }, [qrcodeKey])

  useEffect(() => {
    if (isLoggedIn) {
      onSuccess()
    }
  }, [isLoggedIn])

  const statusText: Record<string, string> = {
    waiting: '请使用B站客户端扫描二维码',
    scanned: '已扫码，请在手机上确认登录',
    expired: '二维码已过期',
    success: '登录成功！',
    error: qrMessage || '登录失败',
  }

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>扫码登录</h3>

      <div className={styles.qrWrap}>
        {qrcodeUrl ? (
          <QRCodeSVG
            value={qrcodeUrl}
            size={180}
            level="M"
            includeMargin
          />
        ) : (
          <div className={styles.qrPlaceholder}>加载中...</div>
        )}

        {qrStatus === 'expired' && (
          <div className={styles.qrMask}>
            <p>二维码已过期</p>
            <button className="btn-primary" onClick={generateQR}>
              刷新
            </button>
          </div>
        )}

        {qrStatus === 'success' && (
          <div className={styles.qrSuccess}>
            <span className={styles.checkIcon}>✓</span>
            <p>登录成功</p>
          </div>
        )}
      </div>

      <p className={styles.statusText}>
        {statusText[qrStatus] || qrMessage}
      </p>

      {qrStatus === 'scanned' && (
        <div className={styles.spinner} />
      )}

      <button className={styles.closeBtn} onClick={onClose}>
        关闭
      </button>
    </div>
  )
}
