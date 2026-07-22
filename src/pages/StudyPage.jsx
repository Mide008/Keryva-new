import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon3D from '@/components/ui/Icon3D'
import { useAI } from '@/lib/useAI'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { TRANSLATIONS, dailyBackgroundImage } from '@/lib/bibleData'
import { STUDY_GUIDE_PROMPTS, languageLabelFor } from '@/lib/aiServices'
import { LoadingPulse } from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'

const GROUP_TYPES=['Youth (13-25)','Adults','New believers','Workers/Professionals','Leaders','Mixed congregation','Children','Senior adults']
const LENGTHS=['30 minutes','45 minutes','60 minutes','90 minutes']
const TONES=['Simple & accessible','Deep & theological','Conversational','Teaching style','Reflective']
const THEMES=['Forgiveness','Faith','Prayer','Identity in Christ','Grace','Suffering & Hope','The Holy Spirit','Generosity','Worship','Discipleship','Love','Evangelism','Marriage & Family','Purpose']

function parseJSON(raw) {
  try { const c=raw.replace(/```json|```/g,'').trim(); return JSON.parse(c) }
  catch { return null }
}

export default function StudyPage() {
  const { t } = useTranslation()
  const { user, saveStudyGuide, studyGuides, showToast, pendingVerse, setPendingVerse } = useApp()
  const [tab, setTab] = useState('Build')
  const [topic, setTopic] = useState('')
  const [passage, setPassage] = useState('')
  const [groupType, setGroupType] = useState('Adults')
  const [length, setLength] = useState('60 minutes')
  const [tone, setTone] = useState('Conversational')
  const [numQ, setNumQ] = useState(6)
  const [tran, setTran] = useState(user.translation||'KJV')
  const [guide, setGuide] = useState(null)
  const [open, setOpen] = useState({})
  const { ask, loading, error } = useAI()
  const resultRef = useRef(null)

  useEffect(() => {
    if (!pendingVerse) return
    setPassage(pendingVerse.ref)
    setTopic(prev => prev || pendingVerse.ref)
    setTab('Build')
    setPendingVerse(null)
    showToast(`${pendingVerse.ref} added to Study Guide`, '📎')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVerse])

  const gen = async () => {
    if (!topic.trim()) { showToast(t('enterStudyThemeFirst'), '⚠️'); return }
    setGuide(null)
    const prompt = STUDY_GUIDE_PROMPTS.generate({ topic: topic+(passage?` (${passage})`:''), groupType, length, tone, numQuestions: numQ, translation: tran, languageLabel: languageLabelFor(user.language) })
    const raw = await ask(prompt)
    if (raw) {
      const j = parseJSON(raw)
      if (j) {
        setGuide(j)
        showToast('Your study guide is ready','✓')
        setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
      } else {
        showToast(t('errorParsing'),'❌')
      }
    } else {
      showToast(error || t('aiRequestFailed'), '❌')
    }
  }

  const share = () => {
    if (!guide) return
    const txt = `📚 *${guide.title}*\n\n🎯 ${guide.objective}\n\n📖 ${guide.mainScripture}\n\n💬 Discussion:\n${guide.discussionQuestions?.map((q,i)=>`${i+1}. ${q}`).join('\n')}\n\n✅ Challenge: ${guide.weeklyChallenge}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,'_blank')
    showToast(t('shareToWhatsApp'),'💬')
  }

  const save = () => {
    if (!guide) return
    saveStudyGuide({ title: guide.title, topic, passage, groupType, length, tone, translation: tran, content: guide })
    showToast(t('studyGuideSaved'),'📚')
  }

  const Section = ({ label, children, id }) => (
    <div style={{ border:'1px solid var(--border-subtle)', borderRadius:16, overflow:'hidden', background:'var(--bg-card)' }}>
      <button onClick={()=>setOpen(o=>({...o,[id]:!o[id]}))}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', background:'none', border:'none', cursor:'pointer', textAlign:'left' }}>
        <span style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)' }}>{label}</span>
        <motion.span animate={{ rotate: open[id] ? 180 : 0 }} style={{ fontSize:14, color:'var(--text-muted)' }}>▼</motion.span>
      </button>
      <AnimatePresence>
        {open[id] && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} style={{overflow:'hidden'}}>
            <div style={{ padding:'0 20px 20px', borderTop:'1px solid var(--border-subtle)' }}>{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )

  const buildLabel = t('buildTab') || 'Build'
  const libraryLabel = t('libraryTab') || 'Library'

  return (
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <RevealCard>
        <div style={{background:'var(--ink-900)',borderRadius:24,padding:32,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',gap:20}}>
          <img src={dailyBackgroundImage('study',900,600)} alt="" aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07}}/>
          <motion.div animate={{y:[-2,2,-2]}} transition={{duration:3,repeat:Infinity}} style={{position:'relative',zIndex:1,flexShrink:0}}><Icon3D name="library" tone="gold" active size={26} badgeSize={56}/></motion.div>
          <div style={{position:'relative',zIndex:1}}>
            <MotionHeadline text={t('studyGuideTitle')} as="h1" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,3vw,28px)',fontWeight:400,color:'rgba(250,247,242,0.93)',marginBottom:4}}/>
            <p style={{fontSize:13,color:'rgba(250,247,242,0.44)',lineHeight:1.55}}>{t('studyGuideDesc')}</p>
          </div>
        </div>
      </RevealCard>

      <div style={{display:'flex',gap:0,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:12,padding:4,width:'fit-content'}}>
        {['Build','Library'].map(tabKey=>{
          const label = tabKey === 'Build' ? buildLabel : libraryLabel
          return (
            <button key={tabKey} onClick={()=>setTab(tabKey)} style={{padding:'7px 22px',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabKey?'var(--ink-900)':'transparent',color:tab===tabKey?'var(--text-inverse)':'var(--text-muted)',border:'none',transition:'all var(--dur-fast) ease'}}>
              {label}{tabKey==='Library'&&studyGuides.length>0&&<span style={{marginLeft:6,background:'var(--gold-500)',color:'var(--ink-900)',borderRadius:10,padding:'1px 6px',fontSize:10}}>{studyGuides.length}</span>}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab==='Build' && (
          <motion.div key="build" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="input-group">
              <label className="input-label">{t('studyTopicLabel')}</label>
              <input className="input-field" style={{fontSize:16}} placeholder="e.g. Forgiveness, John 15, Walking in the Spirit…" value={topic} onChange={e=>setTopic(e.target.value)}/>
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
              {THEMES.map(th=><button key={th} onClick={()=>setTopic(th)} className={`tag ${topic===th?'tag-dark':'tag-ink'}`} style={{cursor:'pointer',padding:'5px 12px',fontSize:12}}>{th}</button>)}
            </div>
            <div className="input-group">
              <label className="input-label">{t('studyPassageLabel')}</label>
              <input className="input-field" placeholder="e.g. Matthew 18:21-35" value={passage} onChange={e=>setPassage(e.target.value)}/>
            </div>
            <div className="grid-2" style={{gap:12}}>
              {[[groupType,setGroupType,GROUP_TYPES,t('studyGroupType')],[length,setLength,LENGTHS,t('studyLength')],[tone,setTone,TONES,t('studyTone')]].map(([val,set,opts,label])=>(
                <div key={label} className="input-group" style={{gridColumn:label===t('studyTone')?'1/-1':'auto'}}>
                  <label className="input-label">{label}</label>
                  <select className="select-field" value={val} onChange={e=>set(e.target.value)}>{opts.map(o=><option key={o}>{o}</option>)}</select>
                </div>
              ))}
            </div>
            <div style={{display:'flex',alignItems:'center',gap:16,flexWrap:'wrap'}}>
              <div className="input-group" style={{flex:1,minWidth:140}}>
                <label className="input-label">{t('studyQuestions')} {numQ}</label>
                <input type="range" min={4} max={10} value={numQ} onChange={e=>setNumQ(+e.target.value)} style={{width:'100%',accentColor:'var(--gold-500)'}}/>
              </div>
              <div className="input-group" style={{flex:1,minWidth:140}}>
                <label className="input-label">{t('studyTranslation')}</label>
                <select className="select-field" value={tran} onChange={e=>setTran(e.target.value)}>{TRANSLATIONS.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}</select>
              </div>
            </div>
            <MagneticBtn onClick={gen} disabled={!topic.trim()||loading} className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',gap:10}}>
              {loading?<><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>{t('buildingGuide')}</>:<>{t('generateStudyGuideBtn')}</>}
            </MagneticBtn>
            <AnimatePresence>{loading&&<LoadingPulse message={t('buildingStudyGuide')}/>}</AnimatePresence>
            <AnimatePresence>
              {!loading&&guide&&(
                <motion.div ref={resultRef} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="ai-disclaimer" role="note"><span>✦</span><span>{t('aiDisclaimer')}</span></div>
                  <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:20,padding:24}}>
                    <div style={{fontSize:11,letterSpacing:'0.1em',textTransform:'uppercase',color:'var(--gold-700)',marginBottom:8}}>{t('studyGuide')}</div>
                    <h2 style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,3vw,28px)',fontWeight:500,color:'var(--text-primary)',marginBottom:8}}>{guide.title}</h2>
                    <p style={{fontSize:14,color:'var(--text-muted)',lineHeight:1.65}}>{guide.objective}</p>
                  </div>
                  {[
                    {id:'ice',label:t('icebreaker'),content:guide.icebreaker},
                    {id:'open',label:t('openingPrayer'),content:guide.openingPrayer},
                    {id:'scr',label:t('mainScripture'),content:guide.mainScripture},
                    {id:'bg',label:t('backgroundContext'),content:guide.backgroundContext},
                    {id:'pts',label:t('lessonPoints'),content:guide.lessonPoints?.map((p,i)=>`${i+1}. ${p}`).join('\n')},
                    {id:'disc',label:t('discussionQuestions'),content:guide.discussionQuestions?.map((q,i)=>`${i+1}. ${q}`).join('\n')},
                    {id:'ref',label:t('reflectionPrompt'),content:guide.reflectionPrompt},
                    {id:'act',label:t('groupActivity'),content:guide.groupActivity},
                    {id:'chall',label:t('weeklyChallenge'),content:guide.weeklyChallenge},
                    {id:'close',label:t('closingPrayerStudy'),content:guide.closingPrayer},
                    {id:'wa',label:t('whatsappInvite'),content:guide.whatsappInvite},
                  ].filter(s=>s.content).map(s=>(
                    <Section key={s.id} id={s.id} label={s.label}>
                      <p style={{fontSize:14,color:'var(--ink-700)',lineHeight:1.75,whiteSpace:'pre-line',paddingTop:12}}>{s.content}</p>
                      <button onClick={()=>{navigator.clipboard.writeText(s.content).catch(()=>{});showToast(t('copied'),'📋')}} style={{fontSize:12,color:'var(--gold-700)',background:'none',border:'none',cursor:'pointer',marginTop:8}}>{t('copySection')}</button>
                    </Section>
                  ))}
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={save} className="btn btn-gold" style={{flex:1,justifyContent:'center',gap:8}}>{t('saveStudyGuide')}</button>
                    <button onClick={share} className="btn btn-outline" style={{flex:1,justifyContent:'center',gap:8}}>{t('whatsapp')}</button>
                    <button onClick={gen} className="btn btn-outline" style={{padding:'10px 14px'}} title={t('regenerate')}>↺</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {tab==='Library' && (
          <motion.div key="lib" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {studyGuides.length===0
              ? <EmptyState icon="📚" headline={t('noStudyGuides')} body={t('studyLibraryEmpty')} ctaLabel={t('buildStudyGuide')} onCta={()=>setTab('Build')}/>
              : <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {studyGuides.map((g,i)=>(
                    <motion.div key={g.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14,cursor:'pointer'}} onClick={()=>{setGuide(g.content);setTopic(g.topic);setTab('Build')}}>
                      <Icon3D name="library" tone="gold" active size={17} badgeSize={45}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{g.title||g.topic}</div>
                        <div style={{fontSize:11,color:'var(--text-muted)'}}>{g.groupType} · {g.date}</div>
                      </div>
                      <div style={{display:'flex',gap:8,flexShrink:0}}>
                        <button onClick={e=>{e.stopPropagation();const txt=`📚 *${g.title||g.topic}*\n\nSaved study guide from Keryva · OmniCraft Studios`;window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,'_blank')}} className="btn btn-outline btn-sm" style={{padding:'6px 10px',fontSize:12}}>{t('whatsapp')}</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
            }
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}