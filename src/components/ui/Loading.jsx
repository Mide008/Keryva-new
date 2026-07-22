import{motion}from'framer-motion'
export function LoadingPulse({message='Searching the Scriptures…'}){
  return(
    <motion.div initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
      style={{display:'flex',flexDirection:'column',alignItems:'center',gap:16,padding:'48px 24px',textAlign:'center'}}>
      <div style={{width:56,height:56,borderRadius:'50%',background:'var(--gold-100)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:24,animation:'pulse-gold 2s infinite'}}>📖</div>
      <div className="loading-dots"><div className="loading-dot"/><div className="loading-dot"/><div className="loading-dot"/></div>
      <p style={{fontSize:14,color:'var(--text-muted)',fontFamily:'var(--font-serif)',fontStyle:'italic'}}>{message}</p>
    </motion.div>
  )
}
export function SkeletonCard(){
  return(
    <div style={{background:'linear-gradient(145deg,#FFFDF9,#FDF6E8)',border:'1px solid rgba(212,168,75,0.25)',borderRadius:22,padding:'22px 28px',opacity:0.65}}>
      <div style={{display:'flex',gap:10,marginBottom:12}}><div className="skeleton" style={{width:110,height:13,borderRadius:4}}/><div className="skeleton" style={{width:36,height:18,borderRadius:12}}/></div>
      <div className="skeleton" style={{width:'100%',height:15,borderRadius:4,marginBottom:7}}/>
      <div className="skeleton" style={{width:'88%',height:15,borderRadius:4,marginBottom:7}}/>
      <div className="skeleton" style={{width:'72%',height:15,borderRadius:4}}/>
    </div>
  )
}
