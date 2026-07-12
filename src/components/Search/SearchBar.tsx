import { useState, useCallback } from 'react'
import styles from './SearchBar.module.css'

interface Props {
  onSearch: (keyword: string) => void
  initialValue?: string
  placeholder?: string
}

export function SearchBar({
  onSearch,
  initialValue = '',
  placeholder = '搜索视频、直播...',
}: Props) {
  const [value, setValue] = useState(initialValue)

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = value.trim()
      if (trimmed) onSearch(trimmed)
    },
    [value, onSearch],
  )

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        className={styles.input}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
      />
      <button className={styles.btn} type="submit" aria-label="搜索">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </button>
    </form>
  )
}
