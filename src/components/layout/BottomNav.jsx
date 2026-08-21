// src/components/layout/BottomNav.jsx
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import Icon3D from '@/components/ui/Icon3D'

export default function BottomNav() {
  const { activePage, setActivePage } = useApp()
  const { t } = useTranslation()
  const TABS = [
    { id: 'home', icon: 'home', label: t('navHome') },
    { id: 'bible', icon: 'book', label: t('navBible') },
    { id: 'warfare', icon: 'sword', label: t('navWarfare') },
    { id: 'prayer', icon: 'praying', label: t('navPrayer') },
    { id: 'saved', icon: 'bookmark', label: t('navSaved') },
  ]

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {TABS.map(tab => {
        const active = activePage === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => setActivePage(tab.id)}
            className={`bottom-nav-item ${active ? 'active' : ''}`}
            aria-current={active ? 'page' : undefined}
            style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}
          >
            <motion.div animate={{ scale: active ? 1 : 0.93, y: active ? -2 : 0 }} transition={{ type: 'spring', damping: 18, stiffness: 300 }}>
              <Icon3D name={tab.icon} tone="gold" active={active} size={16} badgeSize={30} />
            </motion.div>
            <span
              style={{
                position: 'relative',
                zIndex: 1,
                fontSize: 10,
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--gold-700)' : 'var(--ink-400)',
              }}
            >
              {tab.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
