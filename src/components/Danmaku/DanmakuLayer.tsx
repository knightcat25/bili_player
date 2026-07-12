import { useEffect, useRef, useCallback } from 'react'
import type { DanmakuItem } from '../../api/types'
import styles from './DanmakuLayer.module.css'

interface Props {
  items: DanmakuItem[]
  opacity: number
  fontSize: number
  videoRef: React.RefObject<HTMLVideoElement | null>
}

const LH = 1.5

interface DanmakuLine { occupiedUntil: number }

export function DanmakuLayer({ items, opacity, fontSize, videoRef }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const linesRef = useRef<DanmakuLine[]>([])
  const activeRef = useRef<Map<number, { text: string; x: number; y: number; speed: number; color: number; mode: number; fontSize: number; startTime: number }>>(new Map())

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) { rafRef.current = requestAnimationFrame(draw); return }

    const now = performance.now()
    const elapsed = lastTimeRef.current ? now - lastTimeRef.current : 16
    lastTimeRef.current = now

    const ctx = canvas.getContext('2d')
    if (!ctx) { rafRef.current = requestAnimationFrame(draw); return }

    const rect = canvas.parentElement?.getBoundingClientRect()
    if (!rect) { rafRef.current = requestAnimationFrame(draw); return }

    const w = rect.width; const h = rect.height
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h }

    ctx.clearRect(0, 0, w, h)
    ctx.globalAlpha = opacity

    const ct = video.currentTime * 1000
    const lineCount = Math.floor(h / (fontSize * LH))
    const paused = video.paused

    if (linesRef.current.length !== lineCount) {
      linesRef.current = Array.from({ length: lineCount }, () => ({ occupiedUntil: 0 }))
    }

    const speed = w / 6 / 1000

    // 播放时插入新弹幕
    if (!paused) {
      for (const d of items) {
        if (activeRef.current.has(d.id)) continue
        if (Math.abs(d.progress - ct) > 500) continue
        const li = findLine(linesRef.current, ct, w, speed, fontSize)
        if (li === -1) continue
        activeRef.current.set(d.id, { text: d.content, x: w, y: li * fontSize * LH + fontSize, speed, color: d.color, mode: d.mode, fontSize, startTime: d.progress })
        const tw = ctx.measureText(d.content).width
        linesRef.current[li].occupiedUntil = (tw + w) / speed + ct
      }
    }

    const toRemove: number[] = []

    for (const [id, dm] of activeRef.current) {
      // 只在播放时移动
      if (!paused && dm.mode === 1) dm.x -= dm.speed * elapsed

      const tw = ctx.measureText(dm.text).width
      if (dm.x + tw < -50 || ct - dm.startTime > 15000) { toRemove.push(id); continue }

      const hex = '#' + dm.color.toString(16).padStart(6, '0')
      ctx.fillStyle = hex
      ctx.strokeStyle = 'rgba(0,0,0,0.5)'
      ctx.lineWidth = 2
      ctx.font = `${dm.fontSize}px "PingFang SC", "Microsoft YaHei", sans-serif`

      if (dm.mode === 1) {
        ctx.strokeText(dm.text, dm.x, dm.y)
        ctx.fillText(dm.text, dm.x, dm.y)
      } else {
        const fx = w / 2 - tw / 2
        const fy = dm.mode === 5 ? fontSize + 10 : h - 10
        ctx.strokeText(dm.text, fx, fy)
        ctx.fillText(dm.text, fx, fy)
        if (!paused && ct - dm.startTime > 5000) toRemove.push(id)
      }
    }

    for (const id of toRemove) activeRef.current.delete(id)
    ctx.globalAlpha = 1
    rafRef.current = requestAnimationFrame(draw)
  }, [items, opacity, fontSize, videoRef])

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  return <canvas ref={canvasRef} className={styles.canvas} />
}

function findLine(lines: DanmakuLine[], ct: number, _w: number, _speed: number, _fs: number): number {
  for (let i = 0; i < lines.length; i++) { if (lines[i].occupiedUntil <= ct) return i }
  let best = 0, min = Infinity
  for (let i = 0; i < lines.length; i++) { if (lines[i].occupiedUntil < min) { min = lines[i].occupiedUntil; best = i } }
  return best
}
