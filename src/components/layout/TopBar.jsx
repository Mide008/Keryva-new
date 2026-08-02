import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { GLYPHS } from '@/components/ui/Icon3D'
const TITLES={home:'Dashboard',bible:'Bible Reader',inspire:'Inspiration',search:'Topic Search',sermon:'Sermon Studio',sunday:'Sunday Pack',social:'Social Pack',study:'Study Guide',prayer:'Prayer Desk',saved:'Saved Verses',settings:'Settings'}
export default function TopBar(){
  const{activePage,setSidebarOpen,user}=useApp()
  const h=new Date().getHours()
  const gr=h<12?'Good morning':h<17?'Good afternoon':'Good evening'
  return(
    <header className="topbar" style={{background:'rgba(255,255,255,0.94)',backdropFilter:'blur(20px)',WebkitBackdropFilter:'blur(20px)',display:'flex',alignItems:'center'}}>
      <button className="mobile-only" onClick={()=>setSidebarOpen(true)} aria-label="Open menu" style={{marginRight:12,background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',display:'flex',alignItems:'center',padding:6}}>
        <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
      </button>
      <motion.div key={activePage} initial={{opacity:0,y:4}} animate={{opacity:1,y:0}} transition={{duration:0.2}} style={{flex:1}}>
        {activePage==='home'?(
          <div><div style={{fontSize:13,fontFamily:'var(--font-serif)',color:'var(--text-muted)',lineHeight:1}}>{gr},</div><div style={{fontSize:18,fontFamily:'var(--font-serif)',fontWeight:500,color:'var(--text-primary)',lineHeight:1.2}}>{user?.name||'Friend'}</div></div>
        ):(
          <h1 style={{fontSize:18,fontFamily:'var(--font-serif)',fontWeight:500,color:'var(--text-primary)'}}>{TITLES[activePage]||''}</h1>
        )}
      </motion.div>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <button aria-label="Notifications" style={{background:'none',border:'none',cursor:'pointer',color:'var(--text-muted)',position:'relative',display:'flex',padding:6}}>
          <svg width={19} height={19} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.7 21a2 2 0 0 1-3.4 0"/>
          </svg>
          <span style={{position:'absolute',top:4,right:4,width:7,height:7,borderRadius:'50%',background:'var(--gold-500)',border:'2px solid #FFF'}}/>
        </button>
        <div style={{width:34,height:34,borderRadius:'50%',background:user?.photo?`url(${user.photo}) center/cover`:'linear-gradient(135deg,var(--gold-400),var(--gold-700))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700,color:'var(--ink-900)',cursor:'pointer',boxShadow:'var(--shadow-sm)',flexShrink:0}}>{!user?.photo&&(user?.name||'U').slice(0,2).toUpperCase()}</div>
      </div>
    </header>
  )
}
