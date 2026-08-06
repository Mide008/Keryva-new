import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Icon3D from '@/components/ui/Icon3D'
import { useAI } from '@/lib/useAI'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { SOCIAL_PACK_PROMPTS, languageLabelFor } from '@/lib/aiServices'
import { LoadingPulse } from '@/components/ui/Loading'
import EmptyState from '@/components/ui/EmptyState'
import { RevealCard, MagneticBtn, MotionHeadline } from '@/components/ui/MotionComponents'
import { dailyBackgroundImage } from '@/lib/bibleData'

function parseJSON(raw){try{return JSON.parse(raw.replace(/```json|```/g,'').trim())}catch{return null}}
const PLATFORMS=['WhatsApp & Instagram','Facebook','X / Twitter','TikTok / Reels','All platforms']
const TONES=['Warm & inviting','Bold & powerful','Evangelistic','Youth-friendly','Premium & polished','Pastoral & caring']
const CONTENT_TYPES=['Sunday invitation','Sermon quote','Midweek reminder','Encouragement','Testimony prompt','Giving reminder','Event promo']

export default function SocialPackPage(){
  const { t } = useTranslation()
  const {saveSocialPack,socialPacks,showToast,user}=useApp()
  const [tab,setTab]=useState('Build')
  const [topic,setTopic]=useState('')
  const [scripture,setScripture]=useState('')
  const [church,setChurch]=useState('')
  const [platform,setPlatform]=useState('All platforms')
  const [tone,setTone]=useState('Warm & inviting')
  const [contentType,setContentType]=useState('Sunday invitation')
  const [pack,setPack]=useState(null)
  const {ask,loading,error}=useAI()
  const resultRef=useRef(null)

  const gen=async()=>{
    if(!topic.trim()){ showToast(t('enterThemeFirst'), '⚠️'); return }
    setPack(null)
    const raw=await ask(SOCIAL_PACK_PROMPTS.generate({topic,scripture,church:church||'Our Church',platform,tone,contentType,languageLabel:languageLabelFor(user.language)}))
    if(raw){
      const j=parseJSON(raw)
      if(j){
        setPack(j)
        showToast('Your social pack is ready','✓')
        setTimeout(()=>resultRef.current?.scrollIntoView({behavior:'smooth',block:'start'}),100)
      } else {
        showToast(t('errorParsing'),'❌')
      }
    } else {
      showToast(error || t('aiRequestFailed'), '❌')
    }
  }

  const copy=(text)=>{navigator.clipboard.writeText(text).catch(()=>{});showToast(t('copied'),'📋')}
  const shareWA=(text)=>{window.open(`https://wa.me/?text=${encodeURIComponent(text)}`,'_blank');showToast(t('shareToWhatsApp'),'💬')}

  const PostCard=({platformName,posts})=>(
    <div style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20}}>
      <div style={{fontSize:13,fontWeight:600,color:'var(--text-primary)',marginBottom:14}}>{platformName}</div>
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {posts.map((p,i)=>(
          <div key={i} style={{background:'var(--bg-primary)',borderRadius:12,padding:14,position:'relative'}}>
            <p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.7,paddingRight:60}}>{p}</p>
            <div style={{position:'absolute',top:10,right:10,display:'flex',gap:6}}>
              <button onClick={()=>copy(p)} style={{fontSize:14,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}} title={t('copy')}>📋</button>
              <button onClick={()=>shareWA(p)} style={{fontSize:14,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}} title={t('whatsapp')}>💬</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  const buildLabel = t('buildTab') || 'Build'
  const libraryLabel = t('libraryTab') || 'Library'

  return(
    <div style={{display:'flex',flexDirection:'column',gap:24}}>
      <RevealCard>
        <div style={{background:'var(--ink-900)',borderRadius:24,padding:32,position:'relative',overflow:'hidden',display:'flex',alignItems:'center',gap:20}}>
          <img src={dailyBackgroundImage('social',900,600)} alt="" aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.07}}/>
          <motion.div animate={{y:[-2,3,-2]}} transition={{duration:2.5,repeat:Infinity}} style={{position:'relative',zIndex:1,flexShrink:0}}><Icon3D name="globe" tone="gold" active size={26} badgeSize={56}/></motion.div>
          <div style={{position:'relative',zIndex:1}}>
            <MotionHeadline text={t('socialPackTitle')} as="h1" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,3vw,28px)',fontWeight:400,color:'rgba(250,247,242,0.93)',marginBottom:4}}/>
            <p style={{fontSize:13,color:'rgba(250,247,242,0.44)',lineHeight:1.55}}>{t('socialPackDesc')}</p>
          </div>
        </div>
      </RevealCard>

      <div style={{display:'flex',gap:0,background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:12,padding:4,width:'fit-content'}}>
        {['Build','Library'].map(tabKey=>{
          const label = tabKey === 'Build' ? buildLabel : libraryLabel
          return (
            <button key={tabKey} onClick={()=>setTab(tabKey)} style={{padding:'7px 22px',borderRadius:9,fontSize:13,fontWeight:500,cursor:'pointer',background:tab===tabKey?'var(--ink-900)':'transparent',color:tab===tabKey?'var(--text-inverse)':'var(--text-muted)',border:'none',transition:'all var(--dur-fast) ease'}}>
              {label}{tabKey==='Library'&&socialPacks.length>0&&<span style={{marginLeft:6,background:'var(--gold-500)',color:'var(--ink-900)',borderRadius:10,padding:'1px 6px',fontSize:10}}>{socialPacks.length}</span>}
            </button>
          )
        })}
      </div>

      <AnimatePresence mode="wait">
        {tab==='Build'&&(
          <motion.div key="build" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="input-group">
              <label className="input-label">{t('socialTopicLabel')}</label>
              <input className="input-field" style={{fontSize:16}} placeholder="e.g. Sunday service, Grace, Praise Sunday…" value={topic} onChange={e=>setTopic(e.target.value)}/>
            </div>
            <div className="grid-2" style={{gap:12}}>
              <div className="input-group">
                <label className="input-label">{t('socialScriptureLabel')}</label>
                <input className="input-field" placeholder="e.g. Psalm 118:24" value={scripture} onChange={e=>setScripture(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('socialChurchLabel')}</label>
                <input className="input-field" placeholder={user?.church||'Your Church'} value={church} onChange={e=>setChurch(e.target.value)}/>
              </div>
              <div className="input-group">
                <label className="input-label">{t('socialPlatformLabel')}</label>
                <select className="select-field" value={platform} onChange={e=>setPlatform(e.target.value)}>{PLATFORMS.map(p=><option key={p}>{p}</option>)}</select>
              </div>
              <div className="input-group">
                <label className="input-label">{t('socialToneLabel')}</label>
                <select className="select-field" value={tone} onChange={e=>setTone(e.target.value)}>{TONES.map(t=><option key={t}>{t}</option>)}</select>
              </div>
              <div className="input-group" style={{gridColumn:'1/-1'}}>
                <label className="input-label">{t('socialContentTypeLabel')}</label>
                <div style={{display:'flex',flexWrap:'wrap',gap:7}}>
                  {CONTENT_TYPES.map(c=><button key={c} onClick={()=>setContentType(c)} className={`tag ${contentType===c?'tag-dark':'tag-ink'}`} style={{cursor:'pointer',padding:'5px 12px',fontSize:12}}>{c}</button>)}
                </div>
              </div>
            </div>
            <MagneticBtn onClick={gen} disabled={!topic.trim()||loading} className="btn btn-primary btn-lg" style={{width:'100%',justifyContent:'center',gap:10}}>
              {loading?<><span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span>{t('generatingSocial')}</>:<>{t('generateSocialPackBtn')}</>}
            </MagneticBtn>
            <AnimatePresence>{loading&&<LoadingPulse message={t('craftingSocial')}/>}</AnimatePresence>
            <AnimatePresence>
              {!loading&&pack&&(
                <motion.div ref={resultRef} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} style={{display:'flex',flexDirection:'column',gap:14}}>
                  <div className="ai-disclaimer"><span>✦</span><span>{t('aiDisclaimer')}</span></div>
                  {pack.instagram?.length>0&&<PostCard platformName="📸 Instagram" posts={pack.instagram}/>}
                  {pack.whatsapp?.length>0&&<PostCard platformName="💬 WhatsApp Status" posts={pack.whatsapp}/>}
                  {pack.facebook?.length>0&&<PostCard platformName="👥 Facebook" posts={pack.facebook}/>}
                  {pack.quotes?.length>0&&(
                    <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:16,padding:20}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--gold-800)',marginBottom:14}}>{t('quoteCards')}</div>
                      <div style={{display:'flex',flexDirection:'column',gap:8}}>
                        {pack.quotes.map((q,i)=>(
                          <div key={i} style={{background:'white',borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
                            <p style={{fontSize:14,fontFamily:'var(--font-serif)',fontStyle:'italic',color:'var(--text-secondary)',lineHeight:1.65,flex:1}}>"{q}"</p>
                            <div style={{display:'flex',gap:6,flexShrink:0}}>
                              <button onClick={()=>copy(q)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>{t('copy')}</button>
                              <button onClick={()=>shareWA(q)} style={{fontSize:13,background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)'}}>{t('whatsapp')}</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {pack.reelsScript&&(
                    <div style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{t('reelsScript')}</div>
                      <p style={{fontSize:14,color:'var(--text-secondary)',lineHeight:1.75,whiteSpace:'pre-line'}}>{pack.reelsScript}</p>
                      <button onClick={()=>copy(pack.reelsScript)} style={{fontSize:12,color:'var(--gold-700)',background:'none',border:'none',cursor:'pointer',marginTop:8}}>{t('copyScript')}</button>
                    </div>
                  )}
                  {pack.hashtags?.length>0&&(
                    <div style={{background:'var(--bg-card)',border:'1px solid var(--border-subtle)',borderRadius:16,padding:20}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{t('hashtags')}</div>
                      <p style={{fontSize:14,color:'var(--gold-700)',fontWeight:500}}>{pack.hashtags.join(' ')}</p>
                      <button onClick={()=>copy(pack.hashtags.join(' '))} style={{fontSize:12,color:'var(--gold-700)',background:'none',border:'none',cursor:'pointer',marginTop:8}}>{t('copyHashtags')}</button>
                    </div>
                  )}
                  {pack.imagePrompt&&(
                    <div style={{background:'var(--ink-100)',borderRadius:16,padding:20}}>
                      <div style={{fontSize:13,fontWeight:600,marginBottom:10}}>{t('imagePrompt')}</div>
                      <p style={{fontSize:13,color:'var(--text-secondary)',lineHeight:1.65,fontStyle:'italic'}}>{pack.imagePrompt}</p>
                    </div>
                  )}
                  <div style={{display:'flex',gap:10}}>
                    <button onClick={()=>saveSocialPack({title:topic,topic,scripture,platform,tone,contentType,content:pack})} className="btn btn-gold" style={{flex:1,justifyContent:'center',gap:8}}>{t('saveSocialPack')}</button>
                    <button onClick={gen} className="btn btn-outline" style={{padding:'10px 14px'}} title={t('regenerate')}>↺</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
        {tab==='Library'&&(
          <motion.div key="lib" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0}}>
            {socialPacks.length===0
              ?<EmptyState icon="📱" headline={t('noSocialPacks')} body={t('socialLibraryEmpty')} ctaLabel={t('buildSocialPack')} onCta={()=>setTab('Build')}/>
              :<div style={{display:'flex',flexDirection:'column',gap:10}}>
                {socialPacks.map((p,i)=>(
                  <motion.div key={p.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}} style={{display:'flex',alignItems:'center',gap:14,cursor:'pointer'}} onClick={()=>{setPack(p.content);setTopic(p.topic||p.title);setTab('Build')}}>
                    <Icon3D name="globe" tone="gold" active size={17} badgeSize={45}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:14,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{p.title}</div>
                      <div style={{fontSize:11,color:'var(--text-muted)'}}>{p.contentType} · {p.date}</div>
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