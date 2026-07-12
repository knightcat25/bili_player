import { useEffect, useState } from 'react'
import { getReplies } from '../../api/comment'
import { proxyMedia } from '../../utils/request'
import type { Reply } from '../../api/types'
import styles from './CommentSection.module.css'

interface Props {
  oid: number
  type?: number
}

export function CommentSection({ oid, type = 1 }: Props) {
  const [replies, setReplies] = useState<Reply[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState(2) // 2=热度, 0=时间

  useEffect(() => {
    setLoading(true)
    setReplies([])
    setPage(1)
    loadComments(1, sort)
  }, [oid, sort])

  const loadComments = async (pn: number, s: number) => {
    try {
      const res = await getReplies(oid, type, pn, s)
      if (res.code === 0) {
        setReplies((prev) =>
          pn === 1 ? res.data.replies || [] : [...prev, ...(res.data.replies || [])],
        )
        setTotal(res.data.page?.count || 0)
      }
    } catch (err) {
      console.error('加载评论失败', err)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    const nextPage = page + 1
    setPage(nextPage)
    loadComments(nextPage, sort)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>评论 ({total})</h3>
        <div className={styles.sortBtns}>
          <button
            className={`${styles.sortBtn} ${sort === 2 ? styles.active : ''}`}
            onClick={() => setSort(2)}
          >
            按热度
          </button>
          <button
            className={`${styles.sortBtn} ${sort === 0 ? styles.active : ''}`}
            onClick={() => setSort(0)}
          >
            按时间
          </button>
        </div>
      </div>

      {loading && replies.length === 0 ? (
        <div className={styles.loading}>加载评论中...</div>
      ) : (
        <div className={styles.list}>
          {replies.map((reply) => (
            <CommentItem key={reply.rpid} reply={reply} oid={oid} />
          ))}

          {replies.length < total && (
            <button className={styles.loadMore} onClick={loadMore} disabled={loading}>
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}

          {replies.length === 0 && !loading && (
            <p className={styles.empty}>暂无评论</p>
          )}
        </div>
      )}
    </div>
  )
}

function CommentItem({ reply, oid }: { reply: Reply; oid: number }) {
  const [showReplies, setShowReplies] = useState(false)

  return (
    <div className={styles.comment}>
      <img src={proxyMedia(reply.member.avatar)} alt="" className={styles.commentAvatar} />
      <div className={styles.commentBody}>
        <div className={styles.commentHeader}>
          <span className={styles.commentName}>{reply.member.uname}</span>
          <span className={styles.commentTime}>
            {formatTime(reply.ctime)}
          </span>
        </div>
        <div
          className={styles.commentContent}
          dangerouslySetInnerHTML={{ __html: formatMessage(reply.content.message) }}
        />
        <div className={styles.commentActions}>
          <span>👍 {reply.like}</span>
          {reply.rcount > 0 && (
            <button
              className={styles.replyBtn}
              onClick={() => setShowReplies(!showReplies)}
            >
              💬 {reply.rcount}条回复
            </button>
          )}
        </div>

        {showReplies && reply.replies && (
          <div className={styles.subReplies}>
            {reply.replies.map((sub) => (
              <CommentItem key={sub.rpid} reply={sub} oid={oid} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function formatTime(ts: number): string {
  const d = new Date(ts * 1000)
  const now = Date.now()
  const diff = now - d.getTime()
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  return `${d.getMonth() + 1}-${d.getDate()}`
}

function formatMessage(msg: string): string {
  // 简单处理 @ 和 emoji
  return msg
    .replace(/@(\S+)/g, '<span style="color:#00a1d6">@$1</span>')
    .replace(/\n/g, '<br/>')
}
