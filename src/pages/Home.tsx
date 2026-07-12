import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SearchBar } from '../components/Search/SearchBar'
import { biliFetch, proxyMedia } from '../utils/request'
import styles from './Home.module.css'

interface PopularVideo {
  bvid: string
  title: string
  pic: string
  owner: { name: string }
  stat: { view: number; danmaku: number }
  duration: string
}

export function HomePage() {
  const [popular, setPopular] = useState<PopularVideo[]>([])
  const [loading, setLoading] = useState(true)
  const [apiError, setApiError] = useState<string | null>(null)
  const navigate = useNavigate()

  const fetchPopular = () => {
    setLoading(true); setApiError(null)
    biliFetch('/x/web-interface/popular?ps=20')
      .then((res: any) => {
        console.log('B站热门API返回:', res)
        if (res.code === 0) { setPopular(res.data?.list || []) }
        else { setApiError(`B站API返回错误 code=${res.code}`) }
      })
      .catch((err) => { console.error('B站API请求失败:', err); setApiError(`请求失败: ${err.message}`) })
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchPopular() }, [])

  return (
    <div className={styles.container}>
      {/* Hero */}
      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>BiliPlay</h1>
        <p className={styles.heroSub}>简易B站播放器 · 搜索你想看的内容</p>
        <div className={styles.heroSearch}>
          <SearchBar
            onSearch={(kw) => navigate(`/search?keyword=${encodeURIComponent(kw)}`)}
            placeholder="搜索视频..."
          />
        </div>
        <div className={styles.quickLinks}>
          <Link to="/live/1" className={styles.quickLink}>
            🔴 直播
          </Link>
          <Link to="/search?keyword=热门" className={styles.quickLink}>
            🔥 热门
          </Link>
        </div>
      </div>

      {/* Popular */}
      <section>
        <h2 className={styles.sectionTitle}>
          🔥 热门视频
          <button className={styles.refreshBtn} onClick={fetchPopular} disabled={loading}>🔄</button>
        </h2>

        {loading && (
          <div className={styles.grid}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <div className={`skeleton ${styles.thumb}`} />
                <div className={styles.cardInfo}>
                  <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
                  <div className="skeleton" style={{ height: 16, width: '60%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && apiError && (
          <div className={styles.apiError}>
            <p>⚠️ 热门数据加载失败</p>
            <p className={styles.apiErrorDetail}>{apiError}</p>
            <p className={styles.apiErrorHint}>
              提示：请确认 <code>npm run dev</code> 已启动（不是 preview），Vite 代理才能转发 API 请求。<br />
              也可以直接在搜索框搜索视频试试。
            </p>
          </div>
        )}

        {!loading && !apiError && (
          <div className={styles.grid}>
            {popular.map((item) => (
              <Link key={item.bvid} to={`/video/${item.bvid}`} className={styles.card}>
                <div className={styles.thumbWrap}>
                  <img
                    src={proxyMedia(item.pic)}
                    alt={item.title}
                    className={styles.thumb}
                    loading="lazy"
                  />
                  <span className={styles.duration}>{formatDuration(item.duration)}</span>
                  <span className={styles.viewBadge}>
                    ▶ {formatCount(item.stat.view)}
                  </span>
                </div>
                <div className={styles.cardInfo}>
                  <h3 className={styles.cardTitle}>{item.title}</h3>
                  <span className={styles.cardAuthor}>{item.owner.name}</span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {!loading && !apiError && popular.length === 0 && (
          <p className={styles.noData}>暂无数据，试试搜索吧</p>
        )}
      </section>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}

function formatDuration(seconds: string | number): string {
  const s = typeof seconds === 'string' ? parseInt(seconds) : seconds
  if (isNaN(s)) return '--:--'
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}
