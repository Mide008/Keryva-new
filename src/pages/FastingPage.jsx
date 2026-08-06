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

const FAST_TYPES = [
  { key: 'partial', emoji: '🌅', label: 'Partial fast (sunrise to sunset)' },
  { key: 'daniel', emoji: '🥗', label: 'Daniel fast (fruits & vegetables)' },
  { key: 'full-day', emoji: '☀️', label: 'Full-day fast' },
  { key: 'multi-day', emoji: '📅', label: 'Multi-day fast' },
]
const DURATIONS = ['1 day', '3 days', '7 days', '21 days']

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
  const fastTypeLabel = FAST_TYPES.find(f => f.key === fastType)?.label || 'Partial fast'

  const generate = async () => {
    if (!goal.trim()) { showToast('Describe what this fast is for first', '⚠️'); return }
    setResult(null)
    const r = await services.generateFasting({ fastType: fastTypeLabel, duration, goal: goal.trim(), translation: tran, languageLabel: langLabel })
    if (r) {
      setResult(r)
      showToast('Fasting plan ready', '🍽')
      if (r.scriptures?.length) {
        const verified = await Promise.all(r.scriptures.map(async v => {
          const res = await verifyReference(v.ref, tran)
          return res.verified ? { ...v, text: res.text, ref: res.reference, verifyStatus: 'verified' } : { ...v, verifyStatus: 'unverified' }
        }))
        setResult(prev => prev ? { ...prev, scriptures: verified } : prev)
      }
    } else showToast('Could not build this right now — please try again in a moment', '❌')
  }

  const shareWA = () => {
    if (!result) return
    const msg = `🍽 *Fasting Plan — ${fastTypeLabel}, ${duration}*\n\n${result.purpose}\n\n*Breaking the fast:*\n${result.breakingTheFast}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    showToast(t('shareToWhatsApp'), '💬')
  }

  const save = () => { if (result) saveFastingEntry({ fastType: fastTypeLabel, duration, goal, translation: tran, language: lang, daysCompleted: [], ...result }) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <RevealCard>
        <div style={{ borderRadius: 24, overflow: 'hidden', position: 'relative', background: 'var(--ink-900)', padding: 28 }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 220, height: 220, background: 'radial-gradient(circle,rgba(212,168,75,0.18) 0%,transparent 70%)' }} />
          <div style={{ fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 8 }}>🍽 Fasting</div>
          <MotionHeadline text="Draw near to God through fasting and prayer." as="h1" style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(20px,3vw,30px)', fontWeight: 400, color: 'rgba(250,247,242,0.95)', lineHeight: 1.2 }} />
          <p style={{ fontSize: 13, color: 'rgba(250,247,242,0.55)', marginTop: 10, maxWidth: 480, lineHeight: 1.6 }}>
            Choose a fast type and goal — get scripture to stand on, a daily prayer focus, and practical guidance, then track each day you complete.
          </p>
        </div>
      </RevealCard>

      <div style={{ display: 'flex', gap: 0, background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[['build', '🍽 Build'], ['library', `📁 Saved (${fastingEntries.length})`]].map(([m, label]) => (
          <button key={m} onClick={() => setView(m)} style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 500, cursor: 'pointer', background: view === m ? 'var(--ink-900)' : 'transparent', color: view === m ? 'var(--text-inverse)' : 'var(--text-muted)', border: 'none', transition: 'all var(--dur-fast) ease' }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'build' && (
        <>
          <RevealCard delay={0.05}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Fast type</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {FAST_TYPES.map(f => (
                    <button key={f.key} onClick={() => setFastType(f.key)} className={`tag ${fastType === f.key ? 'tag-dark' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: fastType === f.key ? 600 : 400 }}>
                      {f.emoji} {f.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Duration</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {DURATIONS.map(d => (
                    <button key={d} onClick={() => setDuration(d)} className={`tag ${duration === d ? 'tag-gold' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13, fontWeight: duration === d ? 600 : 400 }}>
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <div className="input-group">
                <label className="input-label">What is this fast for?</label>
                <textarea className="textarea-field" rows={3} placeholder="e.g. Seeking breakthrough for my finances and clarity on a major decision"
                  value={goal} onChange={e => setGoal(e.target.value)} />
              </div>
              <div className="grid-2" style={{ gap: 12 }}>
                <div className="input-group">
                  <label className="input-label">Scripture translation</label>
                  <select className="select-field" value={tran} onChange={e => setTran(e.target.value)}>
                    {TRANSLATIONS.map(tr => <option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">Response language</label>
                  <select className="select-field" value={lang} onChange={e => setLang(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <MagneticBtn onClick={generate} disabled={!goal.trim() || loading} className="btn btn-primary btn-lg" style={{ width: '100%', justifyContent: 'center', gap: 10 }}>
                {loading ? <><span className="loading-dots"><span className="loading-dot" /><span className="loading-dot" /><span className="loading-dot" /></span> Building your fasting plan…</> : <>🍽 Get My Fasting Plan</>}
              </MagneticBtn>
            </div>
          </RevealCard>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="card-gold">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-700)', marginBottom: 8 }}>✦ Purpose</div>
                  <p style={{ fontFamily: 'var(--font-serif)', fontSize: 16, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.75 }}>{result.purpose}</p>
                </div>

                <div className="card-elevated">
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>What to expect</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>{result.whatToExpect}</p>
                </div>

                <div>
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>📖 Scriptures to stand on</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {result.scriptures?.map((v, i) => (
                      <div key={i} className="verse-card" style={{ padding: '18px 22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                          <span className="verse-ref" style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationColor: 'var(--border-gold)' }} title={t('verseActionGoToBible')} onClick={() => {
                            const m = v.ref?.match(/^(.+?)\s+(\d+):(\d+)/)
                            if (!m) { showToast('Could not open this reference', '⚠️'); return }
                            setPendingChapter({ bookName: m[1].trim(), chapter: parseInt(m[2], 10), verse: parseInt(m[3], 10), translation: tran || 'KJV' })
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
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>🙏 Daily Prayer Focus</div>
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
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>✅ Practical Tips</div>
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
                  <div style={{ fontSize: 11, fontWeight: 500, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: 10 }}>🍽 Breaking the Fast</div>
                  <p style={{ fontSize: 14, lineHeight: 1.8, color: 'rgba(250,247,242,0.88)' }}>{result.breakingTheFast}</p>
                </div>

                <div style={{ background: 'var(--sage-100)', borderRadius: 16, padding: 20 }}>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.75, fontStyle: 'italic' }}>{result.encouragement}</p>
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={save} className="btn btn-gold">🔖 Save Fasting Plan</button>
                  <button onClick={shareWA} className="btn btn-outline">💬 WhatsApp</button>
                  <button onClick={() => { setResult(null); setGoal('') }} className="btn btn-ghost">Start over</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {view === 'library' && (
        fastingEntries.length === 0
          ? <EmptyState icon="🍽" headline="No fasting plans saved yet." body="Build one above and track your days as you go." ctaLabel="Build one now" onCta={() => setView('build')} />
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
    if (!reflection.trim() && !lesson.trim() && !answeredPrayer.trim()) { showToast('Write something first', '⚠️'); return }
    addFastingJournalEntry(e.id, { reflection: reflection.trim(), lesson: lesson.trim(), answeredPrayer: answeredPrayer.trim() })
    setReflection(''); setLesson(''); setAnsweredPrayer(''); setJournalOpen(false)
  }

  const finishFast = async () => {
    setReviewing(true)
    const review = await services.reviewFastingJourney({ ...e, languageLabel: langLabel })
    setReviewing(false)
    if (review) { setEndReview(review); completeFastingJourney(e.id, review) }
    else showToast('Could not build the review right now — please try again', '❌')
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>{e.date} · {e.fastType} · {e.duration}{e.completed ? ' · ✅ Completed' : ''}</div>
          <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{e.goal}</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="tag tag-gold" style={{ fontSize: 11 }}>🔥 {streak} day{streak === 1 ? '' : 's'} streak</span>
            {!e.completed && !loggedToday && <button onClick={() => logFastingDay(e.id)} className="btn btn-gold btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>✅ Log today</button>}
            {!e.completed && loggedToday && <span style={{ fontSize: 12, color: 'var(--sage-600)' }}>Today logged ✓</span>}
            {!e.completed && <button onClick={() => setJournalOpen(o => !o)} className="btn btn-outline btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>📓 Add reflection</button>}
          </div>
        </div>
        <button onClick={async () => { if (await confirmAction('Delete this fasting plan?', { tone: 'danger', confirmLabel: 'Delete' })) deleteFastingEntry(e.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)' }}>🗑</button>
      </div>

      {journalOpen && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea className="textarea-field" rows={2} placeholder="Today's reflection…" value={reflection} onChange={e2 => setReflection(e2.target.value)} />
          <textarea className="textarea-field" rows={2} placeholder="A lesson you're taking from today (optional)…" value={lesson} onChange={e2 => setLesson(e2.target.value)} />
          <input className="input-field" placeholder="An answered prayer today (optional)…" value={answeredPrayer} onChange={e2 => setAnsweredPrayer(e2.target.value)} />
          <button onClick={saveJournal} className="btn btn-gold btn-sm" style={{ alignSelf: 'flex-start' }}>Save reflection</button>
        </div>
      )}

      {(e.journal || []).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Journal ({e.journal.length})</div>
          {e.journal.slice(0, 5).map((j, i) => (
            <div key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
              <span style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>{j.date}</span>
              {j.reflection && <p>{j.reflection}</p>}
              {j.lesson && <p style={{ color: 'var(--text-muted)' }}>Lesson: {j.lesson}</p>}
              {j.answeredPrayer && <p style={{ color: 'var(--sage-600)' }}>🙏 Answered: {j.answeredPrayer}</p>}
            </div>
          ))}
        </div>
      )}

      {!e.completed && (e.daysCompleted || []).length > 0 && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)' }}>
          <button onClick={finishFast} disabled={reviewing} className="btn btn-primary btn-sm">
            {reviewing ? 'Building your review…' : '🙌 Complete fast & get review'}
          </button>
        </div>
      )}

      {endReview && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border-subtle)', background: 'var(--sage-100)', borderRadius: 12, padding: 16 }}>
          <p style={{ fontSize: 13.5, fontStyle: 'italic', color: 'var(--text-secondary)', lineHeight: 1.7 }}>{endReview.summary}</p>
          {endReview.answeredPrayers?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--sage-600)', marginBottom: 4 }}>Answered prayers</div>
              {endReview.answeredPrayers.map((p, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)' }}>• {p}</p>)}
            </div>
          )}
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.7 }}>{endReview.encouragement}</p>
        </div>
      )}
    </div>
  )
}