import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon3D, { GLYPHS } from '@/components/ui/Icon3D'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { VERSE_PROMPTS } from '@/lib/aiServices'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard } from '@/components/ui/MotionComponents'

const COLLECTIONS=['General','Sermon','Prayer','Study','Encouragement','Prophecy','Healing','Faith']

export default function SavedPage(){
  const { t } = useTranslation()
  const {savedVerses,removeVerse,verseNotes,addVerseNote,showToast,setActivePage,setPendingVerse,setPendingChapter,sermons,studyGuides,sundayPacks,socialPacks,prayers,confirmAction}=useApp()
  const [tab,setTab]=useState('Verses')
  const [search,setSearch]=useState('')
  const [filterCol,setFilterCol]=useState('All')
  const [filterTran,setFilterTran]=useState('All')
  const [actionVerse,setActionVerse]=useState(null)
  const [noteText,setNoteText]=useState('')
  const [aiResult,setAiResult]=useState('')
  const [aiType,setAiType]=useState('')
  const {ask,loading}=useAI()

  const translations=[...new Set(savedVerses.map(v=>v.translation||'KJV'))]

  const filtered=savedVerses.filter(v=>{
    const s=!search||v.ref.toLowerCase().includes(search.toLowerCase())||v.text.toLowerCase().includes(search.toLowerCase())
    const c=filterCol==='All'||v.collection===filterCol
    const t=filterTran==='All'||(v.translation||'KJV')===filterTran
    return s&&c&&t
  })

  const share=(v)=>{
    const m=`*${v.ref}* (${v.translation||'KJV'})\n\n_${v.text}_\n\n— Keryva · OmniCraft Studios 📖`
    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank')
    showToast(t('shareToWhatsApp'),'💬')
  }

  const copy=(v)=>{
    navigator.clipboard.writeText(`${v.text} — ${v.ref}`).catch(()=>{})
    showToast(t('copied'),'📋')
  }

  const goToBible=(v)=>{
    const m=v.ref.match(/^(.+?)\s+(\d+):(\d+)/)
    if(!m){showToast('Could not open this reference','⚠️');return}
    setPendingChapter({bookName:m[1].trim(),chapter:parseInt(m[2],10),verse:parseInt(m[3],10),translation:v.translation||'KJV'})
    setActivePage('bible')
  }

  const aiAction=async(type,v)=>{
    setAiType(type);setAiResult('');setActionVerse(v)
    let prompt
    if(type==='explain')prompt=VERSE_PROMPTS.explain(v.ref,v.text)
    else if(type==='preach')prompt=VERSE_PROMPTS.preachingAngle(v.ref,v.text)
    else if(type==='counsel')prompt=VERSE_PROMPTS.counsellingAngle(v.ref,v.text)
    else if(type==='youth')prompt=VERSE_PROMPTS.youthExplanation(v.ref,v.text)
    if(prompt){const r=await ask(prompt,'fast');if(r)setAiResult(r)}
  }

  const pullInto=(target,v)=>{
    setPendingVerse(v)
    setActivePage(target)
    showToast(`Verse ready to add to ${target}`,'📎')
  }

  const TABS=[
    {id:'Verses',icon:'bookmark',count:savedVerses.length},
    {id:'Sermons',icon:'megaphone',count:sermons.length},
    {id:'Studies',icon:'library',count:studyGuides.length},
    {id:'Packs',icon:'church',count:sundayPacks.length+socialPacks.length}
  ]

  const tabLabels = {
    'Verses': t('savedVerses'),
    'Sermons': t('savedSermons'),
    'Studies': t('savedStudies'),
    'Packs': t('savedPacks')
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      {/* Tabs */}
      <RevealCard>
        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
          {TABS.map(tabItem=>(
            <button key={tabItem.id} onClick={()=>setTab(tabItem.id)}
              style={{display:'flex',alignItems:'center',gap:6,padding:'9px 16px',borderRadius:12,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabItem.id?'var(--ink-900)':'var(--bg-card)',color:tab===tabItem.id?'var(--text-inverse)':'var(--text-secondary)',border:`1px solid ${tab===tabItem.id?'transparent':'var(--border-subtle)'}`,transition:'all var(--dur-fast) ease'}}>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} style={{flexShrink:0}}>{GLYPHS[tabItem.icon]}</svg> {tabLabels[tabItem.id] || tabItem.id} {tabItem.count>0&&<span style={{background:tab===tabItem.id?'rgba(255,255,255,0.2)':'var(--gold-100)',color:tab===tabItem.id?'white':'var(--gold-800)',borderRadius:10,padding:'1px 7px',fontSize:10}}>{tabItem.count}</span>}
            </button>
          ))}
        </div>
      </RevealCard>

      {/* Saved Verses */}
      <AnimatePresence mode="wait">
        {tab==='Verses'&&(
          <motion.div key="verses" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center'}}>
              <div style={{position:'relative',flex:1,minWidth:200}}>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:15,pointerEvents:'none'}}>🔍</span>
                <input className="input-field" style={{paddingLeft:36}} placeholder={t('savedSearch')} value={search} onChange={e=>setSearch(e.target.value)}/>
              </div>
              <select className="select-field" style={{width:'auto',minWidth:110}} value={filterCol} onChange={e=>setFilterCol(e.target.value)}>
                <option value="All">{t('allCollections')}</option>
                {COLLECTIONS.map(c=><option key={c}>{c}</option>)}
              </select>
              {translations.length>1&&(
                <select className="select-field" style={{width:'auto',minWidth:80}} value={filterTran} onChange={e=>setFilterTran(e.target.value)}>
                  <option value="All">All</option>
                  {translations.map(t=><option key={t}>{t}</option>)}
                </select>
              )}
              <span style={{fontSize:12,color:'var(--text-muted)',whiteSpace:'nowrap'}}>{filtered.length} verse{filtered.length!==1?'s':''}</span>
            </div>

            {filtered.length===0
              ?<EmptyState icon="🔖" headline={t('noSavedVersesTitle')} body={t('noSavedVersesBody')} ctaLabel={t('exploreScriptures')} onCta={()=>setActivePage('inspire')}/>
              :<div style={{display:'flex',flexDirection:'column',gap:14}}>
                {filtered.map((v,i)=>{
                  const note=verseNotes.find(n=>n.ref===v.ref)
                  return(
                    <motion.div key={v.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.045}} className="verse-card">
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                        <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
                          <span className="verse-ref" onClick={()=>goToBible(v)} style={{cursor:'pointer',textDecoration:'underline',textDecorationColor:'var(--border-gold)'}} title={t('verseActionGoToBible')}>{v.ref}</span>
                          {v.translation&&<span className="tag tag-gold" style={{fontSize:10}}>{v.translation}</span>}
                          {v.collection&&v.collection!=='General'&&<span className="tag tag-ink" style={{fontSize:10}}>{v.collection}</span>}
                        </div>
                        <span style={{fontSize:16}}>🔖</span>
                      </div>
                      <p className="verse-text">{v.text}</p>
                      {note?.note&&<div style={{background:'var(--ink-50)',borderLeft:'3px solid var(--gold-400)',borderRadius:'0 8px 8px 0',padding:'8px 12px',marginTop:8}}>
                        <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.6,fontStyle:'italic'}}>{note.note}</p>
                      </div>}
                      {/* Primary actions */}
                      <div style={{display:'flex',gap:8,marginTop:14,paddingTop:12,borderTop:'1px solid var(--border-subtle)',flexWrap:'wrap'}}>
                        <button onClick={()=>goToBible(v)} className="btn btn-outline btn-sm" style={{padding:'7px 12px'}}>{t('verseActionGoToBible')}</button>
                        <button onClick={()=>share(v)} className="btn btn-gold btn-sm" style={{flex:1,justifyContent:'center',gap:5}}>{t('whatsapp')}</button>
                        <button onClick={()=>copy(v)} className="btn btn-outline btn-sm" style={{padding:'7px 12px'}}>{t('copy')}</button>
                        <button onClick={async()=>{if(await confirmAction('Remove this saved verse?',{tone:'danger',confirmLabel:'Remove'}))removeVerse(v.id)}} className="btn btn-outline btn-sm" style={{padding:'7px 12px',color:'var(--terra-400)',borderColor:'var(--terra-300)'}}>{t('delete')}</button>
                      </div>
                      {/* Pull-into + AI actions */}
                      <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
                        <button onClick={()=>pullInto('sermon',v)} className="btn btn-sm" style={{background:'var(--terra-100)',color:'var(--terra-600)',border:'none',fontSize:11,padding:'5px 10px'}}>{t('savedAddTo').replace('{target}','Sermon')}</button>
                        <button onClick={()=>pullInto('prayer',v)} className="btn btn-sm" style={{background:'var(--sage-100)',color:'var(--sage-600)',border:'none',fontSize:11,padding:'5px 10px'}}>{t('savedAddTo').replace('{target}','Prayer')}</button>
                        <button onClick={()=>pullInto('study',v)} className="btn btn-sm" style={{background:'var(--gold-100)',color:'var(--gold-800)',border:'none',fontSize:11,padding:'5px 10px'}}>{t('savedAddTo').replace('{target}','Study')}</button>
                        <button onClick={()=>pullInto('sunday',v)} className="btn btn-sm" style={{background:'var(--ink-100)',color:'var(--ink-600)',border:'none',fontSize:11,padding:'5px 10px'}}>{t('savedAddTo').replace('{target}','Sunday')}</button>
                        <button onClick={()=>aiAction('explain',v)} className="btn btn-sm" style={{background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',fontSize:11,padding:'5px 10px'}}>{t('explain')}</button>
                        <button onClick={()=>aiAction('preach',v)} className="btn btn-sm" style={{background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',fontSize:11,padding:'5px 10px'}}>{t('preachingAngle')}</button>
                        <button onClick={()=>aiAction('counsel',v)} className="btn btn-sm" style={{background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',fontSize:11,padding:'5px 10px'}}>{t('counsellingAngle')}</button>
                        <button onClick={()=>aiAction('youth',v)} className="btn btn-sm" style={{background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',fontSize:11,padding:'5px 10px'}}>{t('youthFriendly')}</button>
                        <button onClick={()=>{const n=prompt(`Note for ${v.ref}:`);if(n)addVerseNote(v.ref,v.text,n,null,v.tags||[])}} className="btn btn-sm" style={{background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',fontSize:11,padding:'5px 10px'}}>{t('savedNote')}</button>
                      </div>
                      <AnimatePresence>
                        {actionVerse?.id===v.id&&(
                          <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}>
                            <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:14,padding:16,marginTop:10}}>
                              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                                <span style={{fontSize:13,fontWeight:500,color:'var(--gold-800)'}}>{aiType==='explain'?t('explanation'):aiType==='preach'?t('preachingAngles'):aiType==='counsel'?t('counsellingAngle'):t('youthFriendlyLabel')}</span>
                                <button onClick={()=>{setActionVerse(null);setAiResult('')}} style={{background:'none',border:'none',cursor:'pointer',fontSize:18,color:'var(--text-muted)'}}>×</button>
                              </div>
                              {loading?<div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
                                :<p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{aiResult}</p>
                              }
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )
                })}
              </div>
            }
          </motion.div>
        )}

        {tab==='Sermons'&&(
          <motion.div key="sermons" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {sermons.length===0?<EmptyState icon="🎙" headline={t('noSavedSermonsTitle')} body={t('noSavedSermonsBody')} ctaLabel={t('goToSermonStudio')} onCta={()=>setActivePage('sermon')}/>
              :<div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sermons.map((s,i)=>(
                  <motion.div key={s.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14}}>
                    <Icon3D name="megaphone" tone="gold" active size={17} badgeSize={45}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{s.title||s.topic}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{s.audience} · {s.date}</div>
                    </div>
                    <button onClick={()=>setActivePage('sermon')} className="btn btn-outline btn-sm" style={{padding:'6px 12px',fontSize:12}}>{t('open')} →</button>
                  </motion.div>
                ))}
              </div>
            }
          </motion.div>
        )}

        {tab==='Studies'&&(
          <motion.div key="studies" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {studyGuides.length===0?<EmptyState icon="📚" headline={t('noSavedStudiesTitle')} body={t('noSavedStudiesBody')} ctaLabel={t('goToStudyGuide') || 'Go to Study Guide'} onCta={()=>setActivePage('study')}/>
              :<div style={{display:'flex',flexDirection:'column',gap:10}}>
                {studyGuides.map((g,i)=>(
                  <motion.div key={g.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14}}>
                    <Icon3D name="library" tone="gold" active size={17} badgeSize={45}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.title||g.topic}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{g.groupType} · {g.date}</div>
                    </div>
                    <button onClick={()=>setActivePage('study')} className="btn btn-outline btn-sm" style={{padding:'6px 12px',fontSize:12}}>{t('open')} →</button>
                  </motion.div>
                ))}
              </div>
            }
          </motion.div>
        )}

        {tab==='Packs'&&(
          <motion.div key="packs" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
            {sundayPacks.length>0&&<>
              <h3 style={{fontFamily:'var(--font-serif)',fontSize:16,fontWeight:500}}>{t('savedPacks')}</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sundayPacks.map((p,i)=>(
                  <motion.div key={p.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14}}>
                    <Icon3D name="church" tone="gold" active size={16} badgeSize={42}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.date}</div>
                    </div>
                    <button onClick={()=>setActivePage('sunday')} className="btn btn-outline btn-sm" style={{padding:'6px 12px',fontSize:12}}>{t('open')} →</button>
                  </motion.div>
                ))}
              </div>
            </>}
            {socialPacks.length>0&&<>
              <h3 style={{fontFamily:'var(--font-serif)',fontSize:16,fontWeight:500}}>📱 Social</h3>
              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {socialPacks.map((p,i)=>(
                  <motion.div key={p.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14}}>
                    <Icon3D name="globe" tone="gold" active size={16} badgeSize={42}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.contentType} · {p.date}</div>
                    </div>
                    <button onClick={()=>setActivePage('social')} className="btn btn-outline btn-sm" style={{padding:'6px 12px',fontSize:12}}>{t('open')} →</button>
                  </motion.div>
                ))}
              </div>
            </>}
            {sundayPacks.length===0&&socialPacks.length===0&&<EmptyState icon="📦" headline={t('noSavedPacksTitle')} body={t('noSavedPacksBody')} ctaLabel={t('goToSundayPack') || 'Go to Sunday Pack'} onCta={()=>setActivePage('sunday')}/>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}