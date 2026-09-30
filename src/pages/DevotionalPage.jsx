import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { useAIServices, RESPONSE_LANGUAGES } from '@/lib/aiServices'
import { TRANSLATIONS } from '@/lib/bibleData'
import { fetchChapter } from '@/services/bibleApi'
import { RevealCard, MagneticBtn } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'

const DAILY_REFS = [
  { book:'Psalms', ch:23 }, { book:'John', ch:3 }, { book:'Romans', ch:8 },
  { book:'Philippians', ch:4 }, { book:'Isaiah', ch:41 }, { book:'Proverbs', ch:3 },
  { book:'Psalms', ch:91 }, { book:'James', ch:1 }, { book:'1 Corinthians', ch:13 },
]

function todayVerseSeed(){
  const day = new Date().toISOString().split('T')[0]
  let hash = 0
  for (let i=0;i<day.length;i++) hash = (hash*31 + day.charCodeAt(i)) >>> 0
  const ref = DAILY_REFS[hash % DAILY_REFS.length]
  const verseNum = (hash % 12) + 1
  return { ...ref, verseNum, day }
}

function computeStreak(devotionals){
  const dates = new Set(devotionals.map(d=>d.date))
  const todayStr = new Date().toISOString().split('T')[0]
  let streak = 0
  let cursor = new Date()
  if (!dates.has(todayStr)) cursor.setDate(cursor.getDate()-1)
  while (true) {
    const ds = cursor.toISOString().split('T')[0]
    if (!dates.has(ds)) break
    streak++
    cursor.setDate(cursor.getDate()-1)
  }
  return streak
}

function computeStreakStats(devotionals){
  const dates = new Set(devotionals.map(d=>d.date))
  const todayStr = new Date().toISOString().split('T')[0]

  const allDates = [...dates].sort((a,b)=>b.localeCompare(a))
  const completedStreaks = []
  if (allDates.length) {
    let runStart = new Date(allDates[0])
    let runLen = 1
    for (let i=1;i<allDates.length;i++){
      const prevDay = new Date(runStart)
      prevDay.setDate(prevDay.getDate()-1)
      const expected = prevDay.toISOString().split('T')[0]
      if (allDates[i]===expected){
        runLen++
        runStart = prevDay
      } else {
        completedStreaks.push(runLen)
        runStart = new Date(allDates[i])
        runLen = 1
      }
    }
    completedStreaks.push(runLen)
  }

  const current = computeStreak(devotionals)
  const shortest = completedStreaks.length ? Math.min(...completedStreaks) : 0
  const longest = completedStreaks.length ? Math.max(...completedStreaks, current) : current

  const days = []
  const cursor = new Date()
  cursor.setDate(cursor.getDate()-20)
  for (let i=0;i<21;i++){
    const ds = cursor.toISOString().split('T')[0]
    days.push({ date: ds, day: cursor.getDate(), read: dates.has(ds), isToday: ds===todayStr })
    cursor.setDate(cursor.getDate()+1)
  }

  return { current, shortest, longest, days }
}

function StreakSheet({ devotionals, onClose, onReadToday, t }){
  const stats = computeStreakStats(devotionals)
  const weeks = [stats.days.slice(0,7), stats.days.slice(7,14), stats.days.slice(14,21)]
  return (
    <>
      <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose}
        style={{position:'fixed',inset:0,background:'rgba(28,23,16,0.6)',backdropFilter:'blur(4px)',zIndex:200}}/>
      <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:28,stiffness:300}}
        style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--ink-900)',borderRadius:'24px 24px 0 0',padding:'20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)',zIndex:300,maxHeight:'88vh',overflowY:'auto',color:'var(--text-inverse)'}}>
        <div style={{width:36,height:4,background:'rgba(255,255,255,0.2)',borderRadius:2,margin:'0 auto 20px'}}/>
        <div style={{textAlign:'center',marginBottom:24}}>
          <div style={{fontSize:52,lineHeight:1}}>🔥</div>
          <div style={{fontSize:26,fontWeight:700,marginTop:8}}>{stats.current} {stats.current===1?'day':'days'}</div>
          <div style={{fontSize:13,color:'rgba(250,247,242,0.6)',marginTop:4}}>
            {stats.current>0 ? "You've been reading — keep it up!" : t('logFirstRequest')}
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:24}}>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:14,padding:'16px 12px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700}}>{String(stats.shortest).padStart(2,'0')}</div>
            <div style={{fontSize:11,color:'rgba(250,247,242,0.55)',marginTop:4}}>Shortest Streak</div>
          </div>
          <div style={{background:'rgba(255,255,255,0.06)',borderRadius:14,padding:'16px 12px',textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:700}}>{String(stats.longest).padStart(2,'0')}</div>
            <div style={{fontSize:11,color:'rgba(250,247,242,0.55)',marginTop:4}}>Longest Streak</div>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:14,marginBottom:24}}>
          {weeks.map((wk,wi)=>(
            <div key={wi} style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:8}}>
              {wk.map(d=>(
                <div key={d.date} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6}}>
                  <div style={{width:32,height:32,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:15,background:d.read?'var(--gold-500)':'transparent',border:d.read?'none':'1px solid rgba(255,255,255,0.18)'}}>
                    {d.read?'🔥':''}
                  </div>
                  <div style={{fontSize:11,color:d.isToday?'var(--gold-400)':'rgba(250,247,242,0.5)',fontWeight:d.isToday?700:400}}>{d.day}</div>
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={onReadToday} className="btn btn-gold" style={{width:'100%',justifyContent:'center',padding:'14px'}}>
          {t('getTodayDevotional')}
        </button>
      </motion.div>
    </>
  )
}

