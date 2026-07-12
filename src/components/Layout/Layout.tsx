import { useState, type ReactNode } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import { proxyMedia } from '../../utils/request'
import { SearchBar } from '../Search/SearchBar'
import { QRLogin } from '../Login/QRLogin'
import styles from './Layout.module.css'

interface Props {
  children: ReactNode
}

export function Layout({ children }: Props) {
  const { isLoggedIn, user, logout } = useAuthStore()
  const [showLogin, setShowLogin] = useState(false)
  const navigate = useNavigate()

  return (
    <div className={styles.layout}>
      {/* Header */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.logo}>
            <span className={styles.logoIcon}>▶</span>
            <span className={styles.logoText}>BiliPlay</span>
          </Link>

          <div className={styles.searchWrap}>
            <SearchBar onSearch={(kw) => navigate(`/search?keyword=${encodeURIComponent(kw)}`)} />
          </div>

          <div className={styles.headerRight}>
            {isLoggedIn ? (
              <div className={styles.userArea}>
                <Link to="/favorites" className={styles.navLink}>收藏</Link>
                <Link to="/history" className={styles.navLink}>历史</Link>
                <img
                  src={proxyMedia(user?.face || '')}
                  alt={user?.uname}
                  className={styles.avatar}
                />
                <span className={styles.username}>{user?.uname}</span>
                <button className={styles.logoutBtn} onClick={logout}>
                  退出
                </button>
              </div>
            ) : (
              <button
                className="btn-primary"
                onClick={() => setShowLogin(true)}
              >
                登录
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className={styles.main}>
        <div className={styles.content}>
          {children}
        </div>
      </main>

      {/* Login modal */}
      {showLogin && (
        <div className={styles.modalOverlay} onClick={() => setShowLogin(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <QRLogin onSuccess={() => setShowLogin(false)} onClose={() => setShowLogin(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
