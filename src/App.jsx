// src/App.jsx
import { Suspense, lazy, Component, useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
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

// Page registry — one place mapping the activePage key to its component.
// Adding a new page = one line here. Keep-alive, back-nav, scroll memory
// and routing all pick it up automatically.
const PAGES = {
  home:           HomePage,
  inspire:        InspirePage,
  search:         SearchPage,
  sermon:         SermonPage,
  study:          StudyPage,
  bible:          BiblePage,
  prayer:         PrayerPage,
  saved:          SavedPage,
  settings:       SettingsPage,
  sunday:         SundayPackPage,
  social:         SocialPackPage,
  warfare:        SpiritualWarfarePage,
  devotional:     DevotionalPage,
  confessions:    ConfessionsPage,
  agent:          AgentPage,
  fasting:        FastingPage,
  projects:       ProjectsPage,
  calendar:       CalendarPage,
  'year-review':  YearInReviewPage,
  vault:          VaultPage,
  service:        ServiceCentrePage,
}

function Fallback() {
  return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:320,flexDirection:'column',gap:16}}>
      <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
      <p style={{fontSize:14,color:'var(--text-muted)',fontFamily:'var(--font-serif)',fontStyle:'italic'}}>Opening the Word…</p>
    </div>
  )
}

function Shell() {
  const { activePage, confirmRequest, resolveConfirm } = useApp()

  // Unknown page key → home. Preserves the old PageRouter's
  // `default: return <HomePage/>` fallback.
  const normalizedPage = PAGES[activePage] ? activePage : 'home'

  // Lazy-mount on first visit; never unmount after that. Pages that have
  // never been visited aren't rendered at all, so we don't pay for them.
  const [seenPages, setSeenPages] = useState(() => new Set([normalizedPage]))
  useEffect(() => {
    setSeenPages(prev => prev.has(normalizedPage) ? prev : new Set(prev).add(normalizedPage))
  }, [normalizedPage])

  // The page currently in the URL is ALWAYS rendered this pass, even on the
  // very first render after a change (before the effect above has run), so
  // there's no one-frame blank.
  const pagesToRender = useMemo(() => {
    const s = new Set(seenPages)
    s.add(normalizedPage)
    return [...s]
  }, [seenPages, normalizedPage])

  // Per-page scroll memory — one place, no per-page code. A scroll listener
  // on #main-content saves the active page's scrollTop continuously; when a
  // page is revisited, its saved scrollTop is restored on the next frame.
  const scrollMemoryRef = useRef({})
  useEffect(() => {
    const area = document.getElementById('main-content')
    if (!area) return
    const saveScroll = () => { scrollMemoryRef.current[normalizedPage] = area.scrollTop }
    area.addEventListener('scroll', saveScroll, { passive: true })
    const saved = scrollMemoryRef.current[normalizedPage]
    if (saved) {
      requestAnimationFrame(() => {
        const a = document.getElementById('main-content')
        if (a) a.scrollTop = saved
      })
    }
    return () => area.removeEventListener('scroll', saveScroll)
  }, [normalizedPage])

  return (
    <div className="app-shell">
      <OfflineBanner/>
      <Sidebar/>
      <div className="main-content">
        <TopBar/>
        <main className="page-area" id="main-content">
          {pagesToRender.map(name => {
            const Page = PAGES[name]
            if (!Page) return null
            const isActive = name === normalizedPage
            return (
              <motion.div
                key={name}
                initial={{ opacity: 0, y: 10 }}
                animate={isActive ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
                transition={{ duration: isActive ? 0.28 : 0, ease: [0.16, 1, 0.3, 1] }}
                // display:none removes the inactive page from layout, tab
                // order, and the accessibility tree in one shot. React state,
                // hooks, refs and effects inside the page all keep running —
                // only its pixels are gone.
                style={{ display: isActive ? 'block' : 'none' }}
              >
                <Suspense fallback={<Fallback/>}>
                  <Page/>
                </Suspense>
              </motion.div>
            )
          })}
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