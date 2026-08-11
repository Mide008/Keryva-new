// src/pages/YearInReviewPage.jsx
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'

export default function YearInReviewPage() {
  const { t } = useTranslation()
  const { prayers, fastingEntries, sermons, studyGuides, savedVerses, confessions, showToast } = useApp()

  const year = new Date().getFullYear()
  const inThisYear = (dateStr) => dateStr && new Date(dateStr).getFullYear() === year

  const stats = useMemo(() => {
    const answeredPrayers = prayers.filter(p => p.status === 'answered' && inThisYear(p.answeredDate || p.date))
    const completedFasts = fastingEntries.filter(f => f.completed && inThisYear(f.completedAt))
    const sermonsThisYear = sermons.filter(s => inThisYear(s.date))
    const studiesThisYear = studyGuides.filter(s => inThisYear(s.date))
    const versesThisYear = savedVerses.filter(v => inThisYear(v.date))
    const testimonies = prayers.filter(p => p.testimony && inThisYear(p.answeredDate || p.date)).map(p => p.testimony)
    return { answeredPrayers, completedFasts, sermonsThisYear, studiesThisYear, versesThisYear, testimonies }
  }, [prayers, fastingEntries, sermons, studyGuides, savedVerses])

  const share = () => {
    const msg = t('yearInReview.shareText', {
      year,
      sermons: stats.sermonsThisYear.length,
      studies: stats.studiesThisYear.length,
      prayers: stats.answeredPrayers.length,
      fasts: stats.completedFasts.length,
      verses: stats.versesThisYear.length,
    })
    if (navigator.share) navigator.share({ text: msg }).catch(() => {})
    else { navigator.clipboard.writeText(msg).catch(() => {}); showToast(t('yearInReview.copiedToClipboard'), '📋') }
  }

  const cards = [
    { emoji: '🎙', count: stats.sermonsThisYear.length, labelKey: 'yearInReview.sermonsPrepared' },
    { emoji: '📚', count: stats.studiesThisYear.length, labelKey: 'yearInReview.studyGuidesBuilt' },
    { emoji: '🙏', count: stats.answeredPrayers.length, labelKey: 'yearInReview.prayersAnswered' },
    { emoji: '🍽', count: stats.completedFasts.length, labelKey: 'yearInReview.fastingJourneysCompleted' },
    { emoji: '🔖', count: stats.versesThisYear.length, labelKey: 'yearInReview.versesSaved' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>
          {t('yearInReview.title', { year })}
        </h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>
          {t('yearInReview.subtitle')}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(140px,1fr))', gap: 12 }}>
        {cards.map((c, i) => (
          <motion.div key={c.labelKey} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="card" style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 28 }}>{c.emoji}</div>
            <div style={{ fontSize: 28, fontWeight: 600, fontFamily: 'var(--font-serif)', color: 'var(--gold-700)', marginTop: 4 }}>{c.count}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{t(c.labelKey)}</div>
          </motion.div>
        ))}
      </div>

      {stats.testimonies.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sage-600)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
            {t('yearInReview.testimoniesLabel')}
          </div>
          {stats.testimonies.map((t, i) => <p key={i} style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 8, fontStyle: 'italic' }}>"{t}"</p>)}
        </div>
      )}

      <button onClick={share} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
        {t('yearInReview.shareButton')}
      </button>
    </div>
  )
}