// src/pages/SpiritualWarfarePage.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { useAIServices, RESPONSE_LANGUAGES } from '@/lib/aiServices'
import { TRANSLATIONS, dailyBackgroundImage } from '@/lib/bibleData'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { verifyReference } from '@/services/bibleApi'

const QUICK_SITUATIONS = [
  { key:'fear', emoji:'😰', labelKey:'warfareFear' },
  { key:'addiction', emoji:'⛓️', labelKey:'warfareAddiction' },
  { key:'financial', emoji:'💰', labelKey:'warfareFinancial' },
  { key:'sickness', emoji:'🩺', labelKey:'warfareSickness' },
  { key:'marriage', emoji:'💔', labelKey:'warfareMarriage' },
  { key:'depression', emoji:'🌧', labelKey:'warfareDepression' },
  { key:'unemployment', emoji:'📉', labelKey:'warfareUnemployment' },
  { key:'family', emoji:'👪', labelKey:'warfareFamily' },
]

export default function SpiritualWarfarePage(){
  const { t } = useTranslation()
  const { showToast, warfareEntries, saveWarfareEntry, deleteWarfareEntry, user, confirmAction, setActivePage, setPendingChapter } = useApp()
  const { ask, loading } = useAI()
  const services = useAIServices(ask)
  const [situation, setSituation] = useState('')
  const [tran, setTran] = useState(user.translation || 'KJV')
  const [lang, setLang] = useState(user.language||'en')
  const [result, setResult] = useState(null)
  const [view, setView] = useState('build')

  const langLabel = RESPONSE_LANGUAGES.find(l=>l.code===lang)?.label || 'English'

  const generate = async () => {
    if (!situation.trim()) { showToast(t('warfare.describeFirst'), '⚠️'); return }
    setResult(null)
    const r = await services.generateWarfare({ situation: situation.trim(), translation: tran, languageLabel: langLabel })
    if (r) {
      setResult(r)
      showToast(t('warfare.battlePlanReady'), '⚔️')
      if (r.battleScriptures?.length) {
        const verified = await Promise.all(r.battleScriptures.map(async v => {
          const res = await verifyReference(v.ref, tran)
          return res.verified ? {...v, text: res.text, ref: res.reference, verifyStatus:'verified'} : {...v, verifyStatus:'unverified'}
        }))
        setResult(prev => prev ? {...prev, battleScriptures: verified} : prev)
      }
    }
    else showToast(t('warfare.errorGenerating'), '❌')
  }

  const quickPick = (label) => { setSituation(t('warfare.quickPickTemplate', { label })) }

  const shareWA = () => {
    if (!result) return
    const msg = `${t('warfare.shareTitle', { situation })}\n\n${result.solution}\n\n*${t('warfare.shareDeclarations')}*\n${result.declarations?.map(d=>`✦ ${d}`).join('\n')}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    showToast(t('shareToWhatsApp'), '💬')
  }

  const save = () => { if (result) saveWarfareEntry({ situation, translation: tran, language: lang, ...result }) }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <RevealCard>
        <div style={{ borderRadius:24, overflow:'hidden', position:'relative', background:'var(--ink-900)', padding:28 }}>
          <img src={dailyBackgroundImage('warfare',900,600)} alt="" aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07}}/>
          <div style={{ position:'absolute', top:-40, right:-40, width:220, height:220, background:'radial-gradient(circle,rgba(212,168,75,0.18) 0%,transparent 70%)' }}/>
          <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold-300)', marginBottom:8 }}>{t('warfare.engineTag')}</div>
          <MotionHeadline text={t('warfare.headline')} as="h1" style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(20px,3vw,30px)', fontWeight:400, color:'rgba(250,247,242,0.95)', lineHeight:1.2 }}/>
          <p style={{ fontSize:13, color:'rgba(250,247,242,0.55)', marginTop:10, maxWidth:480, lineHeight:1.6 }}>
            {t('warfare.bannerDesc')}
          </p>
        </div>
      </RevealCard>

      <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          ['build', `⚔️ ${t('warfare.tabBuild')}`],
          ['library', `📁 ${t('warfare.tabSaved', { count: warfareEntries.length })}`]
        ].map(([m,label])=>(
          <button key={m} onClick={()=>setView(m)}
            style={{ padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:500, cursor:'pointer',
              background:view===m?'var(--ink-900)':'transparent',
              color:view===m?'var(--text-inverse)':'var(--text-muted)',
              border:'none', transition:'all var(--dur-fast) ease' }}>
            {label}
          </button>
        ))}
      </div>

      {view==='build' && (
        <>
          <RevealCard delay={0.05}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="input-group">
                <label className="input-label">{t('warfare.situationLabel')}</label>
                <textarea className="textarea-field" rows={4} placeholder={t('warfare.placeholder')}
                  value={situation} onChange={e=>setSituation(e.target.value)} />
              </div>
              <div>
                <div style={{ fontSize:12, fontWeight:500, color:'var(--text-muted)', marginBottom:8 }}>{t('warfare.commonBattleLabel')}</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {QUICK_SITUATIONS.map(q=>(
                    <button key={q.key} onClick={()=>quickPick(t(q.labelKey))} className="tag tag-gold" style={{ cursor:'pointer', padding:'7px 14px', fontSize:13 }}>
                      {q.emoji} {t(q.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2" style={{ gap:12 }}>
                <div className="input-group">
                  <label className="input-label">{t('scriptureTranslationLabel')}</label>
                  <select className="select-field" value={tran} onChange={e=>setTran(e.target.value)}>
                    {TRANSLATIONS.map(tr=><option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('responseLanguageLabel')}</label>
                  <select className="select-field" value={lang} onChange={e=>setLang(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l=><option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <MagneticBtn onClick={generate} disabled={!situation.trim()||loading} className="btn btn-primary btn-lg" style={{ width:'100%', justifyContent:'center', gap:10 }}>
                {loading ? <><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span> {t('warfare.loading')}</> : <>⚔️ {t('warfare.generateButton')}</>}
              </MagneticBtn>
            </div>
          </RevealCard>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0 }} style={{ display:'flex', flexDirection:'column', gap:16 }}>
                <div className="card-elevated">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>✦ {t('warfare.situationSummary')}</div>
                  <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>{result.situationSummary}</p>
                </div>

                <div className="card-gold">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>✦ {t('warfare.solutionLabel')}</div>
                  <p style={{ fontFamily:'var(--font-serif)', fontSize:16, fontStyle:'italic', color:'var(--text-secondary)', lineHeight:1.75 }}>{result.solution}</p>
                </div>

                <div>
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>⚔️ {t('warfare.battleScripturesLabel')}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {result.battleScriptures?.map((v,i)=>(
                      <div key={i} className="verse-card" style={{ padding:'18px 22px' }}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                          <span className="verse-ref" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border-gold)'}} title={t('verseActionGoToBible')} onClick={()=>{
                            const m = v.ref?.match(/^(.+?)\s+(\d+):(\d+)/)
                            if(!m){showToast(t('warfare.couldNotOpenRef'),'⚠️');return}
                            setPendingChapter({bookName:m[1].trim(),chapter:parseInt(m[2],10),verse:parseInt(m[3],10),translation:tran||'KJV'})
                            setActivePage('bible')
                          }}>{v.ref} · {tran}</span>
                          <VerifiedBadge status={v.verifyStatus||'checking'}/>
                        </div>
                        <p className="verse-text">{v.text}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>🕊 {t('warfare.declarationsLabel')}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {result.declarations?.map((d,i)=>(
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ color:'var(--gold-500)', fontSize:16, lineHeight:1.6 }}>✦</span>
                        <p style={{ fontSize:14.5, color:'var(--text-secondary)', lineHeight:1.7, fontWeight:500 }}>{d}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--text-muted)', marginBottom:10 }}>🙏 {t('warfare.prayerPointsLabel')}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    {result.prayerPoints?.map((p,i)=>(
                      <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                        <span style={{ color:'var(--terra-500)', fontSize:13, marginTop:2 }}>{i+1}.</span>
                        <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.7 }}>{p}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="card-dark">
                  <div style={{ fontSize:11, fontWeight:500, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--gold-300)', marginBottom:10 }}>🎯 {t('warfare.howToFightLabel')}</div>
                  <p style={{ fontSize:14, lineHeight:1.8, whiteSpace:'pre-wrap', color:'rgba(250,247,242,0.88)' }}>{result.howToFight}</p>
                </div>

                <div style={{ background:'var(--sage-100)', borderRadius:16, padding:20 }}>
                  <p style={{ fontSize:14, color:'var(--text-secondary)', lineHeight:1.75, fontStyle:'italic' }}>{result.encouragement}</p>
                </div>

                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <button onClick={save} className="btn btn-gold">🔖 {t('warfare.saveButton')}</button>
                  <button onClick={shareWA} className="btn btn-outline">💬 {t('whatsapp')}</button>
                  <button onClick={()=>{ setResult(null); setSituation('') }} className="btn btn-ghost">{t('warfare.startOver')}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {view==='library' && (
        warfareEntries.length===0
          ? <EmptyState icon="⚔️" headline={t('warfare.emptyHeadline')} body={t('warfare.emptyBody')} ctaLabel={t('warfare.emptyCta')} onCta={()=>setView('build')}/>
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {warfareEntries.map(e=>(
                <div key={e.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:12 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{e.date}</div>
                      <p style={{ fontSize:14, fontWeight:500, color:'var(--text-primary)' }}>{e.situationSummary || e.situation}</p>
                    </div>
                    <button onClick={async()=>{if(await confirmAction(t('warfare.deleteConfirm'),{tone:'danger',confirmLabel:t('delete')}))deleteWarfareEntry(e.id)}} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--terra-400)' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}