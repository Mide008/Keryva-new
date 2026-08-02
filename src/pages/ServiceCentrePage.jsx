import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import EmptyState from '@/components/ui/EmptyState'

const DEFAULT_ORDER = ['Opening Prayer', 'Worship', 'Announcements', 'Sermon', 'Altar Call', 'Closing Prayer']

function daysAway(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export default function ServiceCentrePage() {
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
    return <EmptyState icon="🎛" headline="No upcoming service scheduled." body="Add your next Sunday Service on the Ministry Calendar to activate the Command Centre." ctaLabel="Go to Calendar" onCta={() => setActivePage('calendar')} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {!presenterMode && (
        <>
          <div>
            <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>🎛 Service Command Centre</h1>
            <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Everything for service day, in one place.</p>
          </div>

          <div className="card-dark" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--gold-300)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{nextService.title}</div>
              <div style={{ fontSize: 20, fontFamily: 'var(--font-serif)', color: '#fff', marginTop: 4 }}>
                {away === 0 ? 'Today' : away === 1 ? 'Tomorrow' : `${away} days away`}
              </div>
            </div>
            <button onClick={() => setPresenterMode(true)} className="btn btn-gold">🎬 Enter Presenter Mode</button>
          </div>

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Readiness</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{linkedSermon ? '✅ Sermon ready' : '⚠️ No sermon linked'}</span>
                {!linkedSermon && <button onClick={() => setActivePage('sermon')} className="btn btn-outline btn-sm">Prepare</button>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13.5 }}>{linkedPack ? '✅ Sunday Pack ready' : '⚠️ Sunday Pack not built'}</span>
                {linkedSermon && !linkedPack && <button onClick={() => setActivePage('sunday')} className="btn btn-outline btn-sm">Build</button>}
              </div>
            </div>
          </div>

          {linkedSermon && (
            <div className="card">
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>🙏 Prayer Points</div>
              {(linkedSermon.content?.prayerPoints || []).map((p, i) => <p key={i} style={{ fontSize: 13.5, color: 'var(--ink-700)', marginBottom: 6 }}>• {p}</p>)}
              {!(linkedSermon.content?.prayerPoints?.length) && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>None saved with this sermon.</p>}
            </div>
          )}

          <div className="card">
            <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Order of Service</div>
            {DEFAULT_ORDER.map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < DEFAULT_ORDER.length - 1 ? '1px solid var(--border-subtle)' : 'none' }}>
                <span style={{ width: 22, height: 22, borderRadius: '50%', background: i === currentItem ? 'var(--gold-500)' : 'var(--bg-primary)', color: i === currentItem ? '#fff' : 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{i + 1}</span>
                <span style={{ fontSize: 14, color: i === currentItem ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: i === currentItem ? 500 : 400 }}>{item}</span>
              </div>
            ))}
          </div>
        </>
      )}

      <AnimatePresence>
        {presenterMode && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'var(--ink-900)', zIndex: 600, display: 'flex', flexDirection: 'column', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <span style={{ fontSize: 13, color: 'var(--gold-300)' }}>{nextService.title}</span>
              <button onClick={() => setPresenterMode(false)} className="btn btn-outline btn-sm" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}>✕ Exit</button>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: 'var(--gold-300)', marginBottom: 12 }}>Item {currentItem + 1} of {DEFAULT_ORDER.length}</div>
              <div style={{ fontSize: 'clamp(32px,6vw,56px)', fontFamily: 'var(--font-serif)' }}>{DEFAULT_ORDER[currentItem]}</div>
              {DEFAULT_ORDER[currentItem] === 'Sermon' && linkedSermon && <p style={{ fontSize: 18, color: 'rgba(255,255,255,0.7)', marginTop: 16 }}>{linkedSermon.topic}</p>}
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, padding: 24, flexWrap: 'wrap' }}>
              <button onClick={() => setCurrentItem(i => Math.max(0, i - 1))} disabled={currentItem === 0} className="btn btn-outline" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.3)', opacity: currentItem === 0 ? 0.4 : 1 }}>← Previous</button>
              <button onClick={() => setCurrentItem(i => Math.min(DEFAULT_ORDER.length - 1, i + 1))} disabled={currentItem === DEFAULT_ORDER.length - 1} className="btn btn-gold" style={{ opacity: currentItem === DEFAULT_ORDER.length - 1 ? 0.4 : 1 }}>Next Item →</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
