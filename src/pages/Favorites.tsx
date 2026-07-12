import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import { getFavoriteFolders, getFavorites } from '../api/user'
import { proxyMedia } from '../utils/request'
import styles from './Home.module.css'

interface Folder { id: number; title: string; media_count: number }
interface Video { bvid: string; title: string; cover: string; upper?: { name: string }; duration: number }

export function FavoritesPage() {
  const { isLoggedIn, user } = useAuthStore()
  const [folders, setFolders] = useState<Folder[]>([])
  const [videos, setVideos] = useState<Video[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)
  const [page, setPage] = useState(1)

  // 加载收藏夹列表
  useEffect(() => {
    if (!isLoggedIn || !user) { setError('请先登录'); setLoading(false); return }
    getFavoriteFolders(user.mid)
      .then((res: any) => {
        if (res.code !== 0) throw new Error(res.message)
        const list = (res.data?.list || []).map((f: any) => ({ id: f.id, title: f.title, media_count: f.media_count }))
        setFolders(list)
        if (list.length > 0) setSelectedFolder(list[0])
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [isLoggedIn, user])

  // 加载选中收藏夹的视频
  useEffect(() => {
    if (!selectedFolder) return
    setLoading(true)
    getFavorites(selectedFolder.id, 1)
      .then((res: any) => {
        if (res.code !== 0) throw new Error(res.message)
        setVideos((res.data?.medias || []).map((m: any) => ({
          bvid: m.bvid, title: m.title, cover: m.cover, upper: m.upper, duration: m.duration,
        })))
        setPage(1)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [selectedFolder])

  const loadMore = () => {
    if (!selectedFolder) return
    const next = page + 1
    getFavorites(selectedFolder.id, next)
      .then((res: any) => {
        if (res.code !== 0) return
        const newV = (res.data?.medias || []).map((m: any) => ({
          bvid: m.bvid, title: m.title, cover: m.cover, upper: m.upper, duration: m.duration,
        }))
        setVideos(p => [...p, ...newV])
        setPage(next)
      })
  }

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 16 }}>⭐ 我的收藏</h2>
      {error && <p style={{ color: '#e74c3c', textAlign: 'center', padding: 32 }}>{error}</p>}

      {/* 收藏夹列表 */}
      {folders.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          {folders.map(f => (
            <button key={f.id} onClick={() => setSelectedFolder(f)}
              style={{ padding: '6px 14px', borderRadius: 6, fontSize: 13, border: '1px solid', cursor: 'pointer',
                background: selectedFolder?.id === f.id ? '#fb7299' : '#f1f2f3',
                color: selectedFolder?.id === f.id ? 'white' : '#18191c',
                borderColor: selectedFolder?.id === f.id ? '#fb7299' : '#e3e5e7' }}>
              {f.title} ({f.media_count})
            </button>
          ))}
        </div>
      )}

      {loading && <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.card}><div className={`skeleton ${styles.thumb}`} /><div className={styles.cardInfo}><div className="skeleton" style={{ height: 20, marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div></div>
      ))}</div>}

      {!loading && (
        <div className={styles.grid}>
          {videos.map(v => (
            <Link key={v.bvid} to={`/video/${v.bvid}`} className={styles.card}>
              <div className={styles.thumbWrap}>
                <img src={proxyMedia(v.cover)} alt={v.title} className={styles.thumb} loading="lazy" />
                <span className={styles.duration}>{fmtDur(v.duration)}</span>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{v.title}</h3>
                <span className={styles.cardAuthor}>{v.upper?.name || ''}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {videos.length >= 20 && (
        <button onClick={loadMore} style={{ display: 'block', margin: '24px auto', padding: '10px 48px', background: '#fb7299', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14 }}>加载更多</button>
      )}
    </div>
  )
}

function fmtDur(s: number) { if (!s) return '--:--'; const m = Math.floor(s / 60); return `${m}:${(s % 60).toString().padStart(2, '0')}` }
