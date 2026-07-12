import { useParams } from 'react-router-dom'
import { VideoPlayer } from '../components/VideoPlayer/VideoPlayer'
import { CommentSection } from '../components/Comment/CommentSection'
import { ShareButton } from '../components/Share/ShareButton'
import { useAuthStore } from '../store/authStore'
import { likeVideo, tripleVideo, getVideoInfo } from '../api/video'
import { useEffect, useState } from 'react'
import styles from './Video.module.css'

export function VideoPage() {
  const { bvid } = useParams<{ bvid: string }>()
  const { isLoggedIn } = useAuthStore()
  const [aid, setAid] = useState<number>(0)
  const [title, setTitle] = useState('')
  const [liked, setLiked] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    if (!bvid) return
    getVideoInfo(bvid).then((res) => {
      if (res.code === 0) {
        setAid(res.data.aid)
        setTitle(res.data.title)
      }
    })
  }, [bvid])

  const handleLike = async () => {
    if (!bvid || !isLoggedIn) return
    setActionLoading(true)
    try {
      await likeVideo(bvid, !liked)
      setLiked(!liked)
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  const handleTriple = async () => {
    if (!bvid || !isLoggedIn) return
    setActionLoading(true)
    try {
      await tripleVideo(bvid)
      setLiked(true)
    } catch {
      // ignore
    } finally {
      setActionLoading(false)
    }
  }

  if (!bvid) {
    return <p className={styles.error}>无效的视频ID</p>
  }

  return (
    <div className={styles.container}>
      <VideoPlayer bvid={bvid} />

      {/* 操作栏 */}
      <div className={styles.actions}>
        {isLoggedIn && (
          <>
            <button
              className={`${styles.actionBtn} ${liked ? styles.liked : ''}`}
              onClick={handleLike}
              disabled={actionLoading}
            >
              👍 {liked ? '已点赞' : '点赞'}
            </button>
            <button
              className={styles.actionBtn}
              onClick={handleTriple}
              disabled={actionLoading}
            >
              🔥 三连
            </button>
          </>
        )}

        <ShareButton bvid={bvid} title={title} />
      </div>

      {/* 评论 */}
      {aid > 0 && <CommentSection oid={aid} />}
    </div>
  )
}
