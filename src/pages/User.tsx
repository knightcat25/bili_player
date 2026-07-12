import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { biliFetch } from '../utils/request'
import { proxyMedia } from '../utils/request'
import styles from './Home.module.css'

interface VideoItem {
  bvid: string; title: string; pic: string; duration: string
  play: number; video_review: number
}

export function UserPage() {
  const { mid } = useParams<{ mid: string }>()
  const [videos, setVideos] = useState<VideoItem[]>([])
  const [userInfo, setUserInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (!mid) return
    setLoading(true)

    // 获取UP主信息
    Promise.all([
      biliFetch(`/x/space/acc/info?mid=${mid}`),
      biliFetch(`/x/space/arc/search?mid=${mid}&ps=20&pn=1`),
    ])
      .then(([infoRes, videoRes]: any[]) => {
        if (infoRes.code === 0) setUserInfo(infoRes.data)
        if (videoRes.code === 0) {
          setVideos((videoRes.data?.list?.vlist || []).map((v: any) => ({
            bvid: v.bvid, title: v.title, pic: v.pic,
            duration: v.length, play: v.play, video_review: v.video_review,
          })))
        }
      })
      .finally(() => setLoading(false))
  }, [mid])

  const loadMore = () => {
    const next = page + 1
    biliFetch(`/x/space/arc/search?mid=${mid}&ps=20&pn=${next}`)
      .then((res: any) => {
        if (res.code === 0) {
          const newVideos = (res.data?.list?.vlist || []).map((v: any) => ({
            bvid: v.bvid, title: v.title, pic: v.pic,
            duration: v.length, play: v.play, video_review: v.video_review,
          }))
          setVideos(p => [...p, ...newVideos])
          setPage(next)
        }
      })
  }

  if (loading) return <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => (
    <div key={i} className={styles.card}><div className={`skeleton ${styles.thumb}`} /><div className={styles.cardInfo}><div className="skeleton" style={{ height: 20, marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div></div>
  ))}</div>

  return (
    <div>
      {userInfo && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <img src={proxyMedia(userInfo.face)} alt="" style={{ width: 64, height: 64, borderRadius: '50%' }} />
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 600 }}>{userInfo.name}</h2>
            <p style={{ fontSize: 13, color: '#9499a0' }}>
              粉丝 {fmt(userInfo.follower)} · 视频 {fmt(videos.length)}
            </p>
          </div>
        </div>
      )}
      <div className={styles.grid}>
        {videos.map(v => (
          <Link key={v.bvid} to={`/video/${v.bvid}`} className={styles.card}>
            <div className={styles.thumbWrap}>
              <img src={proxyMedia(v.pic)} alt={v.title} className={styles.thumb} loading="lazy" />
              <span className={styles.duration}>{fmtDuration(v.duration)}</span>
            </div>
            <div className={styles.cardInfo}>
              <h3 className={styles.cardTitle}>{v.title}</h3>
              <span className={styles.cardAuthor}>▶ {fmt(v.play)} · 💬 {v.video_review}</span>
            </div>
          </Link>
        ))}
      </div>
      {videos.length >= 20 && (
        <button style={{ display: 'block', margin: '24px auto', padding: '10px 48px', background: '#fb7299', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }} onClick={loadMore}>加载更多</button>
      )}
    </div>
  )
}

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }
function fmtDuration(s: string | number) { const n = typeof s === 'string' ? parseInt(s) : s; if (!n) return '--:--'; const m = Math.floor(n / 60); return `${m}:${(n % 60).toString().padStart(2, '0')}` }
