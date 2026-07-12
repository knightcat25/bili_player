import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { getLiveRoomInfo, getLivePlayUrl } from '../api/live'
import type { LiveRoomInfo } from '../api/types'
import styles from './Live.module.css'

// flv.js 动态加载
let _flvjs: any = null
async function loadFlvJs() {
  if (!_flvjs) {
    const mod = await import('flv.js')
    _flvjs = (mod as any).default || mod
  }
  return _flvjs
}

export function LivePage() {
  const { roomId } = useParams<{ roomId: string }>()
  const [roomInfo, setRoomInfo] = useState<LiveRoomInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const flvPlayerRef = useRef<any>(null)

  useEffect(() => {
    if (!roomId) return
    const rid = parseInt(roomId, 10)
    if (isNaN(rid)) {
      setError('无效的房间号')
      setLoading(false)
      return
    }

    // 销毁旧播放器
    if (flvPlayerRef.current) {
      try { flvPlayerRef.current.destroy() } catch {}
      flvPlayerRef.current = null
    }

    setLoading(true)
    getLiveRoomInfo(rid)
      .then((res) => {
        if (res.code !== 0) throw new Error(res.message)
        setRoomInfo(res.data)

        if (res.data.live_status !== 1) {
          setLoading(false)
          return null
        }

        return getLivePlayUrl(rid)
      })
      .then(async (res) => {
        if (!res) return
        if (res.code !== 0) throw new Error(res.message)

        const videoEl = videoRef.current
        if (!videoEl) return

        const playData = res.data as any
        let flvUrl: string | null = null

        const streams = playData?.playurl_info?.playurl?.stream
        if (streams) {
          for (const stream of streams) {
            const formats = stream.format || []
            for (const fmt of formats) {
              const codecs = fmt.codec || []
              for (const codec of codecs) {
                const urls = codec.url_info || []
                for (const u of urls) {
                  if (u.host && u.extra) {
                    flvUrl = `${u.host}${codec.base_url}${u.extra}`
                    break
                  }
                }
                if (flvUrl) break
              }
              if (flvUrl) break
            }
            if (flvUrl) break
          }
        }

        if (!flvUrl && playData?.durl) {
          flvUrl = playData.durl[0]?.url || null
        }

        if (!flvUrl) throw new Error('无法获取直播流')

        try {
          const flvjs = await loadFlvJs()
          if (flvjs && flvjs.isSupported()) {
            const player = flvjs.createPlayer({
              type: 'flv',
              url: flvUrl,
              isLive: true,
            })
            player.attachMediaElement(videoEl)
            player.load()
            player.play()
            flvPlayerRef.current = player
            player.on(flvjs.Events.ERROR, () => {
              videoEl.src = flvUrl!
            })
          } else {
            videoEl.src = flvUrl
          }
        } catch {
          videoEl.src = flvUrl
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    return () => {
      if (flvPlayerRef.current) {
        try { flvPlayerRef.current.destroy() } catch {}
        flvPlayerRef.current = null
      }
    }
  }, [roomId])

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={`skeleton ${styles.playerSkeleton}`} />
      </div>
    )
  }

  if (error) {
    return <p className={styles.error}>加载失败: {error}</p>
  }

  if (!roomInfo || roomInfo.live_status !== 1) {
    return (
      <div className={styles.offline}>
        <div className={styles.offlineCard}>
          <img src={roomInfo?.cover} alt="" className={styles.offlineCover} />
          <h3>{roomInfo?.title || '直播间'}</h3>
          <p className={styles.offlineText}>
            {roomInfo?.live_status === 2 ? '轮播中' : '主播暂时不在家'}
          </p>
          {roomInfo?.description && (
            <p className={styles.offlineDesc}>{roomInfo.description}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.playerWrap}>
        <video
          ref={videoRef}
          className={styles.video}
          autoPlay
          controls
          playsInline
        />

        <div className={styles.liveBadge}>
          <span className={styles.liveDot} />
          LIVE {formatCount(roomInfo.online)}
        </div>
      </div>

      <div className={styles.info}>
        <h2 className={styles.title}>{roomInfo.title}</h2>
        <div className={styles.meta}>
          <span>🏷 {roomInfo.parent_area_name} · {roomInfo.area_name}</span>
          <span>👁 {formatCount(roomInfo.online)} 人气</span>
        </div>
      </div>
    </div>
  )
}

function formatCount(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  return String(n)
}
