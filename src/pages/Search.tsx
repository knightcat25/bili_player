import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { searchVideos } from '../api/video'
import { biliFetch } from '../utils/request'
import { proxyMedia } from '../utils/request'
import styles from './Search.module.css'

const HOT_WORDS = ['原神', 'LOL', '鬼畜', 'VOCALOID', '单机游戏', '编程']

function stripHtml(s: string) { return s?.replace(/<[^>]+>/g, '') || '' }
function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }

export function SearchPage() {
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const [results, setResults] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mode, setMode] = useState<'video' | 'user'>('video')

  const doSearch = (kw: string, pn: number): Promise<any[]> => {
    if (mode === 'user') {
      return biliFetch(`/x/web-interface/search/type?keyword=${encodeURIComponent(kw)}&search_type=bili_user&page=${pn}`)
        .then((res: any) => {
          if (res.code !== 0) throw new Error(res.message)
          return (res.data?.result || []).map((u: any) => ({
            type: 'user',
            mid: u.mid,
            uname: u.uname,
            face: u.upic || u.face,
            sign: u.usign || '',
            fans: u.fans || 0,
            videos: u.videos || 0,
          }))
        })
    }
    return searchVideos(kw, pn).then(res => {
      if (res.code !== 0) throw new Error(res.message)
      const groups = res.data.result || []
      const vg = groups.find((g: any) => g.type === 'video') as any
      return (vg?.data as any[]) || (groups.reduce((a: any, b: any) => (a.data?.length || 0) > (b.data?.length || 0) ? a : b, groups[0])?.data || [])
    })
  }

  useEffect(() => {
    if (!keyword) return
    setLoading(true); setError(null); setPage(1)
    doSearch(keyword, 1)
      .then((data: any[]) => { setResults(data); setHasMore(data.length >= 20) })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [keyword, mode])

  const loadMore = () => {
    const next = page + 1; setLoadingMore(true)
    doSearch(keyword, next)
      .then((data: any[]) => { setResults(p => [...p, ...data]); setPage(next); setHasMore(data.length >= 20) })
      .finally(() => setLoadingMore(false))
  }

  if (!keyword) {
    return (
      <div className={styles.emptyState}>
        <h2>搜索你想看的内容</h2>
        <div className={styles.hotTags}>
          {HOT_WORDS.map(w => <Link key={w} to={`/search?keyword=${encodeURIComponent(w)}`} className={styles.tag}>{w}</Link>)}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <h2 className={styles.heading}>搜索: {keyword}</h2>

      <div className={styles.modeBar}>
        <button className={`${styles.modeBtn} ${mode === 'video' ? styles.modeActive : ''}`} onClick={() => setMode('video')}>视频</button>
        <button className={`${styles.modeBtn} ${mode === 'user' ? styles.modeActive : ''}`} onClick={() => setMode('user')}>UP主</button>
      </div>

      {loading && <div className={styles.grid}>{Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.card}><div className={`skeleton ${styles.thumb}`} /><div className={styles.cardInfo}><div className="skeleton" style={{ height: 20, marginBottom: 8 }} /><div className="skeleton" style={{ height: 16, width: '60%' }} /></div></div>
      ))}</div>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && (
        <>
          {mode === 'video' ? (
            <div className={styles.grid}>
              {results.map(item => (
                <Link key={item.bvid || item.id} to={`/video/${item.bvid}`} className={styles.card}>
                  <div className={styles.thumbWrap}>
                    <img src={proxyMedia(item.pic)} alt={stripHtml(item.title)} className={styles.thumb} loading="lazy" />
                    <span className={styles.duration}>{item.duration}</span>
                  </div>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{stripHtml(item.title)}</h3>
                    <div className={styles.cardMeta}><span>{item.author}</span><span>▶ {fmt(item.play)}</span></div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.userList}>
              {results.map(user => (
                <Link key={user.mid} to={`/user/${user.mid}`} className={styles.userCard}>
                  <img src={proxyMedia(user.face)} alt={user.uname} className={styles.userAvatar} />
                  <div className={styles.userInfo}>
                    <span className={styles.userName}>{user.uname}</span>
                    <span className={styles.userMeta}>粉丝 {fmt(user.fans)} · 视频 {fmt(user.videos)}</span>
                    {user.sign && <p className={styles.userSign}>{user.sign}</p>}
                  </div>
                </Link>
              ))}
            </div>
          )}
          {hasMore && (
            <button className={styles.loadMoreBtn} onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? '加载中...' : '加载更多'}
            </button>
          )}
        </>
      )}
      {!loading && !error && results.length === 0 && <p className={styles.noResults}>未找到结果</p>}
    </div>
  )
}
