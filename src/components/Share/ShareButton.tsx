import { useState, useCallback } from 'react'
import styles from './ShareButton.module.css'

interface Props {
  bvid: string
  title?: string
}

export function ShareButton({ bvid, title = '分享视频' }: Props) {
  const [copied, setCopied] = useState(false)

  const shareUrl = `https://www.bilibili.com/video/${bvid}`

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback for older browsers
      const input = document.createElement('input')
      input.value = shareUrl
      document.body.appendChild(input)
      input.select()
      document.execCommand('copy')
      document.body.removeChild(input)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }, [shareUrl])

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        })
      } catch {
        // user cancelled
      }
    } else {
      handleCopy()
    }
  }, [shareUrl, title, handleCopy])

  return (
    <div className={styles.container}>
      <button className={styles.shareBtn} onClick={handleShare}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="M8.59 13.51l6.83 3.98" />
          <path d="M15.41 6.51l-6.82 3.98" />
        </svg>
        <span>分享</span>
      </button>

      <button className={styles.copyBtn} onClick={handleCopy}>
        {copied ? '✓ 已复制' : '复制链接'}
      </button>

      {copied && <span className={styles.copiedToast}>链接已复制!</span>}
    </div>
  )
}
