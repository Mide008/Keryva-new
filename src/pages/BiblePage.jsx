import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { BIBLE_BOOKS, POPULAR_BOOKS, TRANSLATIONS } from '@/lib/bibleData'
import { fetchChapter } from '@/services/bibleApi'
import { VERSE_PROMPTS } from '@/lib/aiServices'
import { RevealCard } from '@/components/ui/MotionComponents'

export default function BiblePage(){
  const { t } = useTranslation()
  const {saveVerse,savedVerses,showToast,setActivePage,setPendingVerse,verseNotes,addVerseNote,pendingChapter,setPendingChapter}=useApp()
  const {ask,loading}=useAI()
  const [view,setView]=useState('books')
  const [book,setBook]=useState(null)
  const [ch,setCh]=useState(1)
  const [tran,setTran]=useState('KJV')
  const [testament,setTestament]=useState('All')
  const [bSearch,setBSearch]=useState('')
  const [jumpMatch,setJumpMatch]=useState(null)

  // Detects "Gen 3", "Genesis 3:16", "1 Cor 13", "jn 3 16" etc while typing —
  // matches the book by full name OR abbreviation (case-insensitive, partial
  // match on the book portion), and captures chapter/verse if present.
  useEffect(()=>{
    const q=bSearch.trim()
    if(!q){setJumpMatch(null);return}
    const m=q.match(/^([1-3]?\s?[a-zA-Z]+)\.?\s+(\d+)(?:[:.\s](\d+))?$/)
    if(!m){setJumpMatch(null);return}
    const bookPart=m[1].trim().toLowerCase().replace(/\s+/g,' ')
    const chapter=parseInt(m[2],10)
    const verse=m[3]?parseInt(m[3],10):null
    const found=BIBLE_BOOKS.find(b=>{
      const name=b.name.toLowerCase()
      const abbr=b.abbr.toLowerCase()
      return name===bookPart||abbr===bookPart||name.startsWith(bookPart)||bookPart.startsWith(abbr)
    })
    if(found&&chapter>=1&&chapter<=found.chapters){
      setJumpMatch({book:found,chapter,verse})
    }else{
      setJumpMatch(null)
    }
  },[bSearch])

  const jumpToReference=()=>{
    if(!jumpMatch)return
    setBook(jumpMatch.book)
    setCh(jumpMatch.chapter)
    setView('reading')
    if(jumpMatch.verse)setPendingVerseNum(jumpMatch.verse)
    setBSearch('')
  }
  const [selected,setSelected]=useState(null)
  const [actionSheet,setActionSheet]=useState(false)
  const [aiResult,setAiResult]=useState(null)
  const [aiType,setAiType]=useState('')
  const [commentary,setCommentary]=useState(null)
  const [verses,setVerses]=useState([])
  const [chapterLoading,setChapterLoading]=useState(false)
  const [chapterNote,setChapterNote]=useState(null)
  const [pendingVerseNum,setPendingVerseNum]=useState(null)

  useEffect(()=>{
    if(!pendingChapter)return
    const found=BIBLE_BOOKS.find(b=>b.name.toLowerCase()===pendingChapter.bookName.toLowerCase())
    if(found){
      setBook(found)
      setCh(Math.min(pendingChapter.chapter,found.chapters))
      if(pendingChapter.translation)setTran(pendingChapter.translation)
      setView('reading')
      if(pendingChapter.verse)setPendingVerseNum(pendingChapter.verse)
    }
    setPendingChapter(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingChapter])

  useEffect(()=>{
    if(view!=='reading'||!book)return
    let cancelled=false
    setChapterLoading(true);setChapterNote(null);setVerses([])
    fetchChapter(book.name,ch,tran).then(res=>{
      if(cancelled)return
      setVerses(res.verses||[])
      setChapterNote(res.note||null)
      setChapterLoading(false)
    })
    return ()=>{cancelled=true}
  },[view,book,ch,tran])

  useEffect(()=>{
    if(!pendingVerseNum||chapterLoading||verses.length===0)return
    const target=verses.find(v=>v.v===pendingVerseNum)
    if(target){
      setSelected(target)
      setTimeout(()=>{
        const el=document.getElementById(`verse-${target.v}`)
        if(el)el.scrollIntoView({behavior:'smooth',block:'center'})
      },150)
    }
    setPendingVerseNum(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[verses,chapterLoading,pendingVerseNum])

  const filtered=BIBLE_BOOKS.filter(b=>{
    const tm=testament==='All'||b.testament===testament
    const sm=!bSearch||b.name.toLowerCase().includes(bSearch.toLowerCase())||b.abbr.toLowerCase().includes(bSearch.toLowerCase())
    return tm&&sm
  })
  const popular=BIBLE_BOOKS.filter(b=>POPULAR_BOOKS.includes(b.name))

  const openAction=(v)=>{setSelected(v);setActionSheet(true);setAiResult(null);setAiType('')}
  const closeAction=()=>{setSelected(null);setActionSheet(false);setAiResult(null)}

  const doAI=async(type)=>{
    if(!selected)return
    setAiType(type);setAiResult(null)
    const ref=`${book?.name} ${ch}:${selected.v}`
    let prompt
    if(type==='explain')prompt=VERSE_PROMPTS.explain(ref,selected.text)
    else if(type==='preach')prompt=VERSE_PROMPTS.preachingAngle(ref,selected.text)
    else if(type==='counsel')prompt=VERSE_PROMPTS.counsellingAngle(ref,selected.text)
    else if(type==='youth')prompt=VERSE_PROMPTS.youthExplanation(ref,selected.text)
    if(prompt){const r=await ask(prompt,'fast');if(r)setAiResult(r)}
  }

  const doAction=(type)=>{
    if(!selected||!book)return
    const ref=`${book.name} ${ch}:${selected.v}`
    if(type==='save'){saveVerse({ref,translation:tran,text:selected.text,collection:'General'})}
    else if(type==='copy'){navigator.clipboard.writeText(`${selected.text} — ${ref} (${tran})`).catch(()=>{});showToast(t('copied'),'📋')}
    else if(type==='share'){const m=`*${ref}* (${tran})\n\n_${selected.text}_\n\n— Keryva · OmniCraft Studios 📖`;window.open(`https://wa.me/?text=${encodeURIComponent(m)}`,'_blank');showToast(t('shareToWhatsApp'),'💬')}
    else if(type==='addSermon'){setPendingVerse({ref,translation:tran,text:selected.text});setActivePage('sermon');showToast(t('verseReadySermon') || 'Verse ready for sermon','🎙')}
    else if(type==='addPrayer'){setPendingVerse({ref,translation:tran,text:selected.text});setActivePage('prayer');showToast(t('verseReadyPrayer') || 'Verse ready for prayer','🙏')}
    else if(type==='addStudy'){setPendingVerse({ref,translation:tran,text:selected.text});setActivePage('study');showToast(t('verseReadyStudy') || 'Verse ready for study guide','📚')}
    else if(type==='addSunday'){setPendingVerse({ref,translation:tran,text:selected.text});setActivePage('sunday');showToast(t('verseReadySunday') || 'Verse ready for Sunday Pack','📋')}
    else if(type==='note'){const n=prompt(`Note for ${ref}:`);if(n)addVerseNote(ref,selected.text,n,null)}
    closeAction()
  }

  return(
    <div style={{display:'flex',flexDirection:'column',gap:20}}>
      <AnimatePresence mode="wait">
        {view==='books'&&(
          <motion.div key="books" initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:12}} style={{display:'flex',flexDirection:'column',gap:16}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{position:'relative',flex:1}}>
                <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',fontSize:15,pointerEvents:'none'}}>🔍</span>
                <input className="input-field" style={{paddingLeft:36}} placeholder="Search books, or type a reference like Gen 3 / John 3:16" value={bSearch} onChange={e=>setBSearch(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&jumpMatch)jumpToReference()}}/>
              </div>
              <select className="select-field" style={{width:'auto',minWidth:80}} value={tran} onChange={e=>setTran(e.target.value)}>
                {TRANSLATIONS.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
            </div>
            {jumpMatch&&(
              <motion.button initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}} onClick={jumpToReference}
                style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',borderRadius:12,background:'var(--ink-900)',color:'var(--text-inverse)',border:'none',cursor:'pointer',width:'100%'}}>
                <span style={{fontSize:14,fontWeight:500}}>Go to {jumpMatch.book.name} {jumpMatch.chapter}{jumpMatch.verse?`:${jumpMatch.verse}`:''}</span>
                <span style={{fontSize:13,opacity:0.7}}>Press Enter →</span>
              </motion.button>
            )}
            <div style={{padding:'10px 14px',background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,fontSize:12,color:'var(--gold-800)'}}>
              <strong>{TRANSLATIONS.find(t=>t.code===tran)?.name}</strong> — {TRANSLATIONS.find(t=>t.code===tran)?.notes}
            </div>
            <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
              {TRANSLATIONS.map(t=><button key={t.code} title={t.name} onClick={()=>setTran(t.code)} className={`tag ${tran===t.code?'tag-dark':'tag-ink'}`} style={{cursor:'pointer',padding:'5px 10px',fontSize:11,fontWeight:tran===t.code?600:400}}>{t.code}</button>)}
            </div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {['All','OT','NT'].map(tst=>{
                const label = tst==='OT' ? t('oldTestament') : tst==='NT' ? t('newTestament') : t('allBooks')
                return <button key={tst} onClick={()=>setTestament(tst)} className={`btn btn-sm ${testament===tst?'btn-primary':'btn-outline'}`}>{label}</button>
              })}
            </div>
            {!bSearch&&testament==='All'&&(
              <div>
                <div style={{fontSize:11,fontWeight:500,color:'var(--text-muted)',letterSpacing:'0.07em',textTransform:'uppercase',marginBottom:10}}>{t('popularBooks')}</div>
                <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                  {popular.map(b=><motion.button key={b.name} whileTap={{scale:0.96}} className="tag tag-gold" style={{cursor:'pointer',padding:'7px 14px',fontSize:13}} onClick={()=>{setBook(b);setCh(1);setView(b.chapters>1?'chapters':'reading')}}>{b.name}</motion.button>)}
                </div>
              </div>
            )}
            <div style={{display:'flex',flexDirection:'column',gap:2}}>
              {filtered.map(b=>(
                <motion.button key={b.name} whileHover={{background:'var(--gold-50)',x:2}} whileTap={{scale:0.99}} onClick={()=>{setBook(b);setCh(1);setView(b.chapters>1?'chapters':'reading')}}
                  style={{display:'flex',alignItems:'center',padding:'11px 14px',borderRadius:'var(--radius-md)',cursor:'pointer',background:'transparent',border:'none',textAlign:'left',transition:'background var(--dur-fast) ease'}}>
                  <div style={{flex:1}}>
                    <span style={{fontSize:14.5,fontWeight:500,color:'var(--text-primary)'}}>{b.name}</span>
                    <span style={{fontSize:11,color:'var(--text-muted)',marginLeft:8}}>{b.chapters} {t('chapters')}</span>
                  </div>
                  <span className="tag" style={{fontSize:10,background:b.testament==='NT'?'var(--gold-100)':'var(--ink-100)',color:b.testament==='NT'?'var(--gold-800)':'var(--ink-500)'}}>{b.testament}</span>
                  <span style={{color:'var(--ink-200)',marginLeft:8,fontSize:14}}>›</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {view==='chapters'&&book&&(
          <motion.div key="chapters" initial={{opacity:0,x:12}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-12}}>
            <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:20}}>
              <button onClick={()=>setView('books')} className="btn btn-outline btn-sm" style={{padding:'7px 12px'}}>← {t('back')}</button>
              <div>
                <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500}}>{book.name}</h2>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{book.chapters} {t('chapters')} · {book.testament==='OT'?t('oldTestament'):t('newTestament')} · {tran}</div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(52px,1fr))',gap:8}}>
              {Array.from({length:book.chapters},(_,i)=>i+1).map(n=>(
                <motion.button key={n} whileHover={{scale:1.07}} whileTap={{scale:0.94}} onClick={()=>{setCh(n);setView('reading')}}
                  style={{padding:'12px 6px',borderRadius:10,fontWeight:500,fontSize:14,background:n===ch?'var(--ink-900)':'var(--bg-card)',color:n===ch?'var(--text-inverse)':'var(--text-primary)',border:`1px solid ${n===ch?'transparent':'var(--border-subtle)'}`,cursor:'pointer',transition:'all var(--dur-fast) ease'}}>
                  {n}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {view==='reading'&&book&&(
          <motion.div key="reading" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}>
            <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:20,flexWrap:'wrap'}}>
              <button onClick={()=>setView('chapters')} className="btn btn-outline btn-sm" style={{padding:'7px 12px'}}>← {t('chapters')}</button>
              <div style={{flex:1}}>
                <h2 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500,lineHeight:1.1}}>{book.name}</h2>
                <div style={{fontSize:12,color:'var(--text-muted)'}}>{t('chapter')} {ch}</div>
              </div>
              <select className="select-field" style={{width:'auto',minWidth:80}} value={tran} onChange={e=>setTran(e.target.value)}>
                {TRANSLATIONS.map(t=><option key={t.code} value={t.code}>{t.code}</option>)}
              </select>
            </div>

            <div style={{lineHeight:1.95,marginBottom:24}}>
              {chapterNote&&(
                <div style={{padding:'10px 14px',background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:10,fontSize:12,color:'var(--gold-800)',marginBottom:16,lineHeight:1.6}}>
                  ⓘ {chapterNote}
                </div>
              )}
              {chapterLoading&&(
                <div style={{textAlign:'center',padding:40}}>
                  <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
                  <p style={{fontSize:13,color:'var(--text-muted)',marginTop:12}}>Loading {book.name} {ch}…</p>
                </div>
              )}
              {!chapterLoading&&verses.map(v=>(
                <span key={v.v} id={`verse-${v.v}`} style={{cursor:'pointer'}} onClick={()=>openAction(v)}>
                  <sup style={{fontSize:10,fontWeight:600,color:'var(--gold-600)',marginRight:3,verticalAlign:'super'}}>{v.v}</sup>
                  <span style={{fontFamily:'var(--font-serif)',fontSize:'clamp(16px,2vw,18px)',color:selected?.v===v.v?'var(--ink-900)':'var(--ink-700)',background:selected?.v===v.v?'rgba(212,168,75,0.18)':'transparent',borderRadius:3,padding:'1px 2px',transition:'all var(--dur-fast) ease',lineHeight:1.9}}>
                    {v.text}{' '}
                  </span>
                </span>
              ))}
            </div>

            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:20,borderTop:'1px solid var(--border-subtle)'}}>
              <button onClick={()=>{if(ch>1){setCh(c=>c-1)}}} disabled={ch<=1} className="btn btn-outline" style={{gap:6,opacity:ch<=1?0.35:1}}>{t('previous')}</button>
              <span style={{fontSize:13,color:'var(--text-muted)'}}>{ch}/{book.chapters}</span>
              <button onClick={()=>{if(ch<book.chapters){setCh(c=>c+1)}}} disabled={ch>=book.chapters} className="btn btn-outline" style={{gap:6,opacity:ch>=book.chapters?0.35:1}}>{t('next')}</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Verse action bottom sheet */}
      <AnimatePresence>
        {actionSheet&&selected&&(
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={closeAction}
              style={{position:'fixed',inset:0,background:'rgba(28,23,16,0.5)',backdropFilter:'blur(4px)',zIndex:200}}/>
            <motion.div initial={{y:'100%'}} animate={{y:0}} exit={{y:'100%'}} transition={{type:'spring',damping:28,stiffness:300}}
              style={{position:'fixed',bottom:0,left:0,right:0,background:'var(--bg-card)',borderRadius:'24px 24px 0 0',padding:'20px 20px calc(env(safe-area-inset-bottom,0px) + 20px)',zIndex:300,maxHeight:'85vh',overflowY:'auto'}}>
              <div style={{width:36,height:4,background:'var(--ink-200)',borderRadius:2,margin:'0 auto 20px'}}/>
              <div style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:12,padding:14,marginBottom:16}}>
                <div style={{fontSize:11,fontWeight:500,color:'var(--gold-700)',marginBottom:6}}>{book?.name} {ch}:{selected.v} · {tran}</div>
                <p style={{fontFamily:'var(--font-serif)',fontSize:15,fontStyle:'italic',color:'var(--ink-800)',lineHeight:1.7}}>{selected.text}</p>
              </div>
              {/* Primary actions */}
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:16}}>
                {[
                  ['save','🔖', t('verseActionSave')],
                  ['copy','📋', t('verseActionCopy')],
                  ['share','💬', t('verseActionWhatsapp')],
                  ['addSermon','🎙', t('verseActionAddSermon')],
                  ['addPrayer','🙏', t('verseActionAddPrayer')],
                  ['addStudy','📚', t('verseActionAddStudy')],
                  ['addSunday','📋', t('verseActionAddSunday')],
                  ['note','📝', t('verseActionAddNote')]
                ].map(([type,e,label])=>(
                  <button key={type} onClick={()=>doAction(type)}
                    style={{display:'flex',flexDirection:'column',alignItems:'center',gap:5,padding:'12px 8px',borderRadius:12,background:'var(--bg-primary)',border:'1px solid var(--border-subtle)',cursor:'pointer',transition:'all var(--dur-fast) ease'}}>
                    <span style={{fontSize:22}}>{e}</span>
                    <span style={{fontSize:11,fontWeight:500,color:'var(--text-secondary)',textAlign:'center',lineHeight:1.2}}>{label}</span>
                  </button>
                ))}
              </div>
              {/* AI actions */}
              <div style={{fontSize:11,fontWeight:500,color:'var(--text-muted)',letterSpacing:'0.06em',textTransform:'uppercase',marginBottom:10}}>{t('aiInsights')}</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:aiResult?16:0}}>
                {[
                  ['explain', t('explain')],
                  ['preach', t('preachingAngle')],
                  ['counsel', t('counselling')],
                  ['youth', t('youthFriendly')]
                ].map(([type,label])=>(
                  <button key={type} onClick={()=>doAI(type)} disabled={loading}
                    className={`btn btn-sm ${aiType===type?'btn-gold':'btn-outline'}`}>{label}</button>
                ))}
              </div>
              {loading&&aiType&&<div style={{padding:'12px 0'}}><div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div></div>}
              {aiResult&&!loading&&(
                <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} style={{background:'var(--gold-50)',border:'1px solid var(--border-gold)',borderRadius:12,padding:16,marginTop:8}}>
                  <div style={{fontSize:11,fontWeight:500,color:'var(--gold-700)',marginBottom:8}}>
                    {aiType==='explain'?t('explanation'):aiType==='preach'?t('preachingAngles'):aiType==='counsel'?t('counsellingAngle'):t('youthFriendlyLabel')}
                  </div>
                  <p style={{fontSize:14,color:'var(--ink-700)',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{aiResult}</p>
                  <button onClick={()=>{navigator.clipboard.writeText(aiResult).catch(()=>{});showToast(t('copied'),'📋')}} style={{fontSize:12,color:'var(--gold-700)',background:'none',border:'none',cursor:'pointer',marginTop:8}}>📋 {t('copy')}</button>
                </motion.div>
              )}
              <button onClick={closeAction} className="btn btn-outline" style={{width:'100%',justifyContent:'center',marginTop:16}}>{t('close')}</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}