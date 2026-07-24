import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon3D from '@/components/ui/Icon3D'
import { useAI } from '@/lib/useAI'
import { languageLabelFor } from '@/lib/aiServices'
import { useAIServices } from '@/lib/aiServices'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { TRANSLATIONS, dailyBackgroundImage } from '@/lib/bibleData'
import { LoadingPulse } from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'
import { tryConsume } from '@/lib/usageLimits'
import UsageBadge from '@/components/ui/UsageBadge'

const AUD=['General congregation','Youth service','Leaders & ministers',"Women's meeting",'Evangelistic / outreach','Children / Sunday school','New believers','Funeral service','Wedding service','Bible study']
const DEN=['Pentecostal / Charismatic','Anglican / Episcopal','Baptist','Catholic-friendly','Evangelical','Teaching','Prophetic','Youth-friendly']
const LEN=['10-minute message','20-minute message','30-minute message','45-minute sermon','60-minute sermon']
const TONE=['Teaching','Inspirational','Evangelistic','Pastoral','Revival']

function copyText(t, showToast) { navigator.clipboard.writeText(t).catch(()=>{}); showToast(showToast, '📋') }
function shareWA(t, showToast) { window.open(`https://wa.me/?text=${encodeURIComponent(t)}`,'_blank'); showToast(showToast, '💬') }

export default function SermonPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('build')
  const [form, setForm] = useState({ topic:'', scripture:'', audience:'General congregation', denomination:'Pentecostal / Charismatic', length:'45-minute sermon', tone:'Inspirational', translation:'KJV' })
  const [sermon, setSermon] = useState(null)
  const [improving, setImproving] = useState(null)
  const [preachMode, setPreachMode] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [timerOn, setTimerOn] = useState(false)
  const { ask, loading } = useAI()
  const ai = useAIServices(ask)
  const { user, sermons, saveSermon, deleteSermon, showToast, setActivePage, pendingVerse, setPendingVerse, confirmAction } = useApp()

  useEffect(() => {
    if (!pendingVerse) return
    setForm(f => ({ ...f, scripture: `${pendingVerse.ref} — ${pendingVerse.text}` }))
    setPendingVerse(null)
    showToast(`${pendingVerse.ref} added to Sermon Studio`, '📎')
  }, [pendingVerse])

  useEffect(() => {
    if (!timerOn) return
    const id = setInterval(() => setElapsed(e => e + 1), 1000)
    return () => clearInterval(id)
  }, [timerOn])

  const upd = (k,v) => setForm(f=>({...f,[k]:v}))

  const generate = async () => {
    if (!form.topic.trim()) { showToast(t('enterTopic'), '⚠️'); return }
    const gate = tryConsume('sermon')
    if (!gate.allowed) { showToast("You've reached today's free sermon limit. Come back tomorrow, or your saved sermons remain fully available.", '⏳'); return }
    setSermon(null)
    const r = await ai.generateSermon({ ...form, languageLabel: languageLabelFor(user.language) })
    if (r) { setSermon(r); setTab('edit'); showToast(t('sermonGenerated'), '🎙') }
    else showToast(t('errorParsing'), '❌')
  }

  const improve = async (section, current) => {
    setImproving(section)
    const r = await ai.improveSection(section, current, form)
    if (r) setSermon(s => ({...s, [section]: r}))
    setImproving(null)
  }

  const makeNigerian = async () => {
    setImproving('nigerian')
    const r = await ai.nigerianContext(sermon?.introduction || '')
    if (r) setSermon(s => ({...s, introduction: r}))
    setImproving(null)
    showToast(t('nigerianContext'), '🇳🇬')
  }

  const makeYouth = async () => {
    setImproving('youth')
    const r = await ai.youthSimplify(sermon?.introduction || '')
    if (r) setSermon(s => ({...s, introduction: r}))
    setImproving(null)
    showToast(t('youthVersion'), '🔥')
  }

  const getPreachNotes = async () => {
    setImproving('notes')
    const r = await ai.preachingNotes(sermon)
    if (r) setSermon(s => ({...s, preachingNotes: r}))
    setImproving(null)
    showToast(t('preachingNotes'), '📝')
  }

  const save = () => {
    saveSermon({ ...form, content: sermon, status: 'completed', id: Date.now() })
    showToast(t('sermonSaved'), '📖')
  }

  const fullText = () => sermon ? `${sermon.title}\n\nTheme: ${sermon.theme}\nScripture: ${sermon.mainText}\n\nINTRODUCTION\n${sermon.introduction}\n\n${sermon.points?.map((p,i)=>`POINT ${i+1}: ${p.title}\n${p.content}\n${p.scripture}`).join('\n\n')}\n\nAPPLICATION\n${sermon.application}\n\nALTAR CALL\n${sermon.altarCall}\n\nCLOSING PRAYER\n${sermon.closingPrayer}\n\nKeryva · OmniCraft Studios` : ''

  const downloadPDF = () => {
    if (!sermon) return
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sermon.title}</title>
      <style>
        body{font-family:Georgia,serif;max-width:680px;margin:40px auto;color:#1C1710;line-height:1.7;padding:0 20px}
        h1{font-size:26px;border-bottom:2px solid #D4A84B;padding-bottom:12px}
        h2{font-size:15px;text-transform:uppercase;letter-spacing:0.06em;color:#8A6217;margin-top:28px}
        p{font-size:14.5px}
        .meta{font-size:13px;color:#666;margin-bottom:20px}
        .footer{margin-top:40px;font-size:11px;color:#999;border-top:1px solid #ddd;padding-top:12px}
        @media print{body{margin:0;padding:20px}}
      </style></head><body>
      <h1>${sermon.title}</h1>
      <div class="meta">Theme: ${sermon.theme||''} &nbsp;·&nbsp; Scripture: ${sermon.mainText||''}</div>
      <h2>Introduction</h2><p>${(sermon.introduction||'').replace(/\n/g,'<br/>')}</p>
      ${(sermon.points||[]).map((p,i)=>`<h2>Point ${i+1}: ${p.title}</h2><p>${(p.content||'').replace(/\n/g,'<br/>')}</p><p><em>${p.scripture||''}</em></p>`).join('')}
      <h2>Application</h2><p>${(sermon.application||'').replace(/\n/g,'<br/>')}</p>
      <h2>Altar Call</h2><p>${(sermon.altarCall||'').replace(/\n/g,'<br/>')}</p>
      <h2>Closing Prayer</h2><p>${(sermon.closingPrayer||'').replace(/\n/g,'<br/>')}</p>
      <div class="footer">Please verify all scripture before preaching. Keryva · OmniCraft Studios</div>
      </body></html>`
    const win = window.open('', '_blank')
    if (!win) { showToast('Please allow pop-ups to download as PDF', '⚠️'); return }
    win.document.write(html)
    win.document.close()
    win.focus()
    setTimeout(()=>win.print(), 300)
  }

  const tabs = [
    {id:'build', label:t('buildTab')},
    {id:'edit', label:t('editTab')},
    {id:'library', label:`${t('libraryTab')} (${sermons.length})`}
  ]

  return (
    <div style={{maxWidth:780,margin:'0 auto'}}>
      {/* Header */}
      <RevealCard style={{marginBottom:24}}>
        <div style={{background:'var(--ink-900)',borderRadius:24,padding:'32px 36px',position:'relative',overflow:'hidden',display:'flex',alignItems:'center',gap:24}}>
          <img src={dailyBackgroundImage('sermon',900,600)} alt="" aria-hidden style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07}}/>
          <motion.div animate={{scale:[1,1.06,1]}} transition={{duration:3,repeat:Infinity}} style={{position:'relative',zIndex:1,flexShrink:0}}><Icon3D name="megaphone" tone="gold" active size={26} badgeSize={56}/></motion.div>
          <div style={{position:'relative',zIndex:1}}>
            <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--gold-400)',marginBottom:8}}>{t('ministryTools')}</div>
            <MotionHeadline text={t('rhemaSermonStudio')} as="h1" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(22px,3vw,30px)',fontWeight:400,color:'rgba(250,247,242,0.95)',marginBottom:6}}/>
            <p style={{fontSize:13,color:'rgba(250,247,242,0.44)',lineHeight:1.5}}>{t('sermonStudioDesc')}</p>
          </div>
        </div>
      </RevealCard>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'white',border:'1px solid var(--border-subtle)',borderRadius:14,padding:4,marginBottom:24,overflowX:'auto'}}>
        {tabs.map(tabItem=>(
          <button key={tabItem.id} onClick={()=>setTab(tabItem.id)}
            style={{padding:'8px 18px',borderRadius:10,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabItem.id?'var(--ink-900)':'transparent',color:tab===tabItem.id?'white':'var(--text-muted)',border:'none',transition:'all 0.15s',whiteSpace:'nowrap',flexShrink:0}}>
            {tabItem.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* BUILD TAB */}
        {tab==='build' && (
          <motion.div key="build" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            <div className="card" style={{display:'flex',flexDirection:'column',gap:18}}>
              <div className="input-group">
                <label className="input-label">{t('sermonTopicLabel')}</label>
                <input className="input-field" style={{fontSize:16}} placeholder={t('sermonTopicPlaceholder')} value={form.topic} onChange={e=>upd('topic',e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('mainScriptureLabel')}</label>
                <input className="input-field" placeholder={t('mainScripturePlaceholder')} value={form.scripture} onChange={e=>upd('scripture',e.target.value)}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
                {[
                  [t('audienceLabel'), AUD, 'audience'],
                  [t('preachingStyleLabel'), DEN, 'denomination'],
                  [t('messageLengthLabel'), LEN, 'length'],
                  [t('toneLabel'), TONE, 'tone']
                ].map(([label,opts,key])=>(
                  <div key={key} className="input-group">
                    <label className="input-label">{label}</label>
                    <select className="select-field" value={form[key]} onChange={e=>upd(key,e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select>
                  </div>
                ))}
              </div>
              <div className="input-group">
                <label className="input-label">{t('scriptureTranslationLabel')}</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                  {TRANSLATIONS.map(tr=>(
                    <button key={tr.code} title={tr.name} onClick={()=>upd('translation',tr.code)}
                      className={`tag ${form.translation===tr.code?'tag-dark':'tag-ink'}`}
                      style={{cursor:'pointer',padding:'5px 12px',fontSize:12,fontWeight:form.translation===tr.code?600:400}}>{tr.code}</button>
                  ))}
                </div>
              </div>
              <MagneticBtn onClick={generate} disabled={!form.topic.trim()||loading} className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',gap:10}}>
                {loading?<><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>{t('gatheringWord')}</>:<>🎙 {t('generateSermon')}</>}
              </MagneticBtn>
            </div>
            <AnimatePresence>{loading&&<LoadingPulse message={t('buildingSermon')}/>}</AnimatePresence>
          </motion.div>
        )}

        {/* EDIT TAB */}
        {tab==='edit' && (
          <motion.div key="edit" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {!sermon ? (
              <EmptyState icon="🎙" headline={t('noSermonYet')} body={t('goToBuild')} ctaLabel={t('buildSermon')} onCta={()=>setTab('build')}/>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:16}}>
                <div className="ai-disclaimer" role="note"><span>⚠️</span><span>{t('aiDisclaimer')}</span></div>

                {/* Quick actions */}
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {[
                    [t('saveAction'), save, 'btn-gold'],
                    [t('whatsappAction'), ()=>shareWA(fullText(), t('shareToWhatsApp')), 'btn-outline'],
                    [t('copyAllAction'), ()=>copyText(fullText(), t('copiedToast')), 'btn-outline'],
                    [t('nigerianContextAction'), makeNigerian, 'btn-outline'],
                    [t('youthVersionAction'), makeYouth, 'btn-outline'],
                    [t('preachingNotesAction'), getPreachNotes, 'btn-outline'],
                    [t('preachModeAction'), ()=>setPreachMode(true), 'btn-outline'],
                    ['📄 Download PDF', downloadPDF, 'btn-outline'],
                  ].map(([label,action,cls])=>(
                    <button key={label} onClick={action} disabled={improving!=null} className={`btn ${cls} btn-sm`} style={{gap:5}}>{label}</button>
                  ))}
                </div>

                {/* Sermon title & theme */}
                <SectionBox title={t('sermonTitleLabel')}>
                  <input className="input-field" style={{fontFamily:'var(--font-serif)',fontSize:20,fontWeight:500}} value={sermon.title||''} onChange={e=>setSermon(s=>({...s,title:e.target.value}))}/>
                  <input className="input-field" style={{marginTop:8,fontSize:13}} placeholder={t('themePlaceholder')} value={sermon.theme||''} onChange={e=>setSermon(s=>({...s,theme:e.target.value}))}/>
                  <div style={{marginTop:8,fontSize:13,color:'var(--gold-700)',fontWeight:500}}>{t('mainTextLabel')}: {sermon.mainText}</div>
                </SectionBox>

                {/* Introduction */}
                <EditableSection title={t('introductionLabel')} sectionKey="introduction" value={sermon.introduction||''} onChange={v=>setSermon(s=>({...s,introduction:v}))} onImprove={()=>improve('introduction',sermon.introduction||'')} improving={improving==='introduction'} showToast={showToast} t={t}/>

                {/* Points */}
                {sermon.points?.map((pt,i)=>(
                  <div key={i} style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:16,padding:20}}>
                    <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:12}}>
                      <div style={{width:28,height:28,borderRadius:'50%',background:'var(--gold-500)',color:'var(--ink-900)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,flexShrink:0}}>{i+1}</div>
                      <input className="input-field" style={{fontFamily:'var(--font-serif)',fontSize:16,fontWeight:500,border:'none',background:'transparent',flex:1}} value={pt.title} onChange={e=>setSermon(s=>({...s,points:s.points.map((p,j)=>j===i?{...p,title:e.target.value}:p)}))}/>
                    </div>
                    {pt.scripture&&<div style={{background:'rgba(255,255,255,0.7)',borderRadius:8,padding:'10px 14px',marginBottom:10,borderLeft:'3px solid var(--gold-400)',fontSize:14,fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--ink-700)',lineHeight:1.7}}>{pt.scripture}</div>}
                    <textarea className="textarea-field" style={{fontSize:14,minHeight:80}} value={pt.content} onChange={e=>setSermon(s=>({...s,points:s.points.map((p,j)=>j===i?{...p,content:e.target.value}:p)}))}/>
                    <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
                      <button onClick={()=>improve(`point ${i+1}`,pt.content)} disabled={improving!=null} className="btn btn-outline btn-sm" style={{gap:5}}>{t('improveButton')}</button>
                      <button onClick={()=>copyText(`${pt.title}\n${pt.scripture}\n${pt.content}`, t('copiedToast'))} className="btn btn-outline btn-sm">{t('copyButton')}</button>
                    </div>
                  </div>
                ))}

                {sermon.illustrations?.length>0&&(
                  <SectionBox title={t('illustrationsLabel')||'Illustrations'}>
                    {sermon.illustrations.map((il,i)=>(
                      <div key={i} style={{padding:'8px 0',borderBottom:i<sermon.illustrations.length-1?'1px solid var(--border-subtle)':'none',fontSize:14,color:'var(--ink-700)',lineHeight:1.65}}>💡 {il}</div>
                    ))}
                  </SectionBox>
                )}

                <EditableSection title={t('applicationLabel')} sectionKey="application" value={sermon.application||''} onChange={v=>setSermon(s=>({...s,application:v}))} onImprove={()=>improve('application',sermon.application||'')} improving={improving==='application'} showToast={showToast} t={t}/>
                <EditableSection title={t('altarCallLabel')} sectionKey="altarCall" value={sermon.altarCall||''} onChange={v=>setSermon(s=>({...s,altarCall:v}))} onImprove={()=>improve('altarCall',sermon.altarCall||'')} improving={improving==='altarCall'} showToast={showToast} t={t} dark/>
                <EditableSection title={t('closingPrayerLabel')} sectionKey="closingPrayer" value={sermon.closingPrayer||''} onChange={v=>setSermon(s=>({...s,closingPrayer:v}))} onImprove={()=>improve('closingPrayer',sermon.closingPrayer||'')} improving={improving==='closingPrayer'} showToast={showToast} t={t}/>

                {sermon.prayerPoints?.length>0&&(
                  <SectionBox title={t('prayerPointsLabel')}>
                    {sermon.prayerPoints.map((pp,i)=><div key={i} style={{padding:'6px 0',borderBottom:'1px solid var(--border-subtle)',fontSize:14,color:'var(--ink-700)'}}>• {pp}</div>)}
                  </SectionBox>
                )}

                {sermon.preachingNotes&&<SectionBox title={t('preachingNotesLabel')}><p style={{fontSize:14,lineHeight:1.7,whiteSpace:'pre-wrap',color:'var(--ink-700)'}}>{sermon.preachingNotes}</p></SectionBox>}

                <div style={{display:'flex',gap:10,paddingTop:8}}>
                  <button onClick={save} className="btn btn-gold" style={{flex:1,justifyContent:'center',gap:8}}>🔖 {t('saveSermon')}</button>
                  <button onClick={()=>setActivePage('sunday')} className="btn btn-outline" style={{flex:1,justifyContent:'center',gap:8}}>📋 {t('generateSundayPack')}</button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* LIBRARY TAB */}
        {tab==='library' && (
          <motion.div key="library" initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {sermons.length===0 ? (
              <EmptyState icon="🎙" headline={t('libraryEmptyHeadline')} body={t('libraryEmptyBody')} ctaLabel={t('libraryEmptyCta')} onCta={()=>setTab('build')}/>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sermons.map((s,i)=>(
                  <motion.div key={s.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}}>
                    <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                      <span style={{fontSize:28,flexShrink:0}}>🎙</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:15,fontWeight:500,color:'var(--text-primary)',marginBottom:3}}>{s.title||s.topic}</div>
                        <div style={{fontSize:12,color:'var(--text-muted)',display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
                          <span>📅 {s.date}</span>
                          {s.audience&&<span className="tag tag-ink" style={{fontSize:10}}>{s.audience}</span>}
                          {s.translation&&<span className="tag tag-gold" style={{fontSize:10}}>{s.translation}</span>}
                          {s.length&&<span className="tag tag-ink" style={{fontSize:10}}>{s.length}</span>}
                        </div>
                        {s.content?.theme&&<div style={{fontSize:13,color:'var(--text-secondary)',marginTop:4}}>{s.content.theme}</div>}
                      </div>
                      <div style={{display:'flex',gap:6}}>
                        <button onClick={()=>{setSermon(s.content);setForm({topic:s.topic,scripture:s.content?.mainText||'',audience:s.audience||'General congregation',denomination:s.denomination||'Pentecostal / Charismatic',length:s.length||'45-minute sermon',tone:s.tone||'Inspirational',translation:s.translation||'KJV'});setTab('edit')}} className="btn btn-gold btn-sm">{t('openSermon')}</button>
                        <button onClick={async()=>{if(await confirmAction('Delete this sermon?',{tone:'danger',confirmLabel:'Delete',detail:'This cannot be undone.'})){deleteSermon(s.id); showToast(t('removed'), '🗑')}}} className="btn btn-outline btn-sm" style={{color:'var(--terra-500)'}}>🗑</button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* PREACH MODE */}
      <AnimatePresence>
        {preachMode&&sermon&&(
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:'fixed',inset:0,background:'#FAF7F2',zIndex:500,overflowY:'auto',padding:'40px 32px'}}>
            <div style={{maxWidth:680,margin:'0 auto'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:32}}>
                <h1 style={{fontFamily:'var(--font-serif)',fontSize:28,fontWeight:500}}>{sermon.title}</h1>
                <div style={{display:'flex',gap:10,alignItems:'center'}}>
                  <div style={{fontSize:24,fontWeight:600,fontVariantNumeric:'tabular-nums',color:'var(--gold-700)'}}>{`${Math.floor(elapsed/60).toString().padStart(2,'0')}:${(elapsed%60).toString().padStart(2,'0')}`}</div>
                  <button onClick={()=>setTimerOn(v=>!v)} className="btn btn-outline btn-sm">{timerOn?'⏸':'▶'}</button>
                  <button onClick={()=>{setPreachMode(false);setTimerOn(false);setElapsed(0)}} className="btn btn-outline btn-sm">✕ {t('preachModeExit')}</button>
                </div>
              </div>
              <div style={{fontSize:20,fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--gold-700)',marginBottom:24}}>{sermon.mainText}</div>
              <div style={{fontSize:18,lineHeight:1.9,color:'var(--ink-800)',marginBottom:24}}>{sermon.introduction}</div>
              {sermon.points?.map((p,i)=>(
                <div key={i} style={{marginBottom:28,borderLeft:'4px solid var(--gold-400)',paddingLeft:20}}>
                  <div style={{fontSize:20,fontWeight:600,fontFamily:'var(--font-serif)',marginBottom:8}}>{i+1}. {p.title}</div>
                  <div style={{fontSize:16,fontStyle:'italic',color:'var(--gold-700)',marginBottom:8}}>{p.scripture}</div>
                  <div style={{fontSize:18,lineHeight:1.85}}>{p.content}</div>
                </div>
              ))}
              <div style={{fontSize:18,lineHeight:1.9,marginBottom:20}}>{sermon.application}</div>
              <div style={{background:'var(--ink-900)',borderRadius:16,padding:24,color:'rgba(250,247,242,0.92)'}}>
                <div style={{fontSize:16,fontWeight:600,marginBottom:10,color:'var(--gold-300)'}}>{t('preachModeAltarCall')}</div>
                <div style={{fontSize:18,fontFamily:'var(--font-serif)',fontStyle:'italic',lineHeight:1.8}}>{sermon.altarCall}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Helper components
function SectionBox({title,children,dark}){
  return(
    <div style={{background:dark?'var(--ink-900)':'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20}}>
      <div style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',color:dark?'var(--gold-300)':'var(--text-muted)',marginBottom:12,fontWeight:500}}>{title}</div>
      {children}
    </div>
  )
}

function EditableSection({title,sectionKey,value,onChange,onImprove,improving,showToast,dark,t}){
  return(
    <SectionBox title={title} dark={dark}>
      <textarea className="textarea-field" style={{fontSize:14,minHeight:100,background:dark?'rgba(255,255,255,0.08)':'var(--bg-card)',color:dark?'rgba(250,247,242,0.88)':'var(--ink-700)',border:dark?'1px solid rgba(255,255,255,0.1)':'1px solid var(--border-default)'}} value={value} onChange={e=>onChange(e.target.value)}/>
      <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}>
        <button onClick={onImprove} disabled={improving!=null} className="btn btn-outline btn-sm" style={{gap:5}}>
          {improving?<span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>:t('improveButton')}
        </button>
        <button onClick={()=>{ navigator.clipboard.writeText(value).catch(()=>{}); showToast(t('copiedToast'), '📋') }} className="btn btn-outline btn-sm">{t('copyButton')}</button>
      </div>
    </SectionBox>
  )
}