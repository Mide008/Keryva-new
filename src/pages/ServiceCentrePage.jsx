// src/pages/ServiceCentrePage.jsx
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import EmptyState from '@/components/ui/EmptyState'

// Order items with labelKey for translation
const ORDER_ITEMS = [
  { key: 'opening_prayer', labelKey: 'service.orderOpeningPrayer' },
  { key: 'worship', labelKey: 'service.orderWorship' },
  { key: 'announcements', labelKey: 'service.orderAnnouncements' },
  { key: 'sermon', labelKey: 'service.orderSermon' },
  { key: 'altar_call', labelKey: 'service.orderAltarCall' },
  { key: 'closing_prayer', labelKey: 'service.orderClosingPrayer' },
]

function daysAway(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export default function ServiceCentrePage() {
  const { t } = useTranslation()
  const { calendarEvents, sermons, sundayPacks, setActivePage } = useApp()
  const [currentItem, setCurrentItem] = useState(0)
  const [presenterMode, setPresenterMode] = useState(false)

  const nextService = useMemo(() => {
    const services = calendarEvents.filter(e => e.type === 'service' && daysAway(e.date) >= 0)
    return services.sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  }, [calendarEvents])

  const linkedSermon = nextService?.sermonId ? sermons.find(s => s.id === Number(nextService.sermonId)) : null
  const linkedPack = sundayPacks.find(p => p.topic === linkedSermon?.topic)
  const away = nextService ? daysAway(nextService.date) : null

  if (!nextService) {
    return (
      <EmptyState
        icon="🎛"
        headline={t('service.noUpcomingHeadline')}
        body={t('service.noUpcomingBody')}
        ctaLabel={t('service.goToCalendar')}
        onCta={() => setActivePage('calendar')}
      />
    )
  }

  // Status text for readiness
  let sermonStatus, sermonAction
  if (linkedSermon) {
    sermonStatus = t('service.sermonReady')
    sermonAction = null
  } else {
    sermonStatus = t('service.noSermonLinked')
    sermonAction = { label: t('service.prepare'), action: () => setActivePage('sermon') }
  }

  let packStatus, packAction
  if (linkedPack) {
    packStatus = t('service.sundayPackReady')
    packAction = null
  } else if (linkedSermon && !linkedPack) {
    packStatus = t('service.sundayPackNotBuilt')
    packAction = { label: t('service.build'), action: () => setActivePage('sunday') }
  } else {
    packStatus = t('service.sundayPackNotBuilt')
    packAction = null
  }

  const awayText = away === 0 ? t('service.today') : away === 1 ? t('service.tomorrow') : t('service.daysAway', { days: away })

  const orderLabels = ORDER_ITEMS.map(item => t(item.labelKey))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!presenterMode && (
        <>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{t('service.title')}</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{t('service.subtitle')}</p>
          </div>

          <div className="card-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{nextService.title}</div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', color: '#fff', marginTop: 4 }}>
                {awayText}
              </div>
            </div>
            <button onClick={() => setPresenterMode(true)} className="btn btn-gold">{t('service.enterPresenterMode')}</button>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>{t('service.readiness')}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{sermonStatus}</span>
                {sermonAction && <button onClick={sermonAction.action} className="btn btn-outline btn-sm">{sermonAction.label}</button>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{packStatus}</span>
                {packAction && <button onClick={packAction.action} className="btn btn-outline btn-sm">{packAction.label}</button>}
              </div>
            </div>
          </div>

          {linkedSermon && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>🙏 {t('service.prayerPoints')}</div>
              {(linkedSermon.content?.prayerPoints || []).map((p, i) => <p key={i} style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 6 }}>• {p}</p>)}
              {!(linkedSermon.content?.prayerPoints?.length) && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t('service.noPrayerPoints')}</p>}
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>{t('service.orderOfService')}</div>
            {ORDER_ITEMS.map((item, i) => {
              const label = t(item.labelKey)
              const isCurrent = i === currentItem
              return (
                <div key={item.key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < ORDER_ITEMS.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: isCurrent ? 'var(--gold-500)' : 'var(--bg-primary)',
                    color: isCurrent ? '#fff' : 'var(--text-muted)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 600, flexShrink: 0
                  }}>{i + 1}</span>
                  <span style={{
                    fontSize: 14,
                    color: isCurrent ? 'var(--text-primary)' : 'var(--text-muted)',
                    fontWeight: isCurrent ? 500 : 400
                  }}>{label}</span>
                </div>
              )
            })}
          </div>
        </>
      )}

      <AnimatePresence>
        {presenterMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--ink-900)', zIndex: 600, display: 'flex', flexDirection: 'column', color: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 13, color: 'var(--gold-300)' }}>{nextService.title}</span>
              <button onClick={() => setPresenterMode(false)} className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>✕ {t('service.exitPresenter')}</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gold-300)', marginBottom: 12 }}>
                {t('service.itemProgress', { current: currentItem + 1, total: ORDER_ITEMS.length })}
              </div>
              <div style={{ fontSize: 'clamp(32px,6vw,56px)', fontFamily: 'var(--font-serif)' }}>
                {orderLabels[currentItem]}
              </div>
              {ORDER_ITEMS[currentItem].key === 'sermon' && linkedSermon && (
                <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>{linkedSermon.topic}</p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: 24, flexWrap: 'wrap' }}>
              <button
                onClick={() => setCurrentItem(i => Math.max(0, i - 1))}
                disabled={currentItem === 0}
                className="btn btn-outline"
                style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', opacity: currentItem === 0 ? 0.4 : 1 }}
              >
                ← {t('service.previous')}
              </button>
              <button
                onClick={() => setCurrentItem(i => Math.min(ORDER_ITEMS.length - 1, i + 1))}
                disabled={currentItem === ORDER_ITEMS.length - 1}
                className="btn btn-gold"
                style={{ opacity: currentItem === ORDER_ITEMS.length - 1 ? 0.4 : 1 }}
              >
                {t('service.nextItem')} →
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}