import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
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
  // If today isn't logged yet, start counting from yesterday so opening
  // today still shows an accurate "so far" streak instead of dropping to 0.
  if (!dates.has(todayStr)) cursor.setDate(cursor.getDate()-1)
  while (true) {
    const ds = cursor.toISOString().split('T')[0]
    if (!dates.has(ds)) break
    streak++
    cursor.setDate(cursor.getDate()-1)
  }
  return streak
}

export default function DevotionalPage(){
  const { t } = useTranslation()
  const { showToast, devotionals, saveDevotional, user, setActivePage, setPendingChapter } = useApp()
  const { ask, loading } = useAI()
  const services = useAIServices(ask)
  const [tran, setTran] = useState(user.translation || 'KJV')
  const [lang, setLang] = useState(user.language||'en')
  const [devotional, setDevotional] = useState(null)
  const [genLoading, setGenLoading] = useState(false)
  const [view, setView] = useState('today')

  const today = new Date().toISOString().split('T')[0]
  const existing = devotionals.find(d=>d.date===today && d.translation===tran && d.language===lang)

  useEffect(()=>{ if(existing) setDevotional(existing) }, [existing])

  const generate = async () => {
    setGenLoading(true)
    try {
      const seed = todayVerseSeed()
      const chapter = await fetchChapter(seed.book, seed.ch, tran)
      const verse = chapter.verses?.find(v=>v.v===seed.verseNum) || chapter.verses?.[0]
      if (!verse) { showToast('Could not load today\'s verse', '❌'); setGenLoading(false); return }
      const verseRef = `${seed.book} ${seed.ch}:${verse.v}`
      const langLabel = RESPONSE_LANGUAGES.find(l=>l.code===lang)?.label || 'English'
      const r = await services.generateDevotional({ verseRef, verseText: verse.text, translation: tran, languageLabel: langLabel })
      if (r) {
        const entry = saveDevotional({ ...r, translation: tran, language: lang, date: today })
        setDevotional(entry)
        showToast('Devotional ready', '📖')
      } else showToast('Could not generate right now — please try again in a moment', '❌')
    } finally { setGenLoading(false) }
  }

  const past = devotionals.filter(d=>d.date!==today).sort((a,b)=>b.date.localeCompare(a.date))
  const streak = computeStreak(devotionals)

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <RevealCard>
        <div className="card-gold" style={{ padding:26, display:'flex', justifyContent:'space-between', alignItems:'flex-end', flexWrap:'wrap', gap:12 }}>
          <div>
            <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>{t('devotionalTag')}</div>
            <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(20px,3vw,28px)', fontWeight:500, color:'var(--ink-900)' }}>
              {new Date().toLocaleDateString(({ en:'en-US', fr:'fr-FR', es:'es-ES', pcm:'en-NG', yo:'en-NG', ig:'en-NG' })[lang] || 'en-US',{ weekday:'long', month:'long', day:'numeric' })}
            </h1>
          </div>
          {streak>0 && (
            <div style={{display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.55)',border:'1px solid var(--border-gold)',borderRadius:14,padding:'8px 14px'}}>
              <span style={{fontSize:20}}>🔥</span>
              <div>
                <div style={{fontSize:16,fontWeight:700,color:'var(--gold-800)',lineHeight:1}}>{streak}</div>
                <div style={{fontSize:10,color:'var(--gold-700)',textTransform:'uppercase',letterSpacing:'0.04em'}}>{t('dayStreakLabel')}</div>
              </div>
            </div>
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
                    <label className="input-label">Translation</label>
                    <select className="select-field" value={tran} onChange={e=>setTran(e.target.value)}>
                      {TRANSLATIONS.map(tr=><option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                    </select>
                  </div>
                  <div className="input-group">
                    <label className="input-label">Language</label>
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
                <span className="verse-ref" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border-gold)'}} title={t('verseActionGoToBible')} onClick={()=>{
                  const m = devotional.verseRef?.match(/^(.+?)\s+(\d+):(\d+)/)
                  if(!m){showToast('Could not open this reference','⚠️');return}
                  setPendingChapter({bookName:m[1].trim(),chapter:parseInt(m[2],10),verse:parseInt(m[3],10),translation:devotional.translation||'KJV'})
                  setActivePage('bible')
                }}>{devotional.verseRef} · {devotional.translation}</span>
                <p className="verse-text">{devotional.verseText}</p>
              </div>
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
              <div className="card">
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:8 }}>{t('todayApplication')}</div>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7, fontWeight:500 }}>{devotional.application}</p>
              </div>
              <div className="card" style={{ background:'var(--sage-100)' }}>
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--sage-600)', marginBottom:8 }}>🙏 {t('prayer')}</div>
                <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75, fontStyle:'italic' }}>{devotional.prayer}</p>
              </div>
              <div className="card-dark">
                <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-300)', marginBottom:8 }}>🕊 Declaration</div>
                <p style={{ fontFamily:'var(--font-serif)', fontSize:17, fontStyle:'italic', color:'rgba(250,247,242,0.92)', lineHeight:1.7 }}>{devotional.declaration}</p>
              </div>
            </motion.div>
          )}
        </>
      )}

      {view==='past' && (
        past.length===0
          ? <EmptyState icon="📚" headline={t('noPastDevotionalsTitle')} body={t('noPastDevotionalsBody')} />
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {past.map(d=>(
                <div key={d.id} className="card">
                  <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{d.date}</div>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:2 }}>{d.title}</div>
                  <div style={{ fontSize:12, color:'var(--gold-700)' }}>{d.verseRef}</div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}