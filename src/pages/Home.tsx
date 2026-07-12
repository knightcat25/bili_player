import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/Search/SearchBar'
import { biliFetch, proxyMedia } from '../utils/request'
import styles from './Home.module.css'

interface PopularVideo { bvid: string; title: string; pic: string; owner: { name: string }; stat: { view: number; danmaku: number }; duration: string }

export function HomePage() {
  const [popular, setPopular] = useState<PopularVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)

  const fetchPage = (pn: number) => {
    return biliFetch(`/x/web-interface/popular?ps=20&pn=${pn}`)
      .then((res: any) => {
        if (res.code === 0) {
          setPopular(p => pn === 1 ? res.data?.list || [] : [...p, ...(res.data?.list || [])])
          setHasMore((res.data?.list || []).length >= 20)
          setPage(pn)
        } else { setApiError(`B站API返回错误 code=${res.code}`) }
      })
      .catch(err => { setApiError(`请求失败: ${err.message}`) })
      .finally(() => setLoading(false))
  }

  const loadMore = useCallback(() => {
    if (loading) return
    setLoading(true)
    fetchPage(page + 1)
  }, [page, loading])

  useEffect(() => { fetchPage(1) }, [])

  useEffect(() => {
    if (!hasMore) return
    const el = sentinelRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadMore() }, { rootMargin: '200px' })
    obs.observe(el)
    return () => obs.disconnect()
  }, [hasMore, loadMore])

  const refresh = () => { setLoading(true); setPage(1); fetchPage(1) }

  return (
    <div className={styles.container}>
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>BiliPlay</h1>
        <p className={styles.heroSub}>简易B站播放器 · 搜索你想看的内容</p>
        <div className={styles.heroSearch}>
          <SearchBar onSearch={(kw) => navigate(`/search?keyword=${encodeURIComponent(kw)}`)} placeholder="搜索视频..." />
        </div>
        <div className={styles.quickLinks}>
          <Link to="/live/1" className={styles.quickLink}>🔴 直播</Link>
          <Link to="/search?keyword=热门" className={styles.quickLink}>🔥 热门</Link>
        </div>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>🔥 热门视频 <button className={styles.refreshBtn} onClick={refresh} disabled={loading}>🔄</button></h2>
        {loading && popular.length === 0 && (
          <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.card}><div className={`skeleton ${styles.thumb}`} /><div className={styles.cardInfo}><div className="skeleton" style={{ height: 20, marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div></div>
          ))}</div>
        )}
        {apiError && <div className={styles.apiError}><p>⚠️ 热门数据加载失败</p><p className={styles.apiErrorDetail}>{apiError}</p></div>}
        <div className={styles.grid}>
          {popular.map(item => (
            <Link key={item.bvid} to={`/video/${item.bvid}`} className={styles.card}>
              <div className={styles.thumbWrap}>
                <img src={proxyMedia(item.pic)} alt={item.title} className={styles.thumb} loading="lazy" />
                <span className={styles.duration}>{fmtDur(item.duration)}</span>
                <span className={styles.viewBadge}>▶ {fmt(item.stat.view)}</span>
              </div>
              <div className={styles.cardInfo}>
                <h3 className={styles.cardTitle}>{item.title}</h3>
                <span className={styles.cardAuthor}>{item.owner.name}</span>
              </div>
            </Link>
          ))}
        </div>
        {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
        {loading && popular.length > 0 && <p style={{ textAlign: 'center', padding: 16, color: '#999' }}>加载中...</p>}
      </section>
    </div>
  )
}

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }
function fmtDur(s: string | number) { const n = typeof s === 'string' ? parseInt(s) : s; if (!n) return '--:--'; const m = Math.floor(n / 60); return `${m}:${(n % 60).toString().padStart(2, '0')}` }
