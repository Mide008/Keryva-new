// src/pages/CalendarPage.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard } from '@/components/ui/MotionComponents'

// Event type keys – translations will be added to translations.js
const EVENT_TYPES = [
  { key: 'service', labelKey: 'calendar.type_service' },
  { key: 'fasting', labelKey: 'calendar.type_fasting' },
  { key: 'prayer', labelKey: 'calendar.type_prayer' },
  { key: 'other', labelKey: 'calendar.type_other' },
]

function daysAway(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export default function CalendarPage() {
  const { t } = useTranslation()
  const { calendarEvents, saveCalendarEvent, deleteCalendarEvent, sermons, sundayPacks, setActivePage, confirmAction, showToast } = useApp()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('service')
  const [date, setDate] = useState('')
  const [sermonId, setSermonId] = useState('')

  const create = () => {
    if (!title.trim() || !date) { showToast(t('calendar.errorTitleDate'), '⚠️'); return }
    saveCalendarEvent({ title: title.trim(), type, date, sermonId: sermonId || null })
    setTitle(''); setDate(''); setSermonId('')
  }

  const upcoming = calendarEvents.filter(e => daysAway(e.date) >= -1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{t('calendar.title')}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{t('calendar.subtitle')}</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="input-group">
          <label className="input-label">{t('calendar.eventTitleLabel')}</label>
          <input className="input-field" placeholder={t('calendar.eventTitlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="input-group">
            <label className="input-label">{t('calendar.typeLabel')}</label>
            <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
              {EVENT_TYPES.map(et => <option key={et.key} value={et.key}>{t(et.labelKey)}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{t('calendar.dateLabel')}</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        {type === 'service' && sermons.length > 0 && (
          <div className="input-group">
            <label className="input-label">{t('calendar.linkSermonLabel')}</label>
            <select className="select-field" value={sermonId} onChange={e => setSermonId(e.target.value)}>
              <option value="">{t('calendar.noSermonOption')}</option>
              {sermons.map(s => <option key={s.id} value={s.id}>{s.topic}</option>)}
            </select>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.96 }} onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t('calendar.addButton')}</motion.button>
      </div>

      {upcoming.length === 0
        ? <EmptyState icon="📅" headline={t('calendar.emptyHeadline')} body={t('calendar.emptyBody')} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map((ev, i) => {
              const away = daysAway(ev.date)
              const absDays = Math.abs(away)
              let statusKey
              if (away === 0) statusKey = 'calendar.statusToday'
              else if (away === 1) statusKey = 'calendar.statusTomorrow'
              else if (away > 1) statusKey = absDays === 1 ? 'calendar.statusDayAway' : 'calendar.statusDaysAway'
              else statusKey = absDays === 1 ? 'calendar.statusDayAgo' : 'calendar.statusDaysAgo'
              const statusText = t(statusKey, { days: absDays })

              const linkedSermon = ev.sermonId ? sermons.find(s => s.id === Number(ev.sermonId)) : null
              const linkedPack = sundayPacks.find(p => p.topic === linkedSermon?.topic)
              const typeLabel = EVENT_TYPES.find(t => t.key === ev.type)?.labelKey

              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(28,23,16,0.08)' }}
                  className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{typeLabel ? t(typeLabel) : ev.type} · {ev.date}</div>
                      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{ev.title}</p>
                      <span className="tag tag-gold" style={{ fontSize: 11, marginTop: 6, display: 'inline-block' }}>
                        {statusText}
                      </span>
                    </div>
                    <button onClick={async () => { if (await confirmAction(t('calendar.deleteConfirm'), { tone: 'danger', confirmLabel: t('delete') })) deleteCalendarEvent(ev.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)' }}>🗑</button>
                  </div>

                  {ev.type === 'service' && away >= 0 && away <= 7 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {linkedSermon ? t('calendar.sermonReady') : t('calendar.noSermonLinked')}{' '}
                        {linkedSermon && !linkedPack ? t('calendar.packNotBuilt') : linkedSermon && linkedPack ? t('calendar.packReady') : ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!linkedSermon && <button onClick={() => setActivePage('sermon')} className="btn btn-outline btn-sm">{t('calendar.prepareSermon')}</button>}
                        {linkedSermon && !linkedPack && <button onClick={() => setActivePage('sunday')} className="btn btn-outline btn-sm">{t('calendar.buildSundayPack')}</button>}
                      </div>
                    </div>
                  )}
                </motion.div>
              )
            })}
          </div>}
    </div>
  )
}