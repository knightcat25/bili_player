// 播放器状态管理
import { create } from 'zustand'

interface PlayerState {
  // 当前播放
  bvid: string | null
  cid: number | null
  title: string | null
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  quality: number

  // 弹幕
  danmakuEnabled: boolean
  danmakuOpacity: number
  danmakuSize: number

  setVideo: (bvid: string, cid: number, title: string) => void
  setPlaying: (playing: boolean) => void
  setTime: (time: number) => void
  setDuration: (dur: number) => void
  setVolume: (vol: number) => void
  setQuality: (q: number) => void
  toggleDanmaku: () => void
  setDanmakuOpacity: (opacity: number) => void
  setDanmakuSize: (size: number) => void
}

export const usePlayerStore = create<PlayerState>((set) => ({
  bvid: null,
  cid: null,
  title: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  quality: 80,

  danmakuEnabled: true,
  danmakuOpacity: 0.8,
  danmakuSize: 25,

  setVideo: (bvid, cid, title) => set({ bvid, cid, title, currentTime: 0 }),
  setPlaying: (playing) => set({ isPlaying: playing }),
  setTime: (time) => set({ currentTime: time }),
  setDuration: (dur) => set({ duration: dur }),
  setVolume: (vol) => set({ volume: vol }),
  setQuality: (q) => set({ quality: q }),
  toggleDanmaku: () => set((s) => ({ danmakuEnabled: !s.danmakuEnabled })),
  setDanmakuOpacity: (opacity) => set({ danmakuOpacity: opacity }),
  setDanmakuSize: (size) => set({ danmakuSize: size }),
}))
