import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Layout } from './components/Layout/Layout'
import { HomePage } from './pages/Home'
import { VideoPage } from './pages/Video'
import { LivePage } from './pages/Live'
import { SearchPage } from './pages/Search'
import { FavoritesPage } from './pages/Favorites'
import { HistoryPage } from './pages/History'
import { UserPage } from './pages/User'
import { useAuthStore } from './store/authStore'
import { useEffect } from 'react'

function AppLayout() {
  const checkLoginStatus = useAuthStore((s) => s.checkLoginStatus)

  useEffect(() => {
    checkLoginStatus()
  }, [])

  return (
    <Layout>
      <Outlet />
    </Layout>
  )
}

const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'video/:bvid', element: <VideoPage /> },
      { path: 'live/:roomId', element: <LivePage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'favorites', element: <FavoritesPage /> },
      { path: 'history', element: <HistoryPage /> },
      { path: 'user/:mid', element: <UserPage /> },
    ],
  },
])

export default function App() {
  // 图片代理失败时自动重试直连
  useEffect(() => {
    const handler = (e: Event) => {
      const img = e.target as HTMLImageElement
      if (img.tagName !== 'IMG') return
      const src = img.getAttribute('src') || ''
      const m = src.match(/\/api\/cdn\?url=(.+)/)
      if (m && !img.dataset.retried) {
        img.dataset.retried = '1'
        img.src = decodeURIComponent(m[1])
      }
    }
    document.addEventListener('error', handler, true)
    return () => document.removeEventListener('error', handler, true)
  }, [])

  return <RouterProvider router={router} />
}
