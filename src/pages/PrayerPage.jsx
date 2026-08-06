import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAI } from '@/lib/useAI'
import { languageLabelFor } from '@/lib/aiServices'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { TRANSLATIONS, parseVerseResponse, dailyBackgroundImage } from '@/lib/bibleData'
import { verifyReference } from '@/services/bibleApi'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import { LoadingPulse } from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'

const CATS=['Personal','Family','Healing','Work','Finance','Spiritual growth','Thanksgiving','Intercession','Church','Nation']
const STATUS_COLORS={praying:'var(--gold-500)',answered:'var(--sage-500)',archived:'var(--ink-300)'}
const STATUS_EMOJI={praying:'🙏',answered:'✅',archived:'📁'}

export default function PrayerPage(){
  const { t } = useTranslation()
  const {prayers,addPrayer,updatePrayer,deletePrayer,showToast,user,pendingVerse,setPendingVerse,confirmAction,setActivePage,setPendingChapter}=useApp()
  const [mode,setMode]=useState('journal')
  const [tab,setTab]=useState('Active')
  const [showForm,setShowForm]=useState(false)
  const [title,setTitle]=useState('')
  const [body,setBody]=useState('')
  const [cat,setCat]=useState('Personal')
  const [urgency,setUrgency]=useState('normal')

  useEffect(() => {
    if (!pendingVerse) return
    setBody(`${pendingVerse.ref} — ${pendingVerse.text}\n\nLord, `)
    setShowForm(true)
    setPendingVerse(null)
    showToast(`${pendingVerse.ref} added to your prayer`, '📎')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVerse])
  const [tran,setTran]=useState(user.translation||'KJV')
  const [scriptures,setScriptures]=useState([])
  const [expanded,setExpanded]=useState(null)
  const [aiNote,setAiNote]=useState({})
  const {getPrayerScripture,ask,loading,error}=useAI()

  const filtered=prayers.filter(p=>
    tab==='Active'?p.status==='praying':
    tab==='Answered'?p.status==='answered':
    true
  )

  const submit=async()=>{
    if(body.trim().length<5){ showToast(t('writeMorePrayer'), '⚠️'); return }
    addPrayer({title:title||body.slice(0,40)+'…',text:body.trim(),category:cat,urgency,visibility:mode==='desk'?'church_team':'private'})
    showToast(t('prayerLogged'),'🙏')
    const raw=await getPrayerScripture({prayerText:body.trim(),translation:tran,languageLabel:languageLabelFor(user.language)})
    if(raw){
      const v=parseVerseResponse(raw)
      setScriptures(v.map(x=>({...x,verifyStatus:'checking'})))
      const verified = await Promise.all(v.map(async x=>{
        const result = await verifyReference(x.ref, tran)
        return result.verified
          ? {...x, text: result.text, ref: result.reference, verifyStatus:'verified'}
          : {...x, verifyStatus:'unverified'}
      }))
      setScriptures(verified)
    } else {
      showToast(error || 'Could not fetch a scripture for this prayer right now', '❌')
    }
    setTitle('');setBody('');setShowForm(false)
  }

  const genEncouragement=async(p)=>{
    const raw=await ask(`Generate a short pastoral encouragement message for someone with this prayer request: "${p.text}". Be warm, scripture-based, 2-3 sentences. Plain text only.${languageLabelFor(user.language)!=='English'?` Respond fully in ${languageLabelFor(user.language)}.`:''}`)
    if(raw){
      setAiNote(n=>({...n,[p.id]:raw}))
    } else {
      showToast(error || t('aiRequestFailed'), '❌')
    }
  }

  const shareWA=(p)=>{
    const msg=`🙏 *Prayer Request*\n\n${p.title}\n\n${p.text}\n\n${p.category} · ${p.date}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`,'_blank')
    showToast(t('shareToWhatsApp'),'💬')
  }

  const stats={total:prayers.length,answered:prayers.filter(p=>p.status==='answered').length,praying:prayers.filter(p=>p.status==='praying').length}

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <RevealCard>
        <div style={{borderRadius:24,overflow:'hidden',position:'relative',minHeight:160}}>
          <img src={dailyBackgroundImage('prayer',900,600)} alt="Prayer" style={{width:'100%',height:180,objectFit:'cover',objectPosition:'center 30%'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(135deg,rgba(28,23,16,0.88) 0%,rgba(28,23,16,0.35) 100%)',display:'flex',alignItems:'flex-end',padding:24}}>
            <div>
              <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--gold-300)',marginBottom:8}}>✦ {mode==='desk'?t('prayerDesk'):t('prayerJournal')}</div>
              <MotionHeadline text={t('prayerTitle')} as="h1" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(18px,3vw,28px)',fontWeight:400,color:'rgba(250,247,242,0.95)',lineHeight:1.2}}/>
            </div>
          </div>
        </div>
      </RevealCard>

      {/* Mode toggle */}
      <RevealCard delay={0.05}>
        <div style={{display:'flex',gap:0,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:12,padding:4}}>
          {[['journal', t('prayerJournal')],['desk', t('prayerDesk')]].map(([m,label])=>(
            <button key={m} onClick={()=>setMode(m)} style={{flex:1,padding:'8px 12px',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',background:mode===m?'var(--ink-900)':'transparent',color:mode===m?'var(--text-inverse)':'var(--text-muted)',border:'none',transition:'all var(--dur-fast) ease'}}>
              {label}
            </button>
          ))}
        </div>
        {mode==='desk'&&<div style={{marginTop:12,padding:'10px 14px',background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,fontSize:12,color:'var(--gold-800)',lineHeight:1.6}}>{t('prayerDeskDesc')}</div>}
      </RevealCard>

      {/* Stats */}
      <RevealCard delay={0.08}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {[{n:stats.total,l:t('totalPrayers'),e:'🙏'},{n:stats.praying,l:t('activePrayers'),e:'💫'},{n:stats.answered,l:t('answeredPrayers'),e:'✅'}].map(s=>(
            <div key={s.l} className="stat-card">
              <div style={{fontSize:24,marginBottom:4}}>{s.e}</div>
              <div className="stat-number" style={{fontSize:28}}>{s.n}</div>
              <div className="stat-label">{s.l}</div>
            </div>
          ))}
        </div>
      </RevealCard>

      {/* Add button */}
      <MagneticBtn onClick={()=>setShowForm(f=>!f)} className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',gap:10}}>
        {showForm?<>{t('closeForm')}</>:<>{mode==='desk'?t('addPrayerBtn'):t('logPrayerBtn')}</>}
      </MagneticBtn>

      {/* Form */}
      <AnimatePresence>
        {showForm&&(
          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}>
            <div className="card-elevated" style={{display:'flex',flexDirection:'column',gap:16}}>
              <h3 style={{fontFamily:'var(--font-serif)',fontSize:20,fontWeight:500}}>{mode==='desk'?t('newPrayerRequest'):t('logPrayer')}</h3>
              <div className="input-group">
                <label className="input-label">{t('prayerTitleLabel')}</label>
                <input className="input-field" placeholder="e.g. Healing for my mother" value={title} onChange={e=>setTitle(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('prayerTextLabel')}</label>
                <textarea className="textarea-field" rows={4} placeholder="Write your prayer request, intercession, or praise report…" value={body} onChange={e=>setBody(e.target.value)}/>
              </div>
              <div className="grid-2" style={{gap:12}}>
                <div className="input-group">
                  <label className="input-label">{t('prayerCategory')}</label>
                  <select className="select-field" value={cat} onChange={e=>setCat(e.target.value)}>{CATS.map(c=><option key={c}>{c}</option>)}</select>
                </div>
                {mode==='desk'&&(
                  <div className="input-group">
                    <label className="input-label">{t('prayerUrgency')}</label>
                    <select className="select-field" value={urgency} onChange={e=>setUrgency(e.target.value)}>
                      <option value="normal">Normal</option>
                      <option value="urgent">{t('urgent')}</option>
                    </select>
                  </div>
                )}
                <div className="input-group">
                  <label className="input-label">{t('prayerTranslation')}</label>
                  <select className="select-field" value={tran} onChange={e=>setTran(e.target.value)}>{TRANSLATIONS.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}</select>
                </div>
              </div>
              <div style={{display:'flex',gap:10}}>
                <MagneticBtn onClick={submit} disabled={body.trim().length<5||loading} className="btn btn-gold" style={{flex:1,justifyContent:'center',gap:8}}>
                  {loading?<><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>{t('findingScripture')}</>:<>{t('logThisPrayer')}</>}
                </MagneticBtn>
                <button onClick={()=>setShowForm(false)} className="btn btn-outline">{t('close')}</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scriptures returned */}
      <AnimatePresence>
        {scriptures.length>0&&(
          <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:10}}>
            <div style={{fontSize:13,fontWeight:500,color:'var(--text-secondary)',display:'flex',alignItems:'center',gap:8}}>{t('scriptureToStandOn')}</div>
            {scriptures.slice(0,2).map((v,i)=>(
              <div key={i} style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:16,padding:20}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:6}}>
                  <div className="verse-ref" style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border-gold)'}} title={t('verseActionGoToBible')} onClick={()=>{
                    const m = v.ref?.match(/^(.+?)\s+(\d+):(\d+)/)
                    if(!m){showToast('Could not open this reference','⚠️');return}
                    setPendingChapter({bookName:m[1].trim(),chapter:parseInt(m[2],10),verse:parseInt(m[3],10),translation:v.translation||'KJV'})
                    setActivePage('bible')
                  }}>{v.ref} · {v.translation}</div>
                  <VerifiedBadge status={v.verifyStatus||'checking'}/>
                </div>
                <p style={{fontFamily:'var(--font-serif)',fontSize:15,fontStyle:'italic',lineHeight:1.75,color:'var(--text-secondary)',margin:'8px 0'}}>{v.text}</p>
                {v.note&&<p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.6}}>{v.note}</p>}
              </div>
            ))}
            <button onClick={()=>setScriptures([])} className="btn btn-ghost btn-sm" style={{alignSelf:'flex-end'}}>Dismiss ×</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div style={{display:'flex',gap:0,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:12,padding:4,width:'fit-content'}}>
        {['Active','Answered','All'].map(tabKey=>{
          const label = tabKey === 'Active' ? t('activePrayers') : tabKey === 'Answered' ? t('answeredPrayers') : 'All'
          return (
            <button key={tabKey} onClick={()=>setTab(tabKey)} style={{padding:'6px 16px',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabKey?'var(--ink-900)':'transparent',color:tab===tabKey?'var(--text-inverse)':'var(--text-muted)',border:'none',transition:'all var(--dur-fast) ease'}}>
              {label}{tabKey==='Active'&&stats.praying>0&&<span style={{marginLeft:5,background:'var(--gold-500)',color:'var(--ink-900)',borderRadius:10,padding:'1px 6px',fontSize:10}}>{stats.praying}</span>}
            </button>
          )
        })}
      </div>

      {/* Prayer list */}
      {filtered.length===0
        ?<EmptyState icon="🙏" headline={tab==='Answered'?t('noAnswered'):t('prayerJourney')} body={tab==='Answered'?'When God moves, mark a prayer answered.':'Log your first request and receive scripture to stand on.'} ctaLabel={tab!=='Answered'?t('addPrayerCta'):undefined} onCta={tab!=='Answered'?()=>setShowForm(true):undefined}/>
        :<div style={{display:'flex',flexDirection:'column',gap:10}}>
          {filtered.map((p,i)=>(
            <motion.div key={p.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{padding:0,overflow:'hidden'}}>
              <button onClick={()=>setExpanded(expanded===p.id?null:p.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 16px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
                <div style={{width:36,height:36,borderRadius:'50%',flexShrink:0,background:p.status==='answered'?'var(--sage-100)':p.urgency==='urgent'?'var(--terra-100)':'var(--gold-100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18}}>
                  {STATUS_EMOJI[p.status]}
                </div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                  <div style={{display:'flex',gap:8,marginTop:3,alignItems:'center',flexWrap:'wrap'}}>
                    <span style={{fontSize:11,color:'var(--text-muted)'}}>{p.date}</span>
                    <span className={`tag ${p.status==='answered'?'tag-sage':'tag-gold'}`} style={{fontSize:10}}>{p.category}</span>
                    {p.urgency==='urgent'&&<span className="tag tag-terra" style={{fontSize:10}}>{t('urgent')}</span>}
                    {p.visibility==='church_team'&&<span className="tag tag-ink" style={{fontSize:10}}>{t('churchTag')}</span>}
                  </div>
                </div>
                <motion.span animate={{rotate:expanded===p.id?180:0}} style={{fontSize:12,color:'var(--text-muted)',flexShrink:0}}>▼</motion.span>
              </button>
              <AnimatePresence>
                {expanded===p.id&&(
                  <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
                    <div style={{padding:'0 16px 16px',borderTop:'1px solid var(--border-subtle)'}}>
                      <p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.7,margin:'12px 0'}}>{p.text}</p>
                      {p.followUpNotes&&<div style={{background:'var(--sage-100)',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:500,color:'var(--sage-600)',marginBottom:4}}>{t('followUpNote')}</div>
                        <p style={{fontSize:13,color:'var(--text-muted)'}}>{p.followUpNotes}</p>
                      </div>}
                      {p.testimony&&<div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:500,color:'var(--gold-700)',marginBottom:4}}>✨ Testimony</div>
                        <p style={{fontSize:13,color:'var(--text-secondary)',fontStyle:'italic'}}>{p.testimony}</p>
                      </div>}
                      {aiNote[p.id]&&<div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:'10px 14px',marginBottom:12}}>
                        <div style={{fontSize:11,fontWeight:500,color:'var(--gold-700)',marginBottom:4}}>{t('aiEncouragement')}</div>
                        <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.65}}>{aiNote[p.id]}</p>
                      </div>}
                      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                        {p.status==='praying'&&<button onClick={()=>{const testimony=prompt('Mark as answered — want to add a short testimony? (optional, leave blank to skip)');updatePrayer(p.id,{status:'answered',answeredDate:new Date().toISOString().split('T')[0],testimony:testimony||undefined})}} className="btn btn-sm" style={{background:'var(--sage-100)',color:'var(--sage-600)',border:'1px solid var(--sage-300)',gap:6}}>{t('markAnswered')}</button>}
                        <button onClick={()=>genEncouragement(p)} disabled={loading} className="btn btn-sm" style={{background:'var(--gold-100)',color:'var(--gold-700)',border:'1px solid var(--gold-300)',gap:6}}>{t('encouragement')}</button>
                        <button onClick={()=>shareWA(p)} className="btn btn-sm" style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',gap:6}}>{t('sharePrayer')}</button>
                        {mode==='desk'&&<>
                          <button onClick={()=>{const note=prompt('Follow-up note:');if(note)updatePrayer(p.id,{followUpNotes:note})}} className="btn btn-sm btn-outline">{t('followUp')}</button>
                        </>}
                        <button onClick={async()=>{if(await confirmAction('Delete this prayer?',{tone:'danger',confirmLabel:'Delete',detail:'This cannot be undone.'}))deletePrayer(p.id)}} style={{background:'none',border:'none',cursor:'pointer',fontSize:16,color:'var(--terra-400)',padding:'6px',marginLeft:'auto'}} title={t('delete')}>🗑</button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      }
    </div>
  )
}