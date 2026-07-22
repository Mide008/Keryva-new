import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { TiltCard } from './MotionComponents'

export default function VerseCard({ verse, index=0, compact=false }) {
  const { saveVerse, savedVerses, showToast, setActivePage } = useApp()
  const [exp, setExp] = useState(false)
  const saved = savedVerses.some(s => s.ref === verse.ref)

  const share = () => {
    const m = `*${verse.ref}* (${verse.translation||'KJV'})\n\n_${verse.text}_\n\n— Keryva · OmniCraft Studios 📖`
    window.open(`https://wa.me/?text=${encodeURIComponent(m)}`, '_blank')
    showToast('Shared to WhatsApp','💬')
  }
  const copy = () => {
    navigator.clipboard.writeText(`${verse.text} — ${verse.ref}`).catch(()=>{})
    showToast('Copied','📋')
  }

  return (
    <TiltCard tooltip={`Save ${verse.ref}`} style={{ borderRadius:24 }}>
      <motion.article initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:index*0.07,duration:0.35,ease:[0.16,1,0.3,1]}} className="verse-card">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span className="verse-ref">{verse.ref}</span>
            {verse.translation && <span className="tag tag-gold" style={{fontSize:10}}>{verse.translation}</span>}
          </div>
          <button onClick={()=>saveVerse({ref:verse.ref,translation:verse.translation||'KJV',text:verse.text})}
            style={{background:'none',border:'none',cursor:'pointer',fontSize:18,transition:'transform 0.2s',transform:saved?'scale(1.2)':'scale(1)'}}
            aria-label={saved?'Saved':'Save'}>
            {saved?'🔖':'🏷️'}
          </button>
        </div>
        <p className="verse-text">{verse.text}</p>
        {verse.note && !compact && <div className="verse-note">{verse.note}</div>}
        {!compact && (
          <button onClick={()=>setExp(e=>!e)} style={{fontSize:12,color:'var(--gold-700)',fontWeight:500,marginTop:10,background:'none',border:'none',cursor:'pointer',display:'flex',alignItems:'center',gap:4}}>
            📎 {exp?'Hide context':'Read in context'}
          </button>
        )}
        <AnimatePresence>
          {exp && (
            <motion.div initial={{opacity:0,height:0}} animate={{opacity:1,height:'auto'}} exit={{opacity:0,height:0}} style={{overflow:'hidden',marginTop:10,paddingTop:10,borderTop:'1px solid var(--border-subtle)'}}>
              <p style={{fontSize:13,color:'var(--text-muted)',marginBottom:8}}>Open the Bible Reader to see this passage in full chapter context.</p>
              <button onClick={()=>setActivePage('bible')} style={{fontSize:12,color:'var(--gold-700)',fontWeight:500,background:'none',border:'none',cursor:'pointer'}}>Open Bible Reader →</button>
            </motion.div>
          )}
        </AnimatePresence>
        <div style={{display:'flex',gap:8,marginTop:14,paddingTop:12,borderTop:'1px solid var(--border-subtle)'}}>
          <button onClick={share} className="btn btn-gold btn-sm" style={{flex:1,justifyContent:'center',gap:6}}>💬 WhatsApp</button>
          <button onClick={copy} className="btn btn-outline btn-sm" style={{padding:'7px 14px'}}>📋</button>
          <button onClick={()=>setActivePage('bible')} className="btn btn-outline btn-sm" style={{padding:'7px 14px'}}>📖</button>
        </div>
      </motion.article>
    </TiltCard>
  )
}
