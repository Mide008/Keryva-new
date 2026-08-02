// src/App.jsx
import { Suspense, lazy, Component } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AppProvider, useApp } from '@/lib/AppContext'
import Sidebar from '@/components/layout/Sidebar'
import TopBar from '@/components/layout/TopBar'
import BottomNav from '@/components/layout/BottomNav'
import ToastStack from '@/components/ui/Toast'
import OfflineBanner from '@/components/ui/OfflineBanner'
import InstallBanner from '@/components/ui/InstallBanner'
import CookieConsent from '@/components/ui/CookieConsent'
import Onboarding from '@/components/ui/Onboarding'
import ConfirmDialog from '@/components/ui/ConfirmDialog'

const HomePage        = lazy(() => import('@/pages/HomePage'))
const InspirePage     = lazy(() => import('@/pages/InspirePage'))
const SearchPage      = lazy(() => import('@/pages/SearchPage'))
const SermonPage      = lazy(() => import('@/pages/SermonPage'))
const StudyPage       = lazy(() => import('@/pages/StudyPage'))
const BiblePage       = lazy(() => import('@/pages/BiblePage'))
const PrayerPage      = lazy(() => import('@/pages/PrayerPage'))
const SavedPage       = lazy(() => import('@/pages/SavedPage'))
const SettingsPage    = lazy(() => import('@/pages/SettingsPage'))
const SundayPackPage  = lazy(() => import('@/pages/SundayPackPage'))
const SocialPackPage  = lazy(() => import('@/pages/SocialPackPage'))
const SpiritualWarfarePage = lazy(() => import('@/pages/SpiritualWarfarePage'))
const DevotionalPage       = lazy(() => import('@/pages/DevotionalPage'))
const ConfessionsPage      = lazy(() => import('@/pages/ConfessionsPage'))
const AgentPage            = lazy(() => import('@/pages/AgentPage'))
const FastingPage           = lazy(() => import('@/pages/FastingPage'))
const ProjectsPage          = lazy(() => import('@/pages/ProjectsPage'))
const CalendarPage           = lazy(() => import('@/pages/CalendarPage'))
const YearInReviewPage        = lazy(() => import('@/pages/YearInReviewPage'))
const VaultPage              = lazy(() => import('@/pages/VaultPage'))
const ServiceCentrePage      = lazy(() => import('@/pages/ServiceCentrePage'))

function Fallback() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:320,flexDirection:'column',gap:16}}>
      <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
      <p style={{fontSize:14,color:'var(--text-muted)',fontFamily:'var(--font-serif)',fontStyle:'italic'}}>Opening the Word…</p>
    </div>
  )
}

function PageRouter({ page }) {
  switch(page) {
    case 'inspire':  return <InspirePage/>
    case 'search':   return <SearchPage/>
    case 'sermon':   return <SermonPage/>
    case 'study':    return <StudyPage/>
    case 'bible':    return <BiblePage/>
    case 'prayer':   return <PrayerPage/>
    case 'saved':    return <SavedPage/>
    case 'settings': return <SettingsPage/>
    case 'sunday':   return <SundayPackPage/>
    case 'social':   return <SocialPackPage/>
    case 'warfare':  return <SpiritualWarfarePage/>
    case 'devotional': return <DevotionalPage/>
    case 'confessions': return <ConfessionsPage/>
    case 'agent':    return <AgentPage/>
    case 'fasting':  return <FastingPage/>
    case 'projects': return <ProjectsPage/>
    case 'calendar': return <CalendarPage/>
    case 'year-review': return <YearInReviewPage/>
    case 'vault':    return <VaultPage/>
    case 'service':  return <ServiceCentrePage/>
    default:         return <HomePage/>
  }
}

const pv = {
  initial:{ opacity:0, y:10 },
  animate:{ opacity:1, y:0, transition:{ duration:0.28, ease:[0.16,1,0.3,1] } },
  exit:   { opacity:0, y:-6, transition:{ duration:0.16 } },
}

function Shell() {
  const { activePage, confirmRequest, resolveConfirm } = useApp()
  return (
    <div className="app-shell">
      <OfflineBanner/>
      <Sidebar/>
      <div className="main-content">
        <TopBar/>
        <main className="page-area" id="main-content">
          <AnimatePresence mode="wait">
            <motion.div key={activePage} variants={pv} initial="initial" animate="animate" exit="exit">
              <Suspense fallback={<Fallback/>}>
                <PageRouter page={activePage}/>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav/>
      <ToastStack/>
      <InstallBanner/>
      <CookieConsent/>
      <Onboarding/>
      <ConfirmDialog request={confirmRequest} onResolve={resolveConfirm}/>
    </div>
  )
}

class EB extends Component {
  constructor(p) { super(p); this.state = { err: null } }
  static getDerivedStateFromError(e) { return { err: e } }
  render() {
    if (this.state.err) return (
      <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:32,textAlign:'center',background:'#FAF7F2'}}>
        <div style={{fontSize:48}}>📖</div>
        <h1 style={{fontFamily:'Cormorant Garamond,serif',fontSize:28,color:'#1C1710'}}>Something went wrong</h1>
        <p style={{fontSize:14,color:'#8C7B6B',maxWidth:340,lineHeight:1.65}}>{this.state.err?.message}</p>
        <button className="btn btn-gold" onClick={() => window.location.reload()}>Reload Keryva</button>
      </div>
    )
    return this.props.children
  }
}

export default function App() {
  return <EB><AppProvider><Shell/></AppProvider></EB>
}