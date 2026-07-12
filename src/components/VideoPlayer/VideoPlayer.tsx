import { useEffect, useRef, useState } from 'react'
import { getVideoInfo, getVideoPlayUrl, fetchDanmakuXml } from '../../api/video'
import { proxyMedia } from '../../utils/request'
import { DanmakuLayer } from '../Danmaku/DanmakuLayer'
import { usePlayerStore } from '../../store/playerStore'
import type { VideoInfo, DanmakuItem } from '../../api/types'
import styles from './VideoPlayer.module.css'

interface Props { bvid: string; cid?: number }

export function VideoPlayer({ bvid, cid: initialCid }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null)
  const [danmaku, setDanmaku] = useState<DanmakuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentCid, setCurrentCid] = useState(initialCid || 0)
  const { danmakuEnabled, danmakuOpacity, danmakuSize, setTime, setDuration, setPlaying, setVideo } = usePlayerStore()

  useEffect(() => {
    if (!bvid) return
    setLoading(true); setError(null)

    const TIMEOUT = setTimeout(() => { setError('请求超时'); setLoading(false) }, 20000)

    getVideoInfo(bvid)
      .then(res => {
        if (res.code !== 0) throw new Error(res.message)
        setVideoInfo(res.data)
        const c = currentCid || res.data.cid
        if (c !== currentCid) setCurrentCid(c)
        setVideo(bvid, c, res.data.title)
        return getVideoPlayUrl(bvid, c, 80)
      })
      .then(async res => {
        if (res.code !== 0) throw new Error(res.message)
        const el = videoRef.current; if (!el) return
        let url = res.data.durl?.[0]?.url || res.data.dash?.video?.[0]?.baseUrl || ''
        if (!url) throw new Error('无播放地址')
        if (url.startsWith('//')) url = 'https:' + url
        el.src = `/api/cdn?url=${encodeURIComponent(url)}`
        clearTimeout(TIMEOUT); setLoading(false)
      })
      .catch(err => { clearTimeout(TIMEOUT); setError(err.message); setLoading(false) })

    return () => { clearTimeout(TIMEOUT) }
  }, [bvid, currentCid])

  useEffect(() => {
    if (!videoInfo || !currentCid) return
    fetchDanmakuXml(currentCid).then(items => setDanmaku(items)).catch(() => {})
  }, [videoInfo, currentCid])

  const switchPart = (p: { cid: number }, _idx: number) => {
    setCurrentCid(p.cid)
  }

  return (
    <div className={styles.container}>
      <div className={styles.playerWrap}>
        {loading && <div className={`skeleton ${styles.playerSkeleton}`} />}
        {error && <div className={styles.errorBox}><p>😵 {error}</p></div>}
        <video ref={videoRef} className={styles.video}
          style={{ display: loading || error ? 'none' : 'block' }}
          controls onTimeUpdate={() => { const v = videoRef.current; if (v) setTime(v.currentTime) }}
          onDurationChange={() => { const v = videoRef.current; if (v) setDuration(v.duration) }}
          onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
          crossOrigin="anonymous" referrerPolicy="no-referrer" playsInline />
        <button className={styles.fsBtn} onClick={async () => {
          const el = videoRef.current; if (!el) return
          if (document.fullscreenElement) {
            document.exitFullscreen()
            try { (screen.orientation as any)?.unlock?.() } catch {}
            return
          }
          try {
            const fs = el.requestFullscreen || (el as any).webkitRequestFullscreen
            await fs.call(el)
            // 尝试锁定横屏
            const orient = (screen.orientation as any)
            if (orient?.lock) {
              try { await orient.lock('landscape') }
              catch { try { await orient.lock('landscape-primary') } catch {} }
            }
          } catch {
            // iOS
            try { (el as any).webkitEnterFullscreen?.() } catch {}
          }
        }} title="横屏全屏">⛶</button>
        {danmakuEnabled && danmaku.length > 0 && (
          <DanmakuLayer items={danmaku} opacity={danmakuOpacity} fontSize={danmakuSize} videoRef={videoRef} />
        )}
      </div>

      {videoInfo && videoInfo.pages && videoInfo.pages.length > 1 && (
        <div className={styles.parts}>
          <span className={styles.partsLabel}>选集 ({videoInfo.pages.length}P)</span>
          <div className={styles.partsList}>
            {videoInfo.pages.map((p, i) => (
              <button key={p.cid}
                className={`${styles.partBtn} ${p.cid === currentCid ? styles.partActive : ''}`}
                onClick={() => switchPart(p, i)}>
                {p.page}. {p.part}
              </button>
            ))}
          </div>
        </div>
      )}

      {videoInfo && (
        <div className={styles.info}>
          <h2 className={styles.title}>{videoInfo.title}</h2>
          <div className={styles.meta}>
            <span>👁 {fmt(videoInfo.stat.view)}</span> <span>💬 {fmt(videoInfo.stat.danmaku)}</span>
            <span>👍 {fmt(videoInfo.stat.like)}</span> <span>⭐ {fmt(videoInfo.stat.favorite)}</span>
          </div>
          <div className={styles.owner}>
            <img src={proxyMedia(videoInfo.owner.face)} alt="" className={styles.ownerFace} />
            <span>{videoInfo.owner.name}</span>
          </div>
          {videoInfo.desc && <p className={styles.desc}>{videoInfo.desc}</p>}
        </div>
      )}
    </div>
  )
}

function fmt(n: number) { return n >= 10000 ? (n / 10000).toFixed(1) + '万' : String(n) }
