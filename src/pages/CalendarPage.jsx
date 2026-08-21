import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard } from '@/components/ui/MotionComponents'

const EVENT_TYPES = [
  { key: 'service', label: '⛪ Sunday Service' },
  { key: 'fasting', label: '🍽 Fasting Programme' },
  { key: 'prayer', label: '🙏 Prayer Meeting' },
  { key: 'other', label: '📌 Other' },
]
const EVENT_TYPE_LABEL_KEYS = { service: 'eventTypeService', fasting: 'eventTypeFasting', prayer: 'eventTypePrayer', other: 'eventTypeOther' }

function daysAway(dateStr) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const target = new Date(dateStr); target.setHours(0, 0, 0, 0)
  return Math.round((target - today) / 86400000)
}

export default function CalendarPage() {
  const { calendarEvents, saveCalendarEvent, deleteCalendarEvent, sermons, sundayPacks, setActivePage, confirmAction, showToast } = useApp()
  const { t, tOpt } = useTranslation()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('service')
  const [date, setDate] = useState('')
  const [sermonId, setSermonId] = useState('')

  const create = () => {
    if (!title.trim() || !date) { showToast(t('giveTitleAndDateFirst'), '⚠️'); return }
    saveCalendarEvent({ title: title.trim(), type, date, sermonId: sermonId || null })
    setTitle(''); setDate(''); setSermonId('')
  }

  const upcoming = calendarEvents.filter(e => daysAway(e.date) >= -1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{t('calendarTitle')}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>{t('calendarSubhead')}</p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="input-group">
          <label className="input-label">{t('eventTitleLabel')}</label>
          <input className="input-field" placeholder={t('eventTitlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="grid-2" style={{ gap: 12 }}>
          <div className="input-group">
            <label className="input-label">{t('eventTypeLabel')}</label>
            <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
              {EVENT_TYPES.map(et => <option key={et.key} value={et.key}>{tOpt('calendarEventType', et.label)}</option>)}
            </select>
          </div>
          <div className="input-group">
            <label className="input-label">{t('eventDateLabel')}</label>
            <input type="date" className="input-field" value={date} onChange={e => setDate(e.target.value)} />
          </div>
        </div>
        {type === 'service' && sermons.length > 0 && (
          <div className="input-group">
            <label className="input-label">{t('linkSermonLabel')}</label>
            <select className="select-field" value={sermonId} onChange={e => setSermonId(e.target.value)}>
              <option value="">{t('noneYetOption')}</option>
              {sermons.map(s => <option key={s.id} value={s.id}>{s.topic}</option>)}
            </select>
          </div>
        )}
        <motion.button whileTap={{ scale: 0.96 }} onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t('addToCalendarBtn')}</motion.button>
      </div>

      {upcoming.length === 0
        ? <EmptyState icon="📅" headline={t('calendarEmptyHeadline')} body={t('calendarEmptyBody')} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {upcoming.map((ev, i) => {
              const away = daysAway(ev.date)
              const linkedSermon = ev.sermonId ? sermons.find(s => s.id === Number(ev.sermonId)) : null
              const linkedPack = sundayPacks.find(p => p.topic === linkedSermon?.topic)
              return (
                <motion.div key={ev.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -2, boxShadow: '0 8px 24px rgba(28,23,16,0.08)' }}
                  className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{tOpt('calendarEventType', EVENT_TYPES.find(et => et.key === ev.type)?.label)} · {ev.date}</div>
                      <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{ev.title}</p>
                      <span className="tag tag-gold" style={{ fontSize: 11, marginTop: 6, display: 'inline-block' }}>
                        {away === 0 ? t('todayLabel') : away === 1 ? t('tomorrowLabel') : away > 1 ? `${away} ${t('daysAwaySuffix')}` : `${Math.abs(away)} ${t('dayLabel')} ${t('daysAgoSuffix')}`}
                      </span>
                    </div>
                    <button onClick={async () => { if (await confirmAction(t('removeFromCalendarConfirm'), { tone: 'danger', confirmLabel: t('removeBtn') })) deleteCalendarEvent(ev.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)' }}>🗑</button>
                  </div>

                  {ev.type === 'service' && away >= 0 && away <= 7 && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                        {linkedSermon ? t('sermonReadyLabel') : t('noSermonLinkedYetLabel')}{' '}
                        {linkedSermon && !linkedPack ? t('sundayPackNotBuiltYetLabel') : linkedSermon && linkedPack ? t('sundayPackReadyPeriodLabel') : ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!linkedSermon && <button onClick={() => setActivePage('sermon')} className="btn btn-outline btn-sm">{t('prepareSermonBtn')}</button>}
                        {linkedSermon && !linkedPack && <button onClick={() => setActivePage('sunday')} className="btn btn-outline btn-sm">{t('buildSundayPackBtn')}</button>}
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