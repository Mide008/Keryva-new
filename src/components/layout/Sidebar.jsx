// src/components/layout/Sidebar.jsx
import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import Icon3D, { GLYPHS } from '@/components/ui/Icon3D'

function buildNav(t){
  return [
    {label:'',items:[
      {id:'home',   icon:'home',label:t('navHome')},
      {id:'agent',  icon:'sparkle',label:'Ministry Assistant'},
      {id:'bible',  icon:'book',label:t('navBible')},
      {id:'inspire',icon:'sparkle',label:t('navInspire')},
      {id:'search', icon:'search',label:t('navSearch')},
    ]},
    {label:t('navGrowthSection'),items:[
      {id:'devotional',  icon:'leaf',label:t('navDevotional')},
      {id:'warfare',     icon:'sword',label:t('navWarfare')},
      {id:'confessions', icon:'heart',label:t('navConfessions')},
      {id:'fasting',     icon:'leaf',label:t('navFasting')},
      {id:'prayer', icon:'praying',label:t('navPrayer')},
    ]},
    {label:t('navMinistrySection'),items:[
      {id:'sermon', icon:'megaphone',label:t('navSermon')},
      {id:'sunday', icon:'church',label:t('navSunday')},
      {id:'social', icon:'globe',label:t('navSocial')},
      {id:'study',  icon:'library',label:t('navStudy')},
    ]},
    {label:t('navLibrarySection'),items:[
      {id:'saved',  icon:'bookmark',label:t('navSaved')},
      {id:'projects', icon:'library',label:t('navProjects')},
      {id:'calendar', icon:'calendar',label:t('navCalendar')},
      {id:'service', icon:'church',label:t('navService')},
      {id:'vault', icon:'library',label:t('navVault')},
    ]},
  ]
}

export default function Sidebar(){
  const {activePage,setActivePage,sidebarOpen,setSidebarOpen,sidebarCollapsed,setSidebarCollapsed,user}=useApp()
  const { t } = useTranslation()
  const NAV = buildNav(t)
  const go=id=>{setActivePage(id);setSidebarOpen(false)}

  // Single point of control: this CSS var drives both the aside's own width
  // and .main-content's margin-left (see globals.css), so toggling collapse
  // only needs to touch one variable.
  useEffect(()=>{
    document.documentElement.style.setProperty('--sidebar-w', sidebarCollapsed ? '76px' : '260px')
  },[sidebarCollapsed])

  return(
    <>
      <aside style={{width:'var(--sidebar-w)',flexShrink:0,background:'var(--ink-900)',display:'flex',flexDirection:'column',position:'fixed',left:0,top:0,bottom:0,zIndex:'var(--z-nav)',borderRight:'1px solid rgba(255,255,255,0.05)',transition:'width 0.22s cubic-bezier(0.22,1,0.36,1)'}} className="desktop-only">
        <Inner activePage={activePage} go={go} user={user} NAV={NAV} t={t} collapsed={sidebarCollapsed} onToggleCollapse={()=>setSidebarCollapsed(c=>!c)}/>
      </aside>
      <AnimatePresence>
        {sidebarOpen&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setSidebarOpen(false)}
              style={{position:'fixed',inset:0,background:'rgba(28,23,16,0.55)',backdropFilter:'blur(4px)',WebkitBackdropFilter:'blur(4px)',zIndex:200}}/>
            <motion.aside initial={{x:'-100%'}} animate={{x:0,transition:{type:'spring',damping:28,stiffness:300}}} exit={{x:'-100%',transition:{duration:0.2}}}
              style={{width:260,background:'var(--ink-900)',display:'flex',flexDirection:'column',position:'fixed',left:0,top:0,bottom:0,zIndex:300}}>
              <button onClick={()=>setSidebarOpen(false)} style={{position:'absolute',top:14,right:14,background:'none',border:'none',cursor:'pointer',color:'rgba(250,247,242,0.45)',fontSize:20,display:'flex',padding:6}}>×</button>
              <Inner activePage={activePage} go={go} user={user} NAV={NAV} t={t} collapsed={false}/>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

function Inner({activePage,go,user,NAV,t,collapsed,onToggleCollapse}){
  return(
    <div style={{display:'flex',flexDirection:'column',height:'100%',padding:collapsed?'0 6px':'0 10px',overflow:'hidden'}}>
      <div style={{padding:collapsed?'22px 0 16px':'22px 12px 16px',borderBottom:'1px solid rgba(255,255,255,0.06)',flexShrink:0,textAlign:collapsed?'center':'left',position:'relative'}}>
        <div style={{display:'flex',alignItems:'center',gap:10,justifyContent:collapsed?'center':'flex-start'}}>
          <img src="/logo-mark.png" srcSet="/logo-mark.png 1x, /logo-mark@2x.png 2x" alt="Keryva" width={collapsed?28:32} height={collapsed?28:32} style={{borderRadius:8,flexShrink:0}}/>
          {!collapsed&&<div style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:600,color:'var(--gold-300)',letterSpacing:'-0.01em',lineHeight:1}}>Keryva</div>}
        </div>
        {!collapsed&&<div style={{fontSize:9,letterSpacing:'0.14em',textTransform:'uppercase',color:'rgba(250,247,242,0.25)',marginTop:6}}>From Scripture to Service · OmniCraft Studios</div>}
        {onToggleCollapse&&(
          <button onClick={onToggleCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}
            title={collapsed?'Expand sidebar':'Collapse sidebar'}
            style={{position:'absolute',top:'50%',right:collapsed?-12:-12,transform:'translateY(-50%)',width:24,height:24,borderRadius:'50%',background:'var(--gold-500)',border:'2px solid var(--ink-900)',display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',color:'var(--ink-900)',zIndex:5}}>
            <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" style={{transform:collapsed?'rotate(180deg)':'none',transition:'transform 0.2s'}}>
              <path d="M15 6l-6 6 6 6"/>
            </svg>
          </button>
        )}
      </div>
      <nav style={{flex:1,overflowY:'auto',overflowX:'hidden',paddingTop:8,paddingBottom:8}}>
        {NAV.map((section,si)=>(
          <div key={si}>
            {section.label&&!collapsed&&<div style={{fontSize:9,letterSpacing:'0.13em',textTransform:'uppercase',color:'rgba(250,247,242,0.24)',padding:'var(--space-2) var(--space-4)',marginTop:'var(--space-4)'}}>{section.label}</div>}
            {section.label&&collapsed&&<div style={{height:1,background:'rgba(255,255,255,0.06)',margin:'12px 8px'}}/>}
            {section.items.map((item,ii)=>{
              const active=activePage===item.id
              return(
                <motion.button key={item.id} onClick={()=>go(item.id)} whileTap={{scale:0.97}} title={collapsed?item.label:undefined}
                  initial={{opacity:0,x:-8}} animate={{opacity:1,x:0,transition:{delay:si*0.04+ii*0.03+0.1}}}
                  aria-current={active?'page':undefined}
                  style={{display:'flex',alignItems:'center',gap:collapsed?0:'var(--space-3)',justifyContent:collapsed?'center':'flex-start',padding:collapsed?'11px 0':'10px var(--space-4)',borderRadius:'var(--radius-md)',color:active?'var(--gold-300)':'rgba(250,247,242,0.52)',background:active?'rgba(212,168,75,0.12)':'transparent',fontSize:14,fontWeight:400,cursor:'pointer',width:'100%',border:'none',transition:'all var(--dur-fast) ease',position:'relative'}}>
                  {active&&<span style={{position:'absolute',left:-1,top:'50%',transform:'translateY(-50%)',width:3,height:'60%',background:'var(--gold-400)',borderRadius:'0 2px 2px 0'}}/>}
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} style={{flexShrink:0}}>{GLYPHS[item.icon]}</svg>
                  {!collapsed&&<span style={{flex:1,textAlign:'left'}}>{item.label}</span>}
                  {!collapsed&&active&&<div style={{width:5,height:5,borderRadius:'50%',background:'var(--gold-400)'}}/>}
                </motion.button>
              )
            })}
          </div>
        ))}
      </nav>
      <div style={{padding:collapsed?'12px 0':'12px 4px',borderTop:'1px solid rgba(255,255,255,0.06)',flexShrink:0}}>
        <button onClick={()=>go('settings')} title={collapsed?t('settings'):undefined} style={{display:'flex',alignItems:'center',justifyContent:collapsed?'center':'flex-start',gap:collapsed?0:10,padding:collapsed?'8px 0':'10px var(--space-4)',borderRadius:'var(--radius-md)',color:activePage==='settings'?'var(--gold-300)':'rgba(250,247,242,0.52)',background:activePage==='settings'?'rgba(212,168,75,0.12)':'transparent',width:'100%',border:'none',cursor:'pointer',transition:'all var(--dur-fast) ease'}}>
          <div style={{width:28,height:28,borderRadius:'50%',background:user?.photo?`url(${user.photo}) center/cover`:'linear-gradient(135deg,var(--gold-700),var(--gold-500))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--ink-900)',flexShrink:0}}>{!user?.photo&&(user?.name||'U').slice(0,2).toUpperCase()}</div>
          {!collapsed&&(
            <>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontSize:13,fontWeight:500,color:'rgba(250,247,242,0.85)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{user?.name||'Welcome'}</div>
                <div style={{fontSize:10,color:'rgba(250,247,242,0.33)',textTransform:'capitalize'}}>{user?.type||'believer'}</div>
              </div>
              <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="rgba(250,247,242,0.4)" strokeWidth={1.7}>{GLYPHS.settings}</svg>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
