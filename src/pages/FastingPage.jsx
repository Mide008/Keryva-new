// src/pages/FastingPage.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { useAIServices, RESPONSE_LANGUAGES } from '@/lib/aiServices'
import { TRANSLATIONS } from '@/lib/bibleData'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { verifyReference } from '@/services/bibleApi'

// Options with labelKey for translation
const FAST_TYPES = [
  { key: 'partial', emoji: '🌅', labelKey: 'fasting.type_partial' },
  { key: 'daniel', emoji: '🥗', labelKey: 'fasting.type_daniel' },
  { key: 'full-day', emoji: '☀️', labelKey: 'fasting.type_full_day' },
  { key: 'multi-day', emoji: '📅', labelKey: 'fasting.type_multi_day' },
]
const DURATIONS = [
  { value: '1 day', labelKey: 'fasting.duration_1day' },
  { value: '3 days', labelKey: 'fasting.duration_3days' },
  { value: '7 days', labelKey: 'fasting.duration_7days' },
  { value: '21 days', labelKey: 'fasting.duration_21days' },
]

function todayStr() { return new Date().toISOString().split('T')[0] }
function currentStreak(entry) {
  const days = new Set(entry.daysCompleted || [])
  let streak = 0
  let d = new Date()
  while (days.has(d.toISOString().split('T')[0])) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

export default function FastingPage() {
  const { t } = useTranslation()
  const { showToast, fastingEntries, saveFastingEntry, deleteFastingEntry, logFastingDay, user, confirmAction, setActivePage, setPendingChapter } = useApp()
  const { ask, loading } = useAI()
  const services = useAIServices(ask)
  const [fastType, setFastType] = useState('partial')
  const [duration, setDuration] = useState('1 day')
  const [goal, setGoal] = useState('')
  const [tran, setTran] = useState(user.translation || 'KJV')
  const [lang, setLang] = useState(user.language || 'en')
  const [result, setResult] = useState(null)
  const [view, setView] = useState('build')

  const langLabel = RESPONSE_LANGUAGES.find(l => l.code === lang)?.label || 'English'
  const fastTypeLabel = FAST_TYPES.find(f => f.key === fastType)?.labelKey
    ? t(FAST_TYPES.find(f => f.key === fastType).labelKey)
    : 'Partial fast'
  const durationLabel = DURATIONS.find(d => d.value === duration)?.labelKey
    ? t(DURATIONS.find(d => d.value === duration).labelKey)
    : duration

  const generate = async () => {
    if (!goal.trim()) { showToast(t('fasting.errorNoGoal'), '⚠️'); return }
    setResult(null)
    const r = await services.generateFasting({
      fastType: fastTypeLabel,
      duration: durationLabel,
      goal: goal.trim(),
      translation: tran,
      languageLabel: langLabel
    })
    if (r) {
      setResult(r)
      showToast(t('fasting.successToast'), '🍽')
      if (r.scriptures?.length) {
        const verified = await Promise.all(r.scriptures.map(async v => {
          const res = await verifyReference(v.ref, tran)
          return res.verified ? { ...v, text: res.text, ref: res.reference, verifyStatus: 'verified' } : { ...v, verifyStatus: 'unverified' }
        }))
        setResult(prev => prev ? { ...prev, scriptures: verified } : prev)
      }
    } else showToast(t('fasting.errorToast'), '❌')
  }

  const shareWA = () => {
    if (!result) return
    const msg = `🍽 *${t('fasting.shareTitle')} — ${fastTypeLabel}, ${durationLabel}*\n\n${result.purpose}\n\n*${t('fasting.breakingFastLabel')}:*\n${result.breakingTheFast}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    showToast(t('shareToWhatsApp'), '💬')
  }

  const save = () => {
    if (result) {
      saveFastingEntry({
        fastType: fastTypeLabel,
        duration: durationLabel,
        goal,
        translation: tran,
        language: lang,
        daysCompleted: [],
        ...result
      })
      showToast(t('fasting.savedToast'), '🍽')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <RevealCard>
        <div style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--ink-900)', padding: 28 }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(212,168,75,0.18) 0%,transparent 70%)' }} />
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 8 }}>🍽 {t('fasting.tag')}</div>
          <MotionHeadline text={t('fasting.headline')} as="h1" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px,3vw,30px)', fontWeight: 400, color: 'rgba(250,247,242,0.95)', lineHeight: 1.2 }} />
          <p style={{ fontSize: 13, color: 'rgba(250,247,242,0.55)', marginTop: 10, maxWidth: 480, lineHeight: 1.6 }}>
            {t('fasting.subtitle')}
          </p>
        </div>
      </RevealCard>

      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          ['build', `🍽 ${t('fasting.tabBuild')}`],
          ['library', `📁 ${t('fasting.tabSaved', { count: fastingEntries.length })}`]
        ].map(([m, label]) => (
          <button key={m} onClick={() => setView(m)}
            style={{
              padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer',
              background: view === m ? 'var(--ink-900)' : 'transparent',
              color: view === m ? 'var(--text-inverse)' : 'var(--text-muted)',
              border: 'none', transition: 'all var(--dur-fast) ease'
            }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'build' && (
        <>
          <RevealCard delay={0.05}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>{t('fasting.typeLabel')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FAST_TYPES.map(f => (
                    <button key={f.key} onClick={() => setFastType(f.key)}
                      className={`tag ${fastType === f.key ? 'tag-dark' : 'tag-ink'}`}
                      style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: fastType === f.key ? 600 : 400 }}>
                      {f.emoji} {t(f.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>{t('fasting.durationLabel')}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DURATIONS.map(d => (
                    <button key={d.value} onClick={() => setDuration(d.value)}
                      className={`tag ${duration === d.value ? 'tag-gold' : 'tag-ink'}`}
                      style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: duration === d.value ? 600 : 400 }}>
                      {t(d.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">{t('fasting.goalLabel')}</label>
                <textarea className="textarea-field" rows={3} placeholder={t('fasting.goalPlaceholder')}
                  value={goal} onChange={e => setGoal(e.target.value)} />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">{t('fasting.translationLabel')}</label>
                  <select className="select-field" value={tran} onChange={e => setTran(e.target.value)}>
                    {TRANSLATIONS.map(tr => <option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('language')}</label>
                  <select className="select-field" value={lang} onChange={e => setLang(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <MagneticBtn onClick={generate} disabled={!goal.trim() || loading} className="btn btn-primary btn-lg"
                style={{ width: '100%', justifyContent: 'center', gap: 10 }}>
                {loading ? (
                  <>
                    <span className="loading-dots">
                      <span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" />
                    </span>
                    {t('fasting.generating')}
                  </>
                ) : (
                  <>🍽 {t('fasting.generateButton')}</>
                )}
              </MagneticBtn>
            </div>
          </RevealCard>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card-gold">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-700)', marginBottom: 8 }}>✦ {t('fasting.purposeLabel')}</div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{result.purpose}</p>
                </div>

                <div className="card-elevated">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>{t('fasting.whatToExpectLabel')}</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.whatToExpect}</p>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>📖 {t('fasting.scripturesLabel')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.scriptures?.map((v, i) => (
                      <div key={i} className="verse-card" style={{ padding: '18px 22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span className="verse-ref" style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border-gold)' }} title={t('verseActionGoToBible')} onClick={() => {
                            const m = v.ref?.match(/^(.+?)\s+(\d+):(\d+)/)
                            if (!m) { showToast(t('fasting.cannotOpenRef'), '⚠️'); return }
                            setPendingChapter({
                              bookName: m[1].trim(),
                              chapter: parseInt(m[2], 10),
                              verse: parseInt(m[3], 10),
                              translation: tran || 'KJV'
                            })
                            setActivePage('bible')
                          }}>{v.ref} · {tran}</span>
                          <VerifiedBadge status={v.verifyStatus || 'checking'} />
                        </div>
                        <p className="verse-text">{v.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>🙏 {t('fasting.dailyPrayerFocusLabel')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.dailyPrayerFocus?.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--terra-500)', fontSize: 13, marginTop: 2 }}>{i + 1}.</span>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>✅ {t('fasting.practicalTipsLabel')}</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.practicalTips?.map((p, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <span style={{ color: 'var(--gold-500)', fontSize: 16, lineHeight: 1.6 }}>✦</span>
                        <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-dark">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 10 }}>🍽 {t('fasting.breakingFastLabel')}</div>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(250,247,242,0.88)' }}>{result.breakingTheFast}</p>
                </div>

                <div style={{ background: 'var(--sage-100)', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, fontStyle: 'italic' }}>{result.encouragement}</p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={save} className="btn btn-gold">🔖 {t('fasting.saveButton')}</button>
                  <button onClick={shareWA} className="btn btn-outline">💬 {t('whatsapp')}</button>
                  <button onClick={() => { setResult(null); setGoal('') }} className="btn btn-ghost">{t('fasting.startOver')}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {view === 'library' && (
        fastingEntries.length === 0
          ? <EmptyState
              icon="🍽"
              headline={t('fasting.emptyHeadline')}
              body={t('fasting.emptyBody')}
              ctaLabel={t('fasting.emptyCta')}
              onCta={() => setView('build')}
            />
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fastingEntries.map(e => (
                <FastingEntryCard key={e.id} entry={e} services={services} langLabel={langLabel} />
              ))}
            </div>
      )}
    </div>
  )
}

function FastingEntryCard({ entry: e, services, langLabel }) {
  const { t } = useTranslation()
  const { logFastingDay, deleteFastingEntry, addFastingJournalEntry, completeFastingJourney, confirmAction, showToast } = useApp()
  const [journalOpen, setJournalOpen] = useState(false)
  const [reflection, setReflection] = useState('')
  const [lesson, setLesson] = useState('')
  const [answeredPrayer, setAnsweredPrayer] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const [endReview, setEndReview] = useState(e.endReview || null)

  const streak = currentStreak(e)
  const loggedToday = (e.daysCompleted || []).includes(todayStr())

  const saveJournal = () => {
    if (!reflection.trim() && !lesson.trim() && !answeredPrayer.trim()) { showToast(t('fasting.journalEmpty'), '⚠️'); return }
    addFastingJournalEntry(e.id, { reflection: reflection.trim(), lesson: lesson.trim(), answeredPrayer: answeredPrayer.trim() })
    setReflection(''); setLesson(''); setAnsweredPrayer(''); setJournalOpen(false)
  }

  const finishFast = async () => {
    setReviewing(true)
    const review = await services.reviewFastingJourney({ ...e, languageLabel: langLabel })
    setReviewing(false)
    if (review) { setEndReview(review); completeFastingJourney(e.id, review) }
    else showToast(t('fasting.reviewError'), '❌')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            {e.date} · {e.fastType} · {e.duration}
            {e.completed ? ` · ✅ ${t('fasting.completedTag')}` : ''}
          </div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{e.goal}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="tag tag-gold" style={{ fontSize: 11 }}>
              🔥 {t('fasting.streakLabel', { count: streak })}
            </span>
            {!e.completed && !loggedToday && (
              <button onClick={() => logFastingDay(e.id)} className="btn btn-gold btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                ✅ {t('fasting.logToday')}
              </button>
            )}
            {!e.completed && loggedToday && (
              <span style={{ fontSize: 12, color: 'var(--sage-600)' }}>{t('fasting.todayLogged')}</span>
            )}
            {!e.completed && (
              <button onClick={() => setJournalOpen(o => !o)} className="btn btn-outline btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>
                📓 {t('fasting.addReflection')}
              </button>
            )}
          </div>
        </div>
        <button onClick={async () => {
          if (await confirmAction(t('fasting.deleteConfirm'), { tone: 'danger', confirmLabel: t('delete') }))
            deleteFastingEntry(e.id)
        }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)' }}>
          🗑
        </button>
      </div>

      {journalOpen && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea className="textarea-field" rows={2} placeholder={t('fasting.journalReflectionPlaceholder')} value={reflection} onChange={e2 => setReflection(e2.target.value)} />
          <textarea className="textarea-field" rows={2} placeholder={t('fasting.journalLessonPlaceholder')} value={lesson} onChange={e2 => setLesson(e2.target.value)} />
          <input className="input-field" placeholder={t('fasting.journalAnsweredPlaceholder')} value={answeredPrayer} onChange={e2 => setAnsweredPrayer(e2.target.value)} />
          <button onClick={saveJournal} className="btn btn-gold btn-sm" style={{ alignSelf: 'flex-start' }}>{t('fasting.saveJournal')}</button>
        </div>
      )}

      {(e.journal || []).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {t('fasting.journalLabel')} ({e.journal.length})
          </div>
          {e.journal.slice(0, 5).map((j, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{j.date}</span>
              {j.reflection && <p>{j.reflection}</p>}
              {j.lesson && <p style={{ color: 'var(--text-muted)' }}>{t('fasting.lessonPrefix')} {j.lesson}</p>}
              {j.answeredPrayer && <p style={{ color: 'var(--sage-600)' }}>🙏 {t('fasting.answeredPrefix')} {j.answeredPrayer}</p>}
            </div>
          ))}
        </div>
      )}

      {!e.completed && (e.daysCompleted || []).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={finishFast} disabled={reviewing} className="btn btn-primary btn-sm">
            {reviewing ? t('fasting.reviewing') : t('fasting.completeButton')}
          </button>
        </div>
      )}

      {endReview && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', background: 'var(--sage-100)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{endReview.summary}</p>
          {endReview.answeredPrayers?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sage-600)', marginBottom: 4 }}>{t('fasting.answeredPrayersLabel')}</div>
              {endReview.answeredPrayers.map((p, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>• {p}</p>)}
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7 }}>{endReview.encouragement}</p>
        </div>
      )}
    </div>
  )
}