// src/components/ui/CookieConsent.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from '@/hooks/useTranslation'

const KEY = 'rhema_cookie_consent'

export default function CookieConsent() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  const choose = (value) => {
    localStorage.setItem(KEY, JSON.stringify({ choice: value, at: Date.now() }))
    setVisible(false)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 100, opacity: 0 }}
          transition={{ type: 'spring', damping: 26, stiffness: 280 }}
          style={{
            position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 600,
            background: 'var(--bg-card, #fff)', borderTop: '1px solid var(--border-subtle)',
            boxShadow: '0 -8px 30px rgba(0,0,0,0.08)', padding: '18px 20px',
            paddingBottom: 'calc(18px + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>{t('cookieTitle')}</div>
              <p style={{ fontSize: 12.5, color: 'var(--text-muted)', lineHeight: 1.6, margin: 0 }}>{t('cookieBody')}</p>
            </div>
            <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
              <button onClick={() => choose('declined')} className="btn btn-outline btn-sm">{t('cookieDecline')}</button>
              <button onClick={() => choose('accepted')} className="btn btn-gold btn-sm">{t('cookieAccept')}</button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
