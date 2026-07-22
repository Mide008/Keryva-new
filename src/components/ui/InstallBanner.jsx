// src/components/ui/InstallBanner.jsx
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'

const DISMISS_KEY = 'rhema_install_banner_dismissed_until'

export default function InstallBanner() {
  const { canInstall, installed, promptInstall, platform } = useInstallPrompt()
  const [visible, setVisible] = useState(false)
  const [showSteps, setShowSteps] = useState(false)

  useEffect(() => {
    if (installed) return
    const dismissedUntil = parseInt(localStorage.getItem(DISMISS_KEY) || '0', 10)
    if (Date.now() < dismissedUntil) return
    const shouldOffer = canInstall || platform.isIOS || platform.isFirefox || platform.isDesktopSafari
    if (!shouldOffer) return
    const timer = setTimeout(() => setVisible(true), 2500)
    return () => clearTimeout(timer)
  }, [canInstall, installed, platform])

  const dismiss = (days = 7) => {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + days * 86400000))
    setVisible(false)
  }

  const install = async () => {
    const choice = await promptInstall()
    if (choice?.outcome === 'accepted') { setVisible(false) }
    else if (choice?.outcome === 'dismissed') { dismiss(3) }
  }

  if (!visible) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', damping: 24, stiffness: 260 }}
        style={{
          position: 'fixed', left: 16, right: 16, bottom: 'calc(var(--bottomnav-h, 0px) + 16px)',
          maxWidth: 420, margin: '0 auto', zIndex: 400,
          background: 'var(--ink-900)', color: '#F5F0E6', borderRadius: 18,
          padding: 16, boxShadow: '0 16px 40px rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg,#F2D98A,#B8862E)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1C1710', fontFamily: 'var(--font-serif)' }}>R</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Install Keryva</div>
            <div style={{ fontSize: 12.5, color: 'rgba(245,240,230,0.65)', marginTop: 2, lineHeight: 1.5 }}>
              One tap — get an app icon on your {platform.isAndroid || platform.isIOS ? 'home screen' : 'desktop'}, faster loading, and offline Bible access.
            </div>
            {showSteps && (
              <ol style={{ fontSize: 12.5, lineHeight: 1.8, marginTop: 8, paddingLeft: 18, color: 'rgba(245,240,230,0.85)' }}>
                {platform.isIOS && <><li>Tap the <b>Share</b> icon in Safari's toolbar</li><li>Tap <b>Add to Home Screen</b>, then <b>Add</b></li></>}
                {platform.isFirefox && platform.isAndroid && <li>Tap the menu (⋮) → <b>Add to Home screen</b></li>}
                {platform.isFirefox && !platform.isAndroid && <li>Firefox desktop doesn't support home-screen install — try Chrome or Edge</li>}
                {platform.isDesktopSafari && <li>Open <b>File</b> menu → <b>Add to Dock</b></li>}
              </ol>
            )}
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              {canInstall ? (
                <button onClick={install} style={{ background: '#F2D98A', color: '#1C1710', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>Install now</button>
              ) : (
                <button onClick={() => setShowSteps(s => !s)} style={{ background: '#F2D98A', color: '#1C1710', border: 'none', borderRadius: 8, padding: '7px 14px', fontSize: 12.5, fontWeight: 600, cursor: 'pointer' }}>{showSteps ? 'Got it' : 'How to install'}</button>
              )}
              <button onClick={() => dismiss(7)} style={{ background: 'none', color: 'rgba(245,240,230,0.5)', border: 'none', fontSize: 12.5, cursor: 'pointer', padding: '7px 8px' }}>Not now</button>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