export default function DevotionalPage(){
  const { t } = useTranslation()
  const { showToast, devotionals, saveDevotional, updateDevotionalNote, user, setActivePage, goToPage, setPendingChapter, reportPageContext, pendingResume, clearPendingResume } = useApp()
  const navigate = goToPage || setActivePage
  const { ask, loading } = useAI()
  const services = useAIServices(ask)
  const [tran, setTran] = useState(user.translation || 'KJV')
  const [lang, setLang] = useState(user.language||'en')
  const [devotional, setDevotional] = useState(null)
  const [genLoading, setGenLoading] = useState(false)
  const [view, setView] = useState('today')
  const [noteTab, setNoteTab] = useState('church')
  const [myNoteDraft, setMyNoteDraft] = useState('')
  const [showStreakSheet, setShowStreakSheet] = useState(false)
  const [quiz, setQuiz] = useState(null)
  const [quizRevealed, setQuizRevealed] = useState(false)
  const [quizLoading, setQuizLoading] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const existing = devotionals.find(d=>d.date===today && d.translation===tran && d.language===lang)

  useEffect(()=>{ if(existing) setDevotional(existing) }, [existing])
  useEffect(()=>{ setMyNoteDraft(devotional?.myNote || '') }, [devotional?.id])

  useEffect(()=>{
    if(!reportPageContext) return
    reportPageContext('devotional', { date: devotional?.date || today, view })
  },[devotional?.date, view])

  useEffect(()=>{
    if(!pendingResume || pendingResume.page!=='devotional') return
    const { date, view: v } = pendingResume.data || {}
    if (date && date!==today){
      const match = devotionals.find(d=>d.date===date)
      if (match) { setDevotional(match); setView('today') }
    } else if (v) {
      setView(v)
    }
    clearPendingResume?.()
  },[pendingResume])

  const generate = async () => {
    setGenLoading(true)
    try {
      const seed = todayVerseSeed()
      const chapter = await fetchChapter(seed.book, seed.ch, tran)
      const verse = chapter.verses?.find(v=>v.v===seed.verseNum) || chapter.verses?.[0]
      if (!verse) { showToast(t('couldNotLoadTodaysVerse'), '❌'); setGenLoading(false); return }
      const verseRef = `${seed.book} ${seed.ch}:${verse.v}`
      const langLabel = RESPONSE_LANGUAGES.find(l=>l.code===lang)?.label || 'English'
      const r = await services.generateDevotional({ verseRef, verseText: verse.text, translation: tran, languageLabel: langLabel })
      if (r) {
        const entry = saveDevotional({ ...r, translation: tran, language: lang, date: today })
        setDevotional(entry)
        showToast(t('devotionalReadyToast'), '📖')
      } else showToast(t('couldNotGenerateRightNow'), '❌')
    } finally { setGenLoading(false) }
  }

  const saveMyNote = () => {
    if (!devotional) return
    updateDevotionalNote(devotional.id, myNoteDraft)
    setDevotional(d=>d?{...d,myNote:myNoteDraft}:d)
  }

  const runQuiz = async () => {
    if (!devotional) return
    setQuizLoading(true); setQuiz(null); setQuizRevealed(false)
    try {
      const prompt = `Based on this devotional, write exactly one short reflection question that tests understanding of its main point, then on a new line the answer in one sentence. Format strictly as:\nQ: <question>\nA: <answer>\n\nDevotional title: ${devotional.title}\nVerse: ${devotional.verseRef} - ${devotional.verseText}\nReflection: ${devotional.reflection}\nApplication: ${devotional.application}`
      const r = await ask(prompt, 'fast')
      if (r) {
        const qm = r.match(/Q:\s*(.+)/i)
        const am = r.match(/A:\s*(.+)/i)
        if (qm && am) setQuiz({ question: qm[1].trim(), answer: am[1].trim() })
        else showToast(t('couldNotGenerateRightNow'), '❌')
      } else showToast(t('couldNotGenerateRightNow'), '❌')
    } finally { setQuizLoading(false) }
  }

  const openVerseInBible = () => {
    const m = devotional.verseRef?.match(/^(.+?)\s+(\d+):(\d+)/)
    if(!m){showToast(t('couldNotOpenReference'),'⚠️');return}
    setPendingChapter({bookName:m[1].trim(),chapter:parseInt(m[2],10),verse:parseInt(m[3],10),translation:devotional.translation||'KJV'})
    navigate('bible')
  }

  const discussWithAssistant = () => {
    navigate('agent')
  }

  const past = devotionals.filter(d=>d.date!==today).sort((a,b)=>b.date.localeCompare(a.date))
  const streak = computeStreak(devotionals)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <RevealCard>
        <div className="card-gold" style={{ padding:26, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>{t('devotionalTag')}</div>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(20px,3vw,28px)', fontWeight:500, color:'var(--text-primary)' }}>
              {new Date().toLocaleDateString(({ en:'en-US', fr:'fr-FR', es:'es-ES', pcm:'en-NG', yo:'en-NG', ig:'en-NG' })[lang] || 'en-US',{ weekday:'long', month:'long', day:'numeric' })}
            </h1>
          </div>
          {streak>0 && (
            <button onClick={()=>setShowStreakSheet(true)} style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.55)',border:'1px solid var(--border-gold)',borderRadius:14,padding:'8px 14px',cursor:'pointer'}}>
              <span style={{fontSize:20}}>🔥</span>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:16,fontWeight:700,color:'var(--gold-800)',lineHeight:1}}>{streak}</div>
                <div style={{fontSize:10,color:'var(--gold-700)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{t('dayStreakLabel')}</div>
              </div>
            </button>
          )}
        </div>
      </RevealCard>

      <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[['today','☀️ Today'],['past',`📚 Past (${past.length})`]].map(([m,label])=>(
          <button key={m} onClick={()=>setView(m)} style={{ padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:500, cursor:'pointer', background:view===m?'var(--ink-900)':'transparent', color:view===m?'var(--text-inverse)':'var(--text-muted)', border:'none' }}>
            {label}
          </button>
        ))}
      </div>

      {view==='today' && (
        <>
          {!devotional && (
            <RevealCard delay={0.05}>
              <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="grid-2">
                  <div className="input-group">
                    <label className="input-label">{t('translationFieldLabel')}</label>
                    <select className="select-field" value={tran} onChange={e=>setTran(e.target.value)}>
                      {TRANSLATIONS.map(tr=><option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">{t('languageFieldLabel')}</label>
                    <select className="select-field" value={lang} onChange={e=>setLang(e.target.value)}>
                      {RESPONSE_LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
                    </select>
                  </div>
                </div>
                <MagneticBtn onClick={generate} disabled={genLoading||loading} className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', gap:10 }}>
                  {genLoading ? <><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span> {t('preparingWord')}</> : <>{t('getTodayDevotional')}</>}
                </MagneticBtn>
              </div>
            </RevealCard>
          )}

          {devotional && (
            <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="verse-card">
                <span className="verse-ref" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border-gold)'}} title={t('verseActionGoToBible')} onClick={openVerseInBible}>{devotional.verseRef} · {devotional.translation}</span>
                <p className="verse-text">{devotional.verseText}</p>
              </div>

              <div style={{ display:'flex', gap:8 }}>
                {[['church','Church note'],['mine','My note'],['refs','References']].map(([m,label])=>(
                  <button key={m} onClick={()=>setNoteTab(m)} className={`btn btn-sm ${noteTab===m?'btn-gold':'btn-outline'}`}>{label}</button>
                ))}
              </div>

              {noteTab==='church' && (
                <div className="card-elevated">
                  <h2 style={{ fontFamily:'var(--font-serif)', fontSize:20, fontWeight:500, color:'var(--text-primary)', marginBottom:12 }}>{devotional.title}</h2>
                  <p style={{ fontSize:14.5, color:'var(--text-secondary)', lineHeight:1.8 }}>{devotional.reflection}</p>
                  {typeof window !== 'undefined' && window.speechSynthesis && (
                    <button onClick={() => {
                      window.speechSynthesis.cancel()
                      const full = [devotional.verseText, devotional.title, devotional.reflection, devotional.application, devotional.prayer].filter(Boolean).join('. ')
                      const utterance = new SpeechSynthesisUtterance(full)
                      utterance.rate = 0.95
                      window.speechSynthesis.speak(utterance)
                    }} className="btn btn-outline btn-sm" style={{ marginTop: 12 }}>🔊 Listen to today's devotional</button>
                  )}
                </div>
              )}

              {noteTab==='mine' && (
                <div className="card-elevated" style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)' }}>Your reflection — private, not generated content</div>
                  <textarea
                    value={myNoteDraft}
                    onChange={e=>setMyNoteDraft(e.target.value)}
                    onBlur={saveMyNote}
                    placeholder="What is this verse saying to you today?"
                    className="input-field"
                    style={{ minHeight:120, resize:'vertical', fontFamily:'var(--font-serif)', fontSize:15, lineHeight:1.7 }}
                  />
                  <button onClick={saveMyNote} className="btn btn-outline btn-sm" style={{ alignSelf:'flex-start' }}>Save note</button>
                </div>
              )}

              {noteTab==='refs' && (
                <div className="card-elevated">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>Referenced</div>
                  <div onClick={openVerseInBible} style={{ cursor:'pointer', padding:'10px 14px', borderRadius:10, background:'var(--gold-50)', border:'1px solid var(--border-gold)', display:'inline-block', fontSize:14, fontWeight:500, color:'var(--gold-800)' }}>
                    📖 {devotional.verseRef} · {devotional.translation}
                  </div>
                </div>
              )}

              <div className="card">
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>{t('todayApplication')}</div>
                <p style={{ fontSize:14, color:'var(--text-primary)', lineHeight:1.7, fontWeight:500 }}>{devotional.application}</p>
              </div>
              <div className="card" style={{ background:'var(--sage-100)' }}>
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--sage-600)', marginBottom:8 }}>🙏 {t('prayer')}</div>
                <p style={{ fontSize:14, color:'var(--sage-600)', lineHeight:1.75, fontStyle:'italic' }}>{devotional.prayer}</p>
              </div>
              <div className="card-dark">
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-300)', marginBottom:8 }}>🕊 Declaration</div>
                <p style={{ fontFamily:'var(--font-serif)', fontSize:17, fontStyle:'italic', color:'rgba(250,247,242,0.92)', lineHeight:1.7 }}>{devotional.declaration}</p>
              </div>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <button onClick={discussWithAssistant} className="btn btn-outline btn-sm">💬 Discuss with Assistant</button>
                <button onClick={runQuiz} disabled={quizLoading} className="btn btn-outline btn-sm">{quizLoading?'Building quiz…':'🧠 Quiz me on this'}</button>
              </div>

              {quiz && (
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} className="card" style={{ background:'var(--gold-50)', border:'1px solid var(--border-gold)' }}>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>Quiz</div>
                  <p style={{ fontSize:14.5, color:'var(--text-primary)', fontWeight:500, marginBottom:10 }}>{quiz.question}</p>
                  {!quizRevealed ? (
                    <button onClick={()=>setQuizRevealed(true)} className="btn btn-gold btn-sm">Reveal answer</button>
                  ) : (
                    <p style={{ fontSize:14, color:'var(--gold-800)', lineHeight:1.6 }}>{quiz.answer}</p>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}
        </>
      )}

      {view==='past' && (
        past.length===0
          ? <EmptyState icon="📚" headline={t('noPastDevotionalsTitle')} body={t('noPastDevotionalsBody')} />
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {past.map(d=>(
                <div key={d.id} className="card" style={{cursor:'pointer'}} onClick={()=>{setDevotional(d);setView('today')}}>
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{d.date}</div>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{d.title}</div>
                  <div style={{ fontSize:12, color:'var(--gold-700)' }}>{d.verseRef}</div>
                </div>
              ))}
            </div>
      )}

      <AnimatePresence>
        {showStreakSheet && (
          <StreakSheet
            devotionals={devotionals}
            t={t}
            onClose={()=>setShowStreakSheet(false)}
            onReadToday={()=>{ setShowStreakSheet(false); setView('today') }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}