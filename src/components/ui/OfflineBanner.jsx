// src/components/ui/OfflineBanner.jsx
import { useState, useEffect } from 'react'

export default function OfflineBanner() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (online) return null
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 500,
      background: 'var(--ink-900, #1C1710)', color: '#F2D98A',
      textAlign: 'center', fontSize: 12.5, fontWeight: 500,
      padding: '8px 16px', letterSpacing: '0.01em',
    }}>
      You're offline — showing saved content. Bible chapters you've already read and saved items still work.
    </div>
  )
}
