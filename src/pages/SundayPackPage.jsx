import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon3D from '@/components/ui/Icon3D'
import { useAI } from '@/lib/useAI'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { SUNDAY_PACK_PROMPTS, languageLabelFor } from '@/lib/aiServices'
import { LoadingPulse } from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'
import { dailyBackgroundImage } from '@/lib/bibleData'

function parseJSON(raw){try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return null}}

export default function SundayPackPage(){
  const { t } = useTranslation()
  const {saveSundayPack,sundayPacks,showToast,user,pendingVerse,setPendingVerse}=useApp()
  const [tab,setTab]=useState('Build')
  const [topic,setTopic]=useState('')
  const [date,setDate]=useState(new Date().toISOString().split('T')[0])
  const [scripture,setScripture]=useState('')
  const [church,setChurch]=useState('')
  const [speaker,setSpeaker]=useState('')
  const [theme,setTheme]=useState('')
  const [announcements,setAnnouncements]=useState('')
  const [pack,setPack]=useState(null)

  useEffect(() => {
    if (!pendingVerse) return
    setScripture(pendingVerse.ref)
    setTab('Build')
    setPendingVerse(null)
    showToast(`${pendingVerse.ref} added to Sunday Pack`, '📎')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingVerse])
  const {ask,loading,error}=useAI()
  const resultRef=useRef(null)

  const gen=async()=>{
    if(!topic.trim()){ showToast(t('enterSermonTopicFirst'), '⚠️'); return }
    setPack(null)
    const raw=await ask(SUNDAY_PACK_PROMPTS.generate({topic,date,scripture,church:church||'Our Church',speaker,theme,announcements,languageLabel:languageLabelFor(user.language)}))
    if(raw){
      const j=parseJSON(raw)
      if(j){
        setPack(j)
        showToast('Your Sunday Pack is ready','✓')
        setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
      } else {
        showToast(t('errorParsing'),'❌')
      }
    } else {
      showToast(error || t('aiRequestFailed'), '❌')
    }
  }

  const shareAll=()=>{
    if(!pack)return
    const txt=`📋 *SUNDAY SERVICE PACK*\n📅 ${date}\n\n*${pack.bulletinHeader||topic}*\n\n📖 ${pack.sermonSummary}\n\n🙏 Prayer Points:\n${pack.prayerPoints?.join('\n')}\n\n✉️ ${pack.whatsappMessage}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(txt)}`,'_blank')
    showToast(t('shareToWhatsApp'),'💬')
  }

  const copySection=(label,content)=>{navigator.clipboard.writeText(`${label}\n\n${content}`).catch(()=>{});showToast(t('copied'),'📋')}

  const SECTIONS=pack?[
    {key:'bulletinHeader',label:'📄 Bulletin Header',type:'text'},
    {key:'orderOfService',label:'📋 Order of Service',type:'list'},
    {key:'openingPrayer',label:'🙏 Opening Prayer',type:'text'},
    {key:'callToWorship',label:'🎵 Call to Worship',type:'text'},
    {key:'sermonSummary',label:'📖 Sermon Summary',type:'text'},
    {key:'keyScriptures',label:'✝️ Key Scriptures',type:'list'},
    {key:'prayerPoints',label:'🙏 Prayer Points',type:'list'},
    {key:'announcements',label:'📢 Announcements',type:'text'},
    {key:'newBelieverMessage',label:'💛 New Believer Message',type:'text'},
    {key:'whatsappMessage',label:'💬 WhatsApp Message',type:'text'},
    {key:'closingBlessing',label:'✨ Closing Blessing',type:'text'},
  ]:[]

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <RevealCard>
        <div style={{background:'var(--ink-900)',borderRadius:24,padding:32,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',gap:20}}>
          <img src={dailyBackgroundImage('sunday',900,600)} alt="" aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07}}/>
          <motion.div animate={{scale:[1,1.06,1]}} transition={{duration:3,repeat:Infinity}} style={{position:'relative',zIndex:1,flexShrink:0}}><Icon3D name="church" tone="gold" active size={26} badgeSize={56}/></motion.div>
          <div style={{position:'relative',zIndex:1}}>
            <MotionHeadline text={t('sundayPackTitle')} as="h1" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,3vw,28px)',fontWeight:400,color:'rgba(250,247,242,0.93)',marginBottom:4}}/>
            <p style={{fontSize:13,color:'rgba(250,247,242,0.44)',lineHeight:1.55}}>{t('sundayPackDesc')}</p>
          </div>
        </div>
      </RevealCard>

      <div style={{display:'flex',gap:0,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:12,padding:4,width:'fit-content'}}>
        {['Build','Library'].map(tabKey=>{
          const label = tabKey === 'Build' ? t('buildTab') || 'Build' : t('libraryTab') || 'Library'
          return (
            <button key={tabKey} onClick={()=>setTab(tabKey)} style={{padding:'7px 22px',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabKey?'var(--ink-900)':'transparent',color:tab===tabKey?'var(--text-inverse)':'var(--text-muted)',border:'none',transition:'all var(--dur-fast) ease'}}>
              {label}{tabKey==='Library'&&sundayPacks.length>0&&<span style={{marginLeft:6,background:'var(--gold-500)',color:'var(--ink-900)',borderRadius:10,padding:'1px 6px',fontSize:10}}>{sundayPacks.length}</span>}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab==='Build'&&(
          <motion.div key="build" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="grid-2" style={{gap:12}}>
              <div className="input-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">{t('sundayTopicLabel')}</label>
                <input className="input-field" style={{fontSize:16}} placeholder="e.g. The Power of Praise" value={topic} onChange={e=>setTopic(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('sundayDateLabel')}</label>
                <input className="input-field" type="date" value={date} onChange={e=>setDate(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('sundayScriptureLabel')}</label>
                <input className="input-field" placeholder="e.g. Psalm 100:1-5" value={scripture} onChange={e=>setScripture(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('sundayChurchLabel')}</label>
                <input className="input-field" placeholder={user?.church||'Your Church'} value={church} onChange={e=>setChurch(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('sundaySpeakerLabel')}</label>
                <input className="input-field" placeholder={user?.name||'Pastor'} value={speaker} onChange={e=>setSpeaker(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('sundayThemeLabel')}</label>
                <input className="input-field" placeholder="e.g. Month of Praise" value={theme} onChange={e=>setTheme(e.target.value)}/>
              </div>
              <div className="input-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">{t('sundayAnnouncementsLabel')}</label>
                <textarea className="textarea-field" rows={2} placeholder="e.g. Youth camp next Saturday, tithe Sunday…" value={announcements} onChange={e=>setAnnouncements(e.target.value)} style={{resize:'none'}}/>
              </div>
            </div>
            <MagneticBtn onClick={gen} disabled={!topic.trim()||loading} className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',gap:10}}>
              {loading?<><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>{t('generatingPack')}</>:<>{t('generateSundayPackBtn')}</>}
            </MagneticBtn>
            <AnimatePresence>{loading&&<LoadingPulse message={t('preparingPack')}/>}</AnimatePresence>
            <AnimatePresence>
              {!loading&&pack&&(
                <motion.div ref={resultRef} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{display:'flex',flexDirection:'column',gap:12}}>
                  <div className="ai-disclaimer" role="note"><span>✦</span><span>{t('aiDisclaimer')}</span></div>
                  {SECTIONS.map(({key,label,type})=>{
                    const content=pack[key]
                    if(!content||(Array.isArray(content)&&content.length===0))return null
                    const display=type==='list'?content.map((c,i)=>`${i+1}. ${c}`).join('\n'):content
                    return(
                      <div key={key} style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20}}>
                        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                          <span style={{fontSize:13,fontWeight:500,color:'var(--text-primary)'}}>{label}</span>
                          <button onClick={()=>copySection(label,display)} style={{fontSize:12,color:'var(--gold-700)',background:'none',border:'none',cursor:'pointer'}}>{t('copy')}</button>
                        </div>
                        <p style={{fontSize:14,color:'var(--ink-700)',lineHeight:1.75,whiteSpace:'pre-line'}}>{display}</p>
                      </div>
                    )
                  })}
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>saveSundayPack({title:topic,topic,date,scripture,church,speaker,content:pack})} className="btn btn-gold" style={{flex:1,justifyContent:'center',gap:8}}>{t('savePack')}</button>
                    <button onClick={shareAll} className="btn btn-outline" style={{flex:1,justifyContent:'center',gap:8}}>{t('shareAll')}</button>
                    <button onClick={gen} className="btn btn-outline" style={{padding:'10px 14px'}} title={t('regenerate')}>↺</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {tab==='Library'&&(
          <motion.div key="lib" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {sundayPacks.length===0
              ?<EmptyState icon="📋" headline={t('noPacks')} body={t('sundayLibraryEmpty')} ctaLabel={t('buildPack')} onCta={()=>setTab('Build')}/>
              :<div style={{display:'flex',flexDirection:'column',gap:10}}>
                {sundayPacks.map((p,i)=>(
                  <motion.div key={p.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14,cursor:'pointer'}} onClick={()=>{setPack(p.content);setTopic(p.topic||p.title);setTab('Build')}}>
                    <Icon3D name="church" tone="gold" active size={17} badgeSize={45}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.date}</div>
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