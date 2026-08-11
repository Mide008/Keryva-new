// src/components/ui/Onboarding.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'

const KEY = 'rhema_onboarded'

export default function Onboarding() {
  const { t } = useTranslation()
  const { setActivePage } = useApp()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  const SLIDES = [
    {
      logo: true,
      titleKey: 'onboarding.slide1_title',
      bodyKey: 'onboarding.slide1_body'
    },
    {
      emoji: '🎙',
      titleKey: 'onboarding.slide2_title',
      bodyKey: 'onboarding.slide2_body'
    },
    {
      emoji: '🔖',
      titleKey: 'onboarding.slide3_title',
      bodyKey: 'onboarding.slide3_body'
    },
    {
      emoji: '🍽',
      titleKey: 'onboarding.slide4_title',
      bodyKey: 'onboarding.slide4_body'
    },
  ]

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
              ? <img src="/logo-mark.png" srcSet="/logo-mark.png 1x, /logo-mark@2x.png 2x" alt={t('appName')} width={72} height={72} style={{ borderRadius: 16, marginBottom: 16 }} />
              : <div style={{ fontSize: 48, marginBottom: 16 }}>{slide.emoji}</div>}
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 22, fontWeight: 500, marginBottom: 10, color: 'var(--text-primary)' }}>{t(slide.titleKey)}</h2>
            <p style={{ fontSize: 14.5, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 24 }}>{t(slide.bodyKey)}</p>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 24 }}>
              {SLIDES.map((_, i) => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 3, background: i === step ? 'var(--gold-500)' : 'var(--border-subtle)', transition: 'all 0.2s ease' }} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {!last && <button onClick={() => finish(false)} className="btn btn-ghost" style={{ flex: 1 }}>{t('onboarding.skip')}</button>}
              {!last && <button onClick={() => setStep(s => s + 1)} className="btn btn-primary" style={{ flex: 1 }}>{t('onboarding.next')}</button>}
              {last && <button onClick={() => finish(false)} className="btn btn-outline" style={{ flex: 1 }}>{t('onboarding.explore')}</button>}
              {last && <button onClick={() => finish(true)} className="btn btn-primary" style={{ flex: 1 }}>{t('onboarding.startAssistant')}</button>}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}