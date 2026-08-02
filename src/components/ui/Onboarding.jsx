// src/components/ui/Onboarding.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'

const KEY = 'rhema_onboarded'

const SLIDES = [
  { logo: true, title: 'Welcome to Keryva', body: 'From Scripture to Service — everything you need for ministry, in one place.' },
  { emoji: '🎙', title: 'Build sermons, study guides & more', body: 'Ask the Ministry Assistant in your own words, or use each tool directly from the menu.' },
  { emoji: '🔖', title: 'Read, save, and return anytime', body: 'Save verses, sermons, and prayers — tap any reference to jump straight to it in the Bible.' },
  { emoji: '🍽', title: 'Grow through the week', body: 'Devotionals, warfare, declarations, and fasting plans — track your walk day by day.' },
]

export default function Onboarding() {
  const { setActivePage } = useApp()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (!localStorage.getItem(KEY)) setVisible(true)
  }, [])

  const finish = (goToAgent) => {
    localStorage.setItem(KEY, '1')
    setVisible(false)
    if (goToAgent) setActivePage('agent')
  }

  const slide = SLIDES[step]
  const last = step === SLIDES.length - 1

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, background: 'rgba(28,23,16,0.55)', backdropFilter: 'blur(4px)', zIndex: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 300 }}
            style={{ background: 'var(--bg-card)', borderRadius: 24, padding: 32, maxWidth: 420, width: '100%', textAlign: 'center' }}
          >
            {slide.logo
              ? <img src="/logo-mark.png" srcSet="/logo-mark.png 1x, /logo-mark@2x.png 2x" alt="Keryva" width={72} height={72} style={{ borderRadius: 16, marginBottom: 16 }} />
              : <div style={{ fontSize: 48, marginBottom: 16 }}>{slide.emoji}</div>}
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, marginBottom: 10, color: 'var(--text-primary)' }}>{slide.title}</h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>{slide.body}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              {SLIDES.map((_, i) => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--gold-500)' : 'var(--border-subtle)', transition: 'all 0.2s ease' }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!last && <button onClick={() => finish(false)} className="btn btn-ghost" style={{ flex: 1 }}>Skip</button>}
              {!last && <button onClick={() => setStep(s => s + 1)} className="btn btn-primary" style={{ flex: 1 }}>Next</button>}
              {last && <button onClick={() => finish(false)} className="btn btn-outline" style={{ flex: 1 }}>Explore on my own</button>}
              {last && <button onClick={() => finish(true)} className="btn btn-primary" style={{ flex: 1 }}>Start with the Assistant</button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
