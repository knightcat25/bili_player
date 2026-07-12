import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getHistory } from '../api/user'
import { proxyMedia } from '../utils/request'
import styles from './Home.module.css'

export function HistoryPage() {
  const { isLoggedIn, user } = useAuthStore()
  const [videos, setVideos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoggedIn || !user) { setError('请先登录'); setLoading(false); return }
    getHistory(1)
      .then((res: any) => {
        if (res.code !== 0) throw new Error(res.message)
        setVideos(res.data?.list || [])
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [isLoggedIn, user])

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>🕐 播放历史</h2>
      {error && <p style={{ color: '#e74c3c', textAlign: 'center', padding: 32 }}>{error}</p>}
      {loading && <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.card}><div className={`skeleton ${styles.thumb}`} /><div className={styles.cardInfo}><div className="skeleton" style={{ height: 20, marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div></div>
      ))}</div>}
      {!loading && !error && (
        <div className={styles.grid}>
          {videos.map(item => {
            const title = item.title || '无标题'
            const cover = item.cover || ''
            const bvid = item.bvid || item.history?.bvid || ''
            const author = item.author_name || item.owner?.name || ''
            const dur = item.duration || 0
            const prog = item.progress || 0
            return (
              <Link key={bvid || Math.random()} to={`/video/${bvid}`} className={styles.card}>
                <div className={styles.thumbWrap}>
                  <img src={proxyMedia(cover)} alt={title} className={styles.thumb} loading="lazy" />
                  <span className={styles.duration}>{fmtDuration(dur)}</span>
                  {prog > 0 && dur > 0 && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.3)' }}>
                      <div style={{ height: '100%', background: '#fb7299', width: `${Math.min(100, (prog / dur) * 100)}%` }} />
                    </div>
                  )}
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{title}</h3>
                  <span className={styles.cardAuthor}>{author}</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
      {!loading && !error && videos.length === 0 && <p style={{ textAlign: 'center', padding: 32, color: '#999' }}>暂无播放历史</p>}
    </div>
  )
}

function fmtDuration(s: number) { if (!s) return '--:--'; const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}` }
