import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import Icon3D from '@/components/ui/Icon3D'
import { useTranslation } from '@/hooks/useTranslation'
import { TRANSLATIONS } from '@/lib/bibleData'
import { RevealCard } from '@/components/ui/MotionComponents'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { idbGetAll, idbClear } from '@/lib/idb'
import PWADiagnostics from '@/components/ui/PWADiagnostics'
import { APP_VERSION, BUILD_DATE } from '@/lib/version'

const LANGS=[{code:'en',label:'English'},{code:'yo',label:'Yoruba'},{code:'ig',label:'Igbo'},{code:'pcm',label:'Nigerian Pidgin'},{code:'fr',label:'French'},{code:'es',label:'Spanish'}]
const TYPES=[{id:'pastor',label:'Pastor / Minister'},{id:'believer',label:'Everyday believer'},{id:'group-leader',label:'Group / cell leader'},{id:'student',label:'Bible student'}]
const DENS=['Pentecostal / Charismatic','Anglican / Episcopal','Baptist','Catholic','Non-denominational','Methodist','Reformed / Presbyterian','Adventist','Prefer not to say']

function Toggle({checked,onChange}){
  return(
    <button role="switch" aria-checked={checked} onClick={onChange} style={{width:44,height:24,borderRadius:12,flexShrink:0,background:checked?'var(--gold-500)':'var(--ink-200)',border:'none',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
      <span style={{position:'absolute',top:3,left:checked?22:3,width:18,height:18,borderRadius:'50%',background:'white',transition:'left 0.2s',boxShadow:'0 1px 4px rgba(0,0,0,0.18)'}}/>
    </button>
  )
}

export default function SettingsPage(){
  const {user,setUser,showToast,theme,setTheme,lowData,setLowData}=useApp()
  const { t } = useTranslation()
  const { canInstall, installed, promptInstall, platform } = useInstallPrompt()
  const [open,setOpen]=useState(null)
  const [notifs,setNotifs]=useState({daily:true,sermon:false,prayer:false})
  const [deleteConfirm,setDeleteConfirm]=useState(false)
  const [fontScale,setFontScale]=useState(()=>parseFloat(localStorage.getItem('rhema_font_scale')||'1'))
  const fileRef=useRef(null)
  const upd=(f,v)=>setUser(u=>({...u,[f]:v}))

  useEffect(()=>{
    document.documentElement.style.setProperty('--font-scale', fontScale)
    localStorage.setItem('rhema_font_scale', String(fontScale))
  },[fontScale])

  const handleLanguageChange = (code) => {
    upd('language', code)
    showToast(`Language: ${LANGS.find(l=>l.code===code)?.label}`, '🌐')
  }

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 2*1024*1024) { showToast(t('imageTooLarge'),'⚠️'); return }
    const reader = new FileReader()
    reader.onload = () => { upd('photo', reader.result); showToast('Profile photo updated','✓') }
    reader.readAsDataURL(file)
  }

  const handleExportData = async () => {
    const localData = {}
    for (let i=0;i<localStorage.length;i++){
      const k = localStorage.key(i)
      try { localData[k] = JSON.parse(localStorage.getItem(k)) } catch { localData[k] = localStorage.getItem(k) }
    }
    const offlineEntries = await idbGetAll()
    const payload = { exportedAt: new Date().toISOString(), user, localStorage: localData, offlineEntries }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `rhema-ai-data-${Date.now()}.json`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
    showToast('Your data was downloaded','📧')
  }

  const handleDeleteData = async () => {
    localStorage.clear()
    await idbClear()
    showToast('All local data deleted','⚠️')
    setTimeout(()=>window.location.reload(), 900)
  }

  const SECTIONS=[
    {id:'profile',icon:'user',label:t('profile'),desc:user.name,content:(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{display:'flex',alignItems:'center',gap:14}}>
          <div onClick={()=>fileRef.current?.click()} style={{width:64,height:64,borderRadius:'50%',background:user.photo?`url(${user.photo}) center/cover`:'linear-gradient(135deg,var(--gold-400),var(--gold-700))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,fontWeight:700,color:'var(--ink-900)',flexShrink:0,cursor:'pointer',border:'2px solid var(--border-gold)'}}>
            {!user.photo && (user.name||'R').slice(0,2).toUpperCase()}
          </div>
          <div>
            <button className="btn btn-outline btn-sm" onClick={()=>fileRef.current?.click()}>📷 {t('changePhoto')||'Change photo'}</button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{display:'none'}}/>
          </div>
        </div>
        <div className="input-group"><label className="input-label">{t('yourName')}</label><input className="input-field" value={user.name||''} onChange={e=>upd('name',e.target.value)}/></div>
        <div className="input-group"><label className="input-label">{t('email')}</label><input className="input-field" value={user.email||''} type="email" onChange={e=>upd('email',e.target.value)}/></div>
        <div className="input-group">
          <label className="input-label">{t('iAm')}</label>
          <div style={{display:'flex',flexWrap:'wrap',gap:8}}>{TYPES.map(ty=><button key={ty.id} onClick={()=>upd('type',ty.id)} className={`tag ${user.type===ty.id?'tag-dark':'tag-ink'}`} style={{cursor:'pointer',padding:'7px 14px',fontSize:12.5}}>{ty.label}</button>)}</div>
        </div>
        <div className="input-group"><label className="input-label">{t('denomination')}</label><select className="select-field" value={user.denomination||''} onChange={e=>upd('denomination',e.target.value)}>{DENS.map(d=><option key={d}>{d}</option>)}</select></div>
        <div className="input-group"><label className="input-label">{t('churchName')}</label><input className="input-field" placeholder="Your church" value={user.church||''} onChange={e=>upd('church',e.target.value)}/></div>
        <button className="btn btn-gold" style={{alignSelf:'flex-start'}} onClick={()=>showToast(t('profileSaved'),'✓')}>{t('saveProfile')}</button>
      </div>
    )},
    {id:'install',icon:'install',label:t('installApp'),desc:installed?t('installedDesc'):(platform.isIOS?'Add via Safari Share menu':platform.isFirefox?'Firefox: use Add to Home screen':platform.isDesktopSafari?'Safari: use Add to Dock':(canInstall?t('installAvailable'):'Use browser menu → Install app')),content:(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:14,fontSize:13,color:'var(--gold-800)',lineHeight:1.65}}>
          {t('installDesc')}
        </div>
        {installed ? (
          <div style={{fontSize:14,fontWeight:500,color:'var(--sage-600)',display:'flex',alignItems:'center',gap:8}}>✅ {t('installedDesc')}</div>
        ) : platform.isIOS ? (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>iPhone/iPad don't let apps trigger install automatically — Apple requires this manual step in Safari:</p>
            <ol style={{fontSize:13.5,color:'var(--text-primary)',lineHeight:2,paddingLeft:20}}>
              <li>Tap the <b>Share</b> icon <span style={{opacity:0.7}}>(square with an arrow, in Safari's toolbar)</span></li>
              <li>Scroll down and tap <b>Add to Home Screen</b></li>
              <li>Tap <b>Add</b> in the top right</li>
            </ol>
            {!platform.isSafari && <p style={{fontSize:12,color:'var(--terra-500)'}}>You're not in Safari right now — this only works from Safari, not Chrome/other browsers on iOS.</p>}
          </div>
        ) : platform.isFirefox ? (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Firefox doesn't support automatic install prompts on any device. Add it manually:</p>
            <ul style={{fontSize:13.5,color:'var(--text-primary)',lineHeight:2,paddingLeft:20}}>
              <li><b>Android:</b> tap the menu (⋮) → <b>Add to Home screen</b></li>
              <li><b>Desktop:</b> Firefox doesn't offer a home-screen install — switch to Chrome or Edge for the full app-like install</li>
            </ul>
            <p style={{fontSize:12,color:'var(--terra-500)'}}>This is also why notifications show the Firefox icon alongside Keryva's — Firefox shows notifications as coming from the browser tab, not a standalone app, until it's added to your home screen and opened from there directly.</p>
          </div>
        ) : platform.isDesktopSafari ? (
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>macOS Safari doesn't fire an automatic prompt. Add it manually:</p>
            <ol style={{fontSize:13.5,color:'var(--text-primary)',lineHeight:2,paddingLeft:20}}>
              <li>Open the <b>File</b> menu → <b>Add to Dock</b> <span style={{opacity:0.7}}>(Safari 17+)</span></li>
              <li>On older Safari, use Share → Add to Dock/Home Screen</li>
            </ol>
          </div>
        ) : canInstall ? (
          <button className="btn btn-gold" onClick={async()=>{const c=await promptInstall();if(c?.outcome==='accepted')showToast(t('installedDesc'),'📲')}} style={{alignSelf:'flex-start'}}>
            📲 {t('installNow')}
          </button>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <p style={{fontSize:13,color:'var(--text-muted)'}}>Your browser hasn't offered an install prompt yet. Two things to try:</p>
            <ul style={{fontSize:13.5,lineHeight:1.9,paddingLeft:20}}>
              <li>Open the browser menu (⋮ or ⋯) and look for <b>Install app</b> / <b>Add to Home screen</b></li>
              <li>If you tested this site before an update, do a hard refresh (or clear site data) so your browser picks up the latest version</li>
            </ul>
          </div>
        )}
        <div style={{borderTop:'1px solid var(--border-subtle)',paddingTop:14,marginTop:4}}>
          <div style={{fontSize:11,fontWeight:600,letterSpacing:'0.06em',textTransform:'uppercase',color:'var(--text-muted)',marginBottom:10}}>Install diagnostics</div>
          <PWADiagnostics/>
        </div>
      </div>
    )},
    {id:'appearance',icon:'textSize',label:t('appearance')||'Appearance',desc:`${theme==='dark'?'Dark':'Light'} · ${Math.round(fontScale*100)}% text`,content:(
      <div style={{display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>Dark mode</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>Easier on the eyes for evening sermon prep</div>
          </div>
          <Toggle checked={theme==='dark'} onChange={()=>setTheme(t=>t==='dark'?'light':'dark')}/>
        </div>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <div style={{fontSize:14,fontWeight:500}}>Low-data mode</div>
            <div style={{fontSize:12,color:'var(--text-muted)'}}>Fewer animations, smaller loads — saves data</div>
          </div>
          <Toggle checked={lowData} onChange={()=>setLowData(v=>!v)}/>
        </div>
        <div className="input-group">
          <label className="input-label">{t('textSize')||'Text size'}</label>
          <input type="range" min="0.85" max="1.4" step="0.05" value={fontScale} onChange={e=>setFontScale(parseFloat(e.target.value))} style={{width:'100%'}}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text-muted)'}}><span>A</span><span style={{fontSize:18}}>A</span></div>
        </div>
        <p style={{fontSize:16*fontScale,color:'var(--text-primary)'}}>Preview: "The Lord is my shepherd, I shall not want."</p>
      </div>
    )},
    {id:'bible',icon:'book',label:t('biblePreferences'),desc:user.translation||'KJV',content:(
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="input-group">
          <label className="input-label">{t('defaultTranslation')}</label>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {TRANSLATIONS.map(tr=>(
              <button key={tr.code} onClick={()=>{upd('translation',tr.code);showToast(`Default: ${tr.name}`,'📖')}}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:10,cursor:'pointer',background:user.translation===tr.code?'var(--gold-50)':'var(--bg-card)',border:`1.5px solid ${user.translation===tr.code?'var(--gold-400)':'var(--border-subtle)'}`,transition:'all 0.15s'}}>
                <div><span style={{fontSize:13,fontWeight:user.translation===tr.code?600:400,marginRight:10}}>{tr.code}</span><span style={{fontSize:12,color:'var(--text-muted)'}}>{tr.name}</span></div>
                <span style={{fontSize:11,color:'var(--ink-300)',maxWidth:140,textAlign:'right'}}>{tr.notes}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    )},
    {id:'notifications',icon:'bell',label:t('notifications'),desc:notifs.daily?`${t('dailyVerse')} at ${user.notifTime||'07:00'}`:t('notificationsDesc'),content:(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {[{key:'daily',label:t('dailyVerse'),desc:t('dailyVerseDesc')},{key:'sermon',label:t('sermonReminder'),desc:t('sermonReminderDesc')},{key:'prayer',label:t('prayerReminder'),desc:t('prayerReminderDesc')}].map(({key,label,desc})=>(
          <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border-subtle)'}}>
            <div><div style={{fontSize:14,fontWeight:500}}>{label}</div><div style={{fontSize:12,color:'var(--text-muted)'}}>{desc}</div></div>
            <Toggle checked={notifs[key]} onChange={()=>setNotifs(n=>({...n,[key]:!n[key]}))}/>
          </div>
        ))}
        {notifs.daily&&<div className="input-group"><label className="input-label">{t('dailyVerseTime')}</label><input type="time" className="input-field" value={user.notifTime||'07:00'} onChange={e=>upd('notifTime',e.target.value)}/></div>}
        <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:12,fontSize:12,color:'var(--gold-800)',lineHeight:1.6}}>
          These fire once you've opened the app that day (foreground or recently backgrounded) — not a guaranteed alarm while the app is fully closed. A true background alarm needs push infrastructure we haven't built yet.
        </div>
        <button className="btn btn-gold" style={{alignSelf:'flex-start'}} onClick={async()=>{
          upd('notifs', notifs)
          if ('Notification' in window) {
            const perm = await Notification.requestPermission()
            if (perm !== 'granted') { showToast('Enable notifications in your browser settings to receive reminders','🔕'); return }
          }
          showToast(t('saveNotifications'),'🔔')
        }}>{t('save')}</button>
      </div>
    )},
    {id:'language',icon:'globe',label:t('language'),desc:LANGS.find(l=>l.code===user.language)?.label||'English',content:(
      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {LANGS.map(l=>(
          <button key={l.code} onClick={()=>handleLanguageChange(l.code)}
            style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',borderRadius:10,cursor:'pointer',background:user.language===l.code?'var(--gold-50)':'var(--bg-card)',border:`1.5px solid ${user.language===l.code?'var(--gold-400)':'var(--border-subtle)'}`,transition:'all 0.15s'}}>
            <span style={{fontSize:14,fontWeight:user.language===l.code?500:400}}>{l.label}</span>
            {user.language===l.code&&<span style={{fontSize:12,color:'var(--gold-700)',fontWeight:600}}>✓ Selected</span>}
          </button>
        ))}
        <p style={{fontSize:11,color:'var(--text-muted)'}}>Nav, actions and core screens are translated. Longer content (sermons, devotionals) is created directly in this language.</p>
      </div>
    )},
    {id:'privacy',icon:'lock',label:t('privacy'),desc:'Local-first storage',content:(
      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:14,fontSize:13,color:'var(--gold-800)',lineHeight:1.65}}>{t('dataPrivacy')}</div>
        <button onClick={handleExportData} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 0',background:'none',border:'none',cursor:'pointer',borderBottom:'1px solid var(--border-subtle)'}}>
          <span style={{fontSize:14}}>{t('downloadData')}</span><span style={{color:'var(--ink-200)'}}>→</span>
        </button>
        {!deleteConfirm
          ?<button onClick={()=>setDeleteConfirm(true)} style={{fontSize:13,color:'var(--terra-500)',fontWeight:500,background:'none',border:'none',cursor:'pointer',padding:0,textAlign:'left'}}>{t('deleteAccount')}</button>
          :<div style={{background:'var(--terra-100)',border:'1px solid rgba(168,90,72,0.25)',borderRadius:12,padding:16}}>
            <p style={{fontSize:14,fontWeight:500,color:'var(--terra-600)',marginBottom:8}}>{t('deleteConfirm')}</p>
            <div style={{display:'flex',gap:10,marginTop:12}}>
              <button onClick={handleDeleteData} className="btn btn-sm" style={{background:'var(--terra-500)',color:'white'}}>{t('yesDelete')}</button>
              <button onClick={()=>setDeleteConfirm(false)} className="btn btn-outline btn-sm">{t('keepAccount')}</button>
            </div>
          </div>
        }
      </div>
    )},
    {id:'about',icon:'info',label:t('about'),desc:`v${APP_VERSION}`,content:(
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div style={{textAlign:'center',padding:'20px 0'}}>
          <div style={{fontFamily:'var(--font-serif)',fontSize:32,fontWeight:600,color:'var(--gold-700)',marginBottom:6}}>Keryva</div>
          <div style={{fontSize:14,color:'var(--text-muted)',fontStyle:'italic',marginBottom:4}}>{t('tagline')}</div>
          <div style={{fontSize:12,color:'var(--text-muted)'}}>v{APP_VERSION} · Built {BUILD_DATE} · {t('builtBy')}</div>
        </div>
        <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,padding:14,fontSize:13,color:'var(--gold-800)',lineHeight:1.7}}>
          {t('aiDisclaimer')}
        </div>
        <button onClick={()=>showToast(t('thankYou'),'⭐')} className="btn btn-outline" style={{justifyContent:'center',gap:8}}>⭐ {t('rateApp')}</button>
        <div style={{textAlign:'center',fontSize:11,color:'var(--text-muted)',paddingTop:8}}>© 2026 OmniCraft Studios. All rights reserved.</div>
      </div>
    )},
  ]

  return(
    <div style={{display:'flex',flexDirection:'column',gap:12}}>
      <RevealCard>
        <div className="card-gold" style={{display:'flex',alignItems:'center',gap:16,marginBottom:4}}>
          <div style={{width:56,height:56,borderRadius:'50%',background:user.photo?`url(${user.photo}) center/cover`:'linear-gradient(135deg,var(--gold-400),var(--gold-700))',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:700,color:'var(--ink-900)',flexShrink:0}}>
            {!user.photo && (user.name||'R').slice(0,2).toUpperCase()}
          </div>
          <div>
            <div style={{fontFamily:'var(--font-serif)',fontSize:20,fontWeight:500}}>{user.name||'Welcome'}</div>
            <div style={{fontSize:13,color:'var(--text-muted)',textTransform:'capitalize',display:'flex',alignItems:'center',gap:8}}>
              {TYPES.find(ty=>ty.id===user.type)?.label||user.type}
              <span className="tag tag-gold" style={{fontSize:10}}>{user.translation}</span>
            </div>
          </div>
        </div>
      </RevealCard>

      {SECTIONS.map((s,i)=>(
        <motion.div key={s.id} className="card" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} style={{padding:0,overflow:'hidden'}}>
          <button onClick={()=>setOpen(open===s.id?null:s.id)} style={{width:'100%',display:'flex',alignItems:'center',gap:14,padding:'14px 20px',background:'none',border:'none',cursor:'pointer',textAlign:'left'}}>
            <Icon3D name={s.icon} tone="gold" active={open===s.id} size={16} badgeSize={36}/>
            <div style={{flex:1}}>
              <div style={{fontSize:14,fontWeight:500}}>{s.label}</div>
              <div style={{fontSize:12,color:'var(--text-muted)',marginTop:1}}>{s.desc}</div>
            </div>
            <motion.span animate={{rotate:open===s.id?90:0}} style={{fontSize:12,color:'var(--text-muted)',transition:'transform 0.15s'}}>›</motion.span>
          </button>
          <AnimatePresence>
            {open===s.id&&(
              <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden'}}>
                <div style={{padding:'0 20px 20px',borderTop:'1px solid var(--border-subtle)',paddingTop:16}}>{s.content}</div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      ))}
    </div>
  )
}
