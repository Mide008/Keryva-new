// src/lib/AppContext.jsx
import React,{createContext,useContext,useState,useCallback,useEffect,useRef} from 'react'
import { idbGet, idbSet } from './idb'
import { startNotificationScheduler } from './notifications'
const Ctx=createContext(null)
function load(){try{const r=localStorage.getItem('rhema_v3');return r?JSON.parse(r):null}catch{return null}}
function save(d){try{localStorage.setItem('rhema_v3',JSON.stringify(d))}catch{}}
const DU={name:'Friend',email:'',type:'pastor',denomination:'Pentecostal / Charismatic',translation:'KJV',language:'en',onboarded:false}
const DS=[{id:1,ref:'Romans 8:28',translation:'NIV',text:'And we know that in all things God works for the good of those who love him, who have been called according to his purpose.'},{id:2,ref:'Philippians 4:13',translation:'KJV',text:'I can do all things through Christ which strengtheneth me.'},{id:3,ref:'Jeremiah 29:11',translation:'NLT',text:'For I know the plans I have for you, says the LORD. They are plans for good and not for disaster, to give you a future and a hope.'}]
const DP=[{id:1,title:'Career direction',text:'Lord, guide my steps and order my path this season.',category:'Personal',urgency:'normal',visibility:'private',status:'praying',suggestedScriptures:[],followUpNotes:'',date:'2026-05-01'},{id:2,title:'Family healing',text:'Complete healing for my family. Touch every sick body.',category:'Family',urgency:'urgent',visibility:'private',status:'answered',suggestedScriptures:[],followUpNotes:'God answered May 14',date:'2026-04-14',answeredDate:'2026-05-14'}]
const DSE=[{id:1,title:'Walking by Faith',topic:'Faith in difficult seasons',audience:'General congregation',denomination:'Pentecostal / Charismatic',tone:'inspirational',length:'45-minute sermon',translation:'KJV',content:null,status:'completed',date:'2026-04-20'}]

export function AppProvider({children}){
  const s=load()
  const[user,setUs]=useState(s?.user||DU)
  const userRef=useRef(user)
  useEffect(()=>{ userRef.current=user },[user])
  useEffect(()=>{ document.documentElement.lang = user.language || 'en' },[user.language])
  useEffect(()=>{
    return startNotificationScheduler(()=>userRef.current)
  },[])
  const[savedVerses,setSaved]=useState(s?.savedVerses||DS)
  const[prayers,setPrayers]=useState(s?.prayers||DP)
  const[sermons,setSermons]=useState(s?.sermons||DSE)
  const[studyGuides,setStudyGuides]=useState(s?.studyGuides||[])
  const[sundayPacks,setSundayPacks]=useState(s?.sundayPacks||[])
  const[socialPacks,setSocialPacks]=useState(s?.socialPacks||[])
  const[verseNotes,setVerseNotes]=useState(s?.verseNotes||[])
  const[warfareEntries,setWarfareEntries]=useState(s?.warfareEntries||[])
  const[devotionals,setDevotionals]=useState(s?.devotionals||[])
  const[confessions,setConfessions]=useState(s?.confessions||[])
  const[vaultItems,setVaultItems]=useState(s?.vaultItems||[])
  const[fastingEntries,setFastingEntries]=useState(s?.fastingEntries||[])
  const[projects,setProjects]=useState(s?.projects||[])
  const[calendarEvents,setCalendarEvents]=useState(s?.calendarEvents||[])
  const[toasts,setToasts]=useState([])
  const[confirmRequest,setConfirmRequest]=useState(null)
  const confirmResolverRef=useRef(null)
  const confirmAction=useCallback((message,opts={})=>{
    return new Promise(resolve=>{
      confirmResolverRef.current=resolve
      setConfirmRequest({message,...opts})
    })
  },[])
  const resolveConfirm=useCallback((val)=>{
    setConfirmRequest(null)
    confirmResolverRef.current?.(val)
    confirmResolverRef.current=null
  },[])
  const[activePage,setActivePageRaw]=useState(()=>new URLSearchParams(window.location.search).get('page')||'home')
  const setActivePage=useCallback((page)=>{
    setActivePageRaw(page)
    window.history.pushState({page},'',`?page=${page}`)
  },[])
  useEffect(()=>{
    // Seed the initial history entry so the very first back-press has a real
    // browser history state to resolve to, and wire real browser back/forward
    // (and the mobile back-gesture, which fires the same popstate event) to
    // in-app navigation instead of leaving the page or doing nothing.
    window.history.replaceState({page:activePage},'',`?page=${activePage}`)
    const onPopState=(e)=>setActivePageRaw(e.state?.page||'home')
    window.addEventListener('popstate',onPopState)
    return ()=>window.removeEventListener('popstate',onPopState)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[])
  const[sidebarOpen,setSidebarOpen]=useState(false)
  const[sidebarCollapsed,setSidebarCollapsed]=useState(()=>localStorage.getItem('rhema_sidebar_collapsed')==='1')
  useEffect(()=>{ localStorage.setItem('rhema_sidebar_collapsed', sidebarCollapsed?'1':'0') },[sidebarCollapsed])
  const[theme,setTheme]=useState(()=>{
    const saved=localStorage.getItem('keryva_theme')
    if(saved)return saved
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  })
  useEffect(()=>{
    document.documentElement.dataset.theme=theme
    localStorage.setItem('keryva_theme',theme)
  },[theme])
  const[lowData,setLowData]=useState(()=>localStorage.getItem('keryva_low_data')==='1')
  useEffect(()=>{
    document.documentElement.dataset.lowdata=lowData?'1':'0'
    localStorage.setItem('keryva_low_data',lowData?'1':'0')
  },[lowData])
  const[pendingVerse,setPendingVerse]=useState(null)
  const[pendingChapter,setPendingChapter]=useState(null)
  const restoredFromIdb=useRef(false)

  useEffect(()=>{
    if(restoredFromIdb.current)return
    restoredFromIdb.current=true
    if(!s?.prayers||s.prayers.length===0){
      idbGet('prayers').then(backup=>{ if(backup&&backup.length) setPrayers(backup) })
    }
  },[])

  useEffect(()=>{ save({user,savedVerses,prayers,sermons,studyGuides,sundayPacks,socialPacks,verseNotes,warfareEntries,devotionals,confessions,fastingEntries,projects,calendarEvents,vaultItems}) },[user,savedVerses,prayers,sermons,studyGuides,sundayPacks,socialPacks,verseNotes,warfareEntries,devotionals,confessions,fastingEntries,projects,calendarEvents,vaultItems])
  useEffect(()=>{ idbSet('prayers',prayers) },[prayers])

  const setUser=useCallback(u=>setUs(p=>({...p,...(typeof u==='function'?u(p):u)})),[])
  const showToast=useCallback((msg,icon='✓')=>{const id=Date.now();setToasts(t=>[...t,{id,message:msg,icon}]);setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)),3200)},[])
  const saveVerse=useCallback(v=>{setSaved(a=>{if(a.find(s=>s.ref===v.ref))return a;return[...a,{...v,id:Date.now(),tags:[],collection:'General'}]});showToast('Verse saved','🔖')},[showToast])
  const removeVerse=useCallback(id=>{setSaved(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const addVerseNote=useCallback((ref,text,note,highlight,tags=[])=>{setVerseNotes(a=>[...a.filter(x=>x.ref!==ref),{id:Date.now(),ref,text,note,highlight,tags,date:new Date().toISOString()}]);showToast('Note saved','📝')},[showToast])
  const addPrayer=useCallback(p=>{const e={...p,id:Date.now(),date:new Date().toISOString().split('T')[0],status:'praying',suggestedScriptures:[],followUpNotes:''};setPrayers(a=>[e,...a]);showToast('Prayer logged','🙏')},[showToast])
  const updatePrayer=useCallback((id,updates)=>setPrayers(a=>a.map(x=>x.id===id?{...x,...updates}:x)),[])
  const deletePrayer=useCallback(id=>{setPrayers(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const saveSermon=useCallback(s=>{
    const existing=s.id?sermons.find(x=>x.id===s.id):null
    const e={...s,id:s.id||Date.now(),date:s.date||new Date().toISOString().split('T')[0]}
    if(existing){
      // snapshot the previous state before overwriting, so it can be restored
      const snapshot={...existing,versionedAt:new Date().toISOString()}
      e.versions=[snapshot,...(existing.versions||[])].slice(0,20) // cap history to last 20
    }
    setSermons(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Sermon saved','📖');return e
  },[showToast,sermons])
  const deleteSermon=useCallback(id=>{setSermons(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const restoreSermonVersion=useCallback((sermonId,versionedAt)=>{
    setSermons(a=>a.map(s=>{
      if(s.id!==sermonId)return s
      const target=(s.versions||[]).find(v=>v.versionedAt===versionedAt)
      if(!target)return s
      const currentSnapshot={...s,versions:undefined,versionedAt:new Date().toISOString()}
      const remaining=(s.versions||[]).filter(v=>v.versionedAt!==versionedAt)
      return {...target,id:s.id,versions:[currentSnapshot,...remaining].slice(0,20)}
    }))
    showToast('Version restored','↺')
  },[showToast])
  const saveStudyGuide=useCallback(g=>{const e={...g,id:g.id||Date.now(),date:g.date||new Date().toISOString().split('T')[0]};setStudyGuides(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Study guide saved','📚');return e},[showToast])
  const saveSundayPack=useCallback(p=>{const e={...p,id:p.id||Date.now(),date:p.date||new Date().toISOString().split('T')[0]};setSundayPacks(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Sunday Pack saved','📋');return e},[showToast])
  const saveSocialPack=useCallback(p=>{const e={...p,id:p.id||Date.now(),date:p.date||new Date().toISOString().split('T')[0]};setSocialPacks(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Social Pack saved','📱');return e},[showToast])

  const saveWarfareEntry=useCallback(e=>{const entry={...e,id:e.id||Date.now(),date:e.date||new Date().toISOString().split('T')[0]};setWarfareEntries(a=>[entry,...a.filter(x=>x.id!==entry.id)]);showToast('Battle plan saved','⚔️');return entry},[showToast])
  const deleteWarfareEntry=useCallback(id=>{setWarfareEntries(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const saveDevotional=useCallback(d=>{const entry={...d,id:d.id||Date.now(),date:d.date||new Date().toISOString().split('T')[0]};setDevotionals(a=>[entry,...a.filter(x=>x.date!==entry.date)]);return entry},[])
  const saveConfessions=useCallback(c=>{const entry={...c,id:c.id||Date.now(),date:c.date||new Date().toISOString().split('T')[0]};setConfessions(a=>[entry,...a.filter(x=>x.id!==entry.id)]);showToast('Declarations saved','🕊')},[showToast])
  const deleteConfessions=useCallback(id=>{setConfessions(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const saveFastingEntry=useCallback(e=>{const entry={...e,id:e.id||Date.now(),date:e.date||new Date().toISOString().split('T')[0]};setFastingEntries(a=>[entry,...a.filter(x=>x.id!==entry.id)]);showToast('Fasting plan saved','🍽');return entry},[showToast])
  const deleteFastingEntry=useCallback(id=>{setFastingEntries(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const logFastingDay=useCallback(entryId=>{
    const today=new Date().toISOString().split('T')[0]
    setFastingEntries(a=>a.map(e=>e.id===entryId?{...e,daysCompleted:[...new Set([...(e.daysCompleted||[]),today])]}:e))
    showToast('Day logged','✅')
  },[showToast])
  const addFastingJournalEntry=useCallback((entryId,journal)=>{
    const today=new Date().toISOString().split('T')[0]
    setFastingEntries(a=>a.map(e=>e.id===entryId?{...e,journal:[{...journal,date:today,loggedAt:new Date().toISOString()},...(e.journal||[])]}:e))
    showToast('Reflection saved','📓')
  },[showToast])
  const completeFastingJourney=useCallback((entryId,review)=>{
    setFastingEntries(a=>a.map(e=>e.id===entryId?{...e,completed:true,completedAt:new Date().toISOString(),endReview:review}:e))
    showToast('Fasting journey completed','🙌')
  },[showToast])

  const saveProject=useCallback(p=>{const e={...p,id:p.id||Date.now(),date:p.date||new Date().toISOString().split('T')[0],items:p.items||[]};setProjects(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Project saved','🗂');return e},[showToast])
  const deleteProject=useCallback(id=>{setProjects(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])
  const addToProject=useCallback((projectId,item)=>{
    setProjects(a=>a.map(p=>p.id===projectId?{...p,items:[...p.items.filter(x=>!(x.type===item.type&&x.id===item.id)),item]}:p))
    showToast('Added to project','🗂')
  },[showToast])
  const removeFromProject=useCallback((projectId,type,itemId)=>{
    setProjects(a=>a.map(p=>p.id===projectId?{...p,items:p.items.filter(x=>!(x.type===type&&x.id===itemId))}:p))
  },[])

  const saveCalendarEvent=useCallback(ev=>{const e={...ev,id:ev.id||Date.now()};setCalendarEvents(a=>[...a.filter(x=>x.id!==e.id),e].sort((x,y)=>new Date(x.date)-new Date(y.date)));showToast('Event saved','📅');return e},[showToast])
  const deleteCalendarEvent=useCallback(id=>{setCalendarEvents(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])

  const saveVaultItem=useCallback(v=>{const e={...v,id:v.id||Date.now(),date:v.date||new Date().toISOString().split('T')[0]};setVaultItems(a=>[e,...a.filter(x=>x.id!==e.id)]);showToast('Saved to Knowledge Vault','📚');return e},[showToast])
  const deleteVaultItem=useCallback(id=>{setVaultItems(a=>a.filter(x=>x.id!==id));showToast('Removed','🗑')},[showToast])

  return(<Ctx.Provider value={{
    user,setUser,
    savedVerses,saveVerse,removeVerse,
    verseNotes,addVerseNote,
    prayers,addPrayer,updatePrayer,deletePrayer,
    sermons,saveSermon,deleteSermon,
    studyGuides,saveStudyGuide,
    sundayPacks,saveSundayPack,
    socialPacks,saveSocialPack,
    warfareEntries,saveWarfareEntry,deleteWarfareEntry,
    devotionals,saveDevotional,
    confessions,saveConfessions,deleteConfessions,
    fastingEntries,saveFastingEntry,deleteFastingEntry,logFastingDay,addFastingJournalEntry,completeFastingJourney,
    projects,saveProject,deleteProject,addToProject,removeFromProject,
    calendarEvents,saveCalendarEvent,deleteCalendarEvent,
    vaultItems,saveVaultItem,deleteVaultItem,
    restoreSermonVersion,
    toasts,showToast,
    confirmAction,confirmRequest,resolveConfirm,
    activePage,setActivePage,
    sidebarOpen,setSidebarOpen,
    sidebarCollapsed,setSidebarCollapsed,
    theme,setTheme,
    lowData,setLowData,
    pendingVerse,setPendingVerse,
    pendingChapter,setPendingChapter,
  }}>{children}</Ctx.Provider>)
}
export function useApp(){const c=useContext(Ctx);if(!c)throw new Error('useApp outside AppProvider');return c}