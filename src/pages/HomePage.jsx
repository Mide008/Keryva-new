import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import { getTodayVerse, TOPICS, MOODS, dailyBackgroundImage } from '@/lib/bibleData'
import { MotionHeadline, RevealCard, CounterNumber, OrbitalRing, LiveTicker, MagneticBtn, GoldShimmer, NodeGraph, ScrollProgress, FloatingCard } from '@/components/ui/MotionComponents'
import Icon3D from '@/components/ui/Icon3D'
import { generateQuoteCardImage, downloadQuoteCard } from '@/lib/quoteCard'

const today = getTodayVerse()
function getWeeklyTopic(){
  const d=new Date(); const start=new Date(d.getFullYear(),0,1)
  const week=Math.ceil((((d-start)/86400000)+start.getDay()+1)/7)
  return TOPICS[week % TOPICS.length]
}
const weeklyTopic = getWeeklyTopic()

export default function HomePage() {
  const { setActivePage, savedVerses, prayers, sermons, showToast, user, setPendingChapter } = useApp()
  const { t } = useTranslation()
  const [q, setQ] = useState('')

  const share = () => {
    const m = `*${today.ref}* (${today.translation})\n\n_${today.text}_\n\n— Keryva · OmniCraft Studios 📖`
    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`, '_blank')
    showToast(t('shareToWhatsApp'), '💬')
  }

  const downloadCard = () => {
    const dataUrl = generateQuoteCardImage({ text: today.text, reference: `${today.ref} · ${today.translation}` })
    downloadQuoteCard(dataUrl, `rhema-${today.ref.replace(/\s+/g,'-').toLowerCase()}.png`)
    showToast('Quote card downloaded', '🖼️')
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:40}}>
      <ScrollProgress/>

      {/* Hero — daily verse */}
      <RevealCard>
        <div style={{borderRadius:28,overflow:'hidden',position:'relative',minHeight:280,background:'var(--ink-900)'}}>
          <img src={dailyBackgroundImage('home-hero',1200,700)}
            alt="" aria-hidden="true"
            style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',opacity:0.08,filter:'sepia(80%)'}}/>
          <div style={{position:'absolute',top:-60,right:-60,width:260,height:260,background:'radial-gradient(circle,rgba(212,168,75,0.18) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative',zIndex:1,padding:'40px 36px'}}>
            <div style={{fontSize:10,letterSpacing:'0.18em',textTransform:'uppercase',color:'var(--gold-400)',marginBottom:14,display:'flex',alignItems:'center',gap:8}}>
              <motion.span animate={{opacity:[0.4,1,0.4]}} transition={{duration:2,repeat:Infinity}}>✦</motion.span>
              {t('verseOfDay')} · {new Date().toLocaleDateString('en-GB',{month:'long',day:'numeric',year:'numeric'})}
            </div>
            <FloatingCard style={{maxWidth:580}}>
              <p style={{fontFamily:'var(--font-serif)',fontSize:'clamp(18px,2.6vw,26px)',fontStyle:'italic',fontWeight:300,lineHeight:1.85,color:'rgba(250,247,242,0.95)',marginBottom:20}}>
                "{today.text}"
              </p>
            </FloatingCard>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>
              <div>
                <span style={{fontSize:13,color:'var(--gold-300)',fontWeight:500}}>{today.ref}</span>
                <span style={{fontSize:11,color:'rgba(250,247,242,0.35)',marginLeft:8}}>— {today.translation}</span>
              </div>
              <div style={{display:'flex',gap:8}}>
                <MagneticBtn onClick={share} className="btn btn-gold btn-sm">{t('shareVerse')}</MagneticBtn>
                <button onClick={downloadCard} className="btn btn-sm" style={{background:'rgba(255,255,255,0.10)',color:'rgba(250,247,242,0.80)',border:'1px solid rgba(255,255,255,0.12)'}}>🖼️ Save image</button>
                <button onClick={()=>{
                  const m = today.ref.match(/^(.+?)\s+(\d+):/)
                  if (m) setPendingChapter({ bookName: m[1], chapter: parseInt(m[2],10), translation: today.translation||'KJV' })
                  setActivePage('bible')
                }} className="btn btn-sm" style={{background:'rgba(255,255,255,0.10)',color:'rgba(250,247,242,0.80)',border:'1px solid rgba(255,255,255,0.12)'}}>{t('readChapter')}</button>
              </div>
            </div>
          </div>
        </div>
      </RevealCard>

      {/* Search */}
      <RevealCard delay={0.06}>
        <form onSubmit={e=>{e.preventDefault();if(q.trim().length>1)setActivePage('inspire')}} style={{position:'relative'}}>
          <span style={{position:'absolute',left:18,top:'50%',transform:'translateY(-50%)',fontSize:18,pointerEvents:'none'}}>🔍</span>
          <input className="input-search" style={{paddingLeft:50}} placeholder={t('searchHome')}
            value={q} onChange={e=>setQ(e.target.value)} aria-label="Search scripture"/>
          {q.length>1 && (
            <motion.button type="submit" initial={{opacity:0,scale:0.85}} animate={{opacity:1,scale:1}}
              className="btn btn-primary btn-sm" style={{position:'absolute',right:8,top:'50%',transform:'translateY(-50%)',gap:6}}>
              {t('find')}
            </motion.button>
          )}
        </form>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:14}}>
          {TOPICS.slice(0,10).map(topic => (
            <motion.button key={topic.key} className="tag tag-gold" whileHover={{scale:1.05}} whileTap={{scale:0.96}}
              onClick={()=>{sessionStorage.setItem('rhema_search_query', t(topic.labelKey)); setActivePage('inspire')}} style={{cursor:'pointer',fontSize:12,padding:'5px 13px'}}>{t(topic.labelKey)}</motion.button>
          ))}
        </div>
      </RevealCard>

      {/* Stats counter row */}
      <RevealCard delay={0.1}>
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
          {[
            {end:31102,suffix:'+',label:'Verses'},
            {end:66,label:'Books'},
            {end:15,label:'Translations'},
            {end:4,label:'Engines'},
          ].map((s,i)=>(
            <motion.div key={s.label} className="stat-card"
              initial={{opacity:0,scale:0.88}} animate={{opacity:1,scale:1}} transition={{delay:0.15+i*0.06}}>
              <div className="stat-number">
                <CounterNumber end={s.end} suffix={s.suffix||''} duration={1.6}/>
              </div>
              <div className="stat-label">{s.label}</div>
            </motion.div>
          ))}
        </div>
      </RevealCard>

      {/* Quick actions — 2x2 grid */}
      <RevealCard delay={0.12}>
        <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500,marginBottom:16,color:'var(--text-primary)'}}>
          {t('whereWouldYouGo')}
        </h2>
        <div className="grid-2" style={{gap:14}}>
          {[
            {id:'agent',icon:'sparkle',tone:'ink',label:'Ministry Assistant',desc:'Ask in your own words',bg:'linear-gradient(135deg,#EDE4F0,#D8C8E8)'},
            {id:'inspire',icon:'sparkle',tone:'gold',label:t('getInspired'),desc:t('getInspiredDesc'),bg:'linear-gradient(135deg,#FDF6E8,#F5E6C8)'},
            {id:'warfare',icon:'sword',tone:'ink',label:t('navWarfare'),desc:t('warfareCardDesc'),bg:'linear-gradient(135deg,#F3E8E8,#E8D0D0)'},
            {id:'devotional',icon:'leaf',tone:'sage',label:t('navDevotional'),desc:t('devotionalCardDesc'),bg:'linear-gradient(135deg,#F5F0E0,#EBDFC0)'},
            {id:'sermon', icon:'megaphone',tone:'ink',label:t('sermonBuilder'),desc:t('sermonBuilderDesc'),bg:'linear-gradient(135deg,#F5EDE8,#EDD5C8)'},
            {id:'bible',  icon:'book',tone:'gold',label:t('bibleReader'),desc:t('bibleReaderDesc'),bg:'linear-gradient(135deg,#EBF0EB,#D8E8D6)'},
            {id:'prayer', icon:'praying',tone:'sage',label:t('prayerJournal'),desc:t('prayerJournalDesc'),bg:'linear-gradient(135deg,#EDE8F0,#D8D0E8)'},
          ].map((a,i)=>(
            <motion.button key={a.id} onClick={()=>setActivePage(a.id)}
              whileHover={{y:-4,boxShadow:'0 16px 40px rgba(28,23,16,0.12)'}} whileTap={{scale:0.97}}
              initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:0.18+i*0.07}}
              style={{background:a.bg,border:'1px solid var(--border-subtle)',borderRadius:20,padding:22,display:'flex',flexDirection:'column',gap:12,cursor:'pointer',textAlign:'left',transition:'box-shadow 0.2s'}}>
              <motion.div animate={{y:[-2,2,-2]}} transition={{duration:3+i*0.4,repeat:Infinity,ease:'easeInOut'}}>
                <Icon3D name={a.icon} tone={a.tone} active size={20} badgeSize={44}/>
              </motion.div>
              <div>
                <div style={{fontSize:15,fontWeight:500,color:'var(--text-primary)',marginBottom:3}}>{a.label}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{a.desc}</div>
              </div>
              <span style={{fontSize:16,color:'var(--ink-200)',marginTop:'auto'}}>→</span>
            </motion.button>
          ))}
        </div>
      </RevealCard>

      {/* Mood selector */}
      <RevealCard delay={0.14}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500}}>{t('howAreYouFeeling')}</h2>
          <button onClick={()=>setActivePage('inspire')} style={{fontSize:13,color:'var(--gold-700)',fontWeight:500,background:'none',border:'none',cursor:'pointer'}}>{t('getAWord')}</button>
        </div>
        <div className="mood-grid">
          {MOODS.map(m=>(
            <motion.button key={m.key} className="mood-chip" onClick={()=>{sessionStorage.setItem('rhema_search_query', t(m.labelKey)); setActivePage('inspire')}} whileTap={{scale:0.92}} whileHover={{y:-3}}>
              <span className="mood-emoji">{m.emoji}</span>
              <span className="mood-label">{t(m.labelKey)}</span>
            </motion.button>
          ))}
        </div>
      </RevealCard>

      {/* Activity summary */}
      <RevealCard delay={0.16}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500}}>{t('yourActivity')}</h2>
          <span style={{fontSize:18}}>📊</span>
        </div>
        <div className="card" style={{padding:0,overflow:'hidden'}}>
          {[
            {icon:'bookmark',text:`${savedVerses.length} ${t('savedVersesCount')}`,sub:t('inYourCollection'),go:'saved'},
            {icon:'praying',text:`${prayers.length} ${t('prayerRequests')}`,sub:`${prayers.filter(p=>p.answered).length} ${t('answered')}`,go:'prayer'},
            {icon:'megaphone',text:`${sermons.length} ${t('sermonCount')}`,sub:t('inYourLibrary'),go:'sermon'},
          ].map((item,i)=>(
            <motion.button key={i} onClick={()=>setActivePage(item.go)} whileHover={{background:'var(--gold-50)'}}
              style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 20px',cursor:'pointer',background:'none',border:'none',textAlign:'left',borderBottom:i<2?'1px solid var(--border-subtle)':'none',transition:'background var(--dur-fast) ease'}}>
              <Icon3D name={item.icon} tone="gold" active size={16} badgeSize={36}/>
              <div style={{flex:1}}>
                <div style={{fontSize:14,fontWeight:500,color:'var(--text-primary)'}}>{item.text}</div>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{item.sub}</div>
              </div>
              <span style={{color:'var(--ink-200)',fontSize:16}}>→</span>
            </motion.button>
          ))}
        </div>
      </RevealCard>

      {/* Live ticker */}
      <RevealCard delay={0.18}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500}}>{t('liveActivity')}</h2>
          <motion.div animate={{opacity:[1,0.4,1]}} transition={{duration:2,repeat:Infinity}} style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--sage-500)',fontWeight:500}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:'var(--sage-500)',display:'inline-block'}}/>LIVE
          </motion.div>
        </div>
        <LiveTicker/>
      </RevealCard>

      {/* Orbital ring + node graph */}
      <RevealCard delay={0.2}>
        <div style={{background:'linear-gradient(135deg,var(--gold-50),var(--bg-secondary))',borderRadius:24,padding:32,display:'flex',alignItems:'center',justifyContent:'space-around',flexWrap:'wrap',gap:24}}>
          <div style={{flex:1,minWidth:200}}>
            <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--gold-700)',marginBottom:10}}>✦ {t('weeklyFocusLabel')}</div>
            <MotionHeadline text={t(weeklyTopic.labelKey)} as="h2" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,2.5vw,28px)',fontWeight:500,color:'var(--text-primary)',lineHeight:1.25,marginBottom:12}}/>
            <p style={{fontSize:13,color:'var(--text-muted)',lineHeight:1.7,marginBottom:16}}>{t('weeklyFocusDesc')}</p>
            <button onClick={()=>{sessionStorage.setItem('rhema_search_query', t(weeklyTopic.labelKey)); setActivePage('inspire')}} className="btn btn-outline btn-sm" style={{gap:6}}>✦ {t('exploreThisWeek')}</button>
          </div>
          <OrbitalRing size={220} radius={88} duration={20}/>
        </div>
      </RevealCard>

      {/* Node graph */}
      <RevealCard delay={0.22}>
        <div style={{background:'var(--bg-card)',borderRadius:24,padding:28,border:'1px solid var(--border-subtle)'}}>
          <div style={{fontSize:10,letterSpacing:'0.14em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:16}}>✦ {t('platformArchitecture')}</div>
          <MotionHeadline text={t('everythingConnects')} as="h2" style={{fontFamily:'var(--font-serif)',fontSize:'clamp(20px,2.5vw,28px)',fontWeight:500,color:'var(--text-primary)',marginBottom:20}}/>
          <div style={{display:'flex',justifyContent:'center'}}>
            <NodeGraph width={360} height={220}/>
          </div>
        </div>
      </RevealCard>

      {/* Bottom image quote */}
      <RevealCard delay={0.24}>
        <div style={{borderRadius:24,overflow:'hidden',position:'relative'}}>
          <img src={dailyBackgroundImage('home-secondary',900,600)}
            alt="Open Bible on wooden table" style={{width:'100%',height:200,objectFit:'cover',display:'block'}}/>
          <div style={{position:'absolute',inset:0,background:'linear-gradient(to top,rgba(28,23,16,0.90) 0%,rgba(28,23,16,0.10) 100%)',display:'flex',alignItems:'flex-end',padding:24}}>
            <div>
              <p style={{fontFamily:'var(--font-serif)',fontSize:15,fontStyle:'italic',color:'rgba(250,247,242,0.92)',lineHeight:1.65,marginBottom:6}}>
                "{t('bottomQuote')}"
              </p>
              <span style={{fontSize:11,color:'var(--gold-300)'}}>{t('bottomRef')}</span>
            </div>
          </div>
        </div>
        <div style={{textAlign:'center',marginTop:12,fontSize:11,color:'var(--text-muted)'}}>
          Keryva · {t('builtByOmni')} <GoldShimmer text="OmniCraft Studios" style={{fontSize:11,fontWeight:600}}/>
        </div>
      </RevealCard>
    </div>
  )
}