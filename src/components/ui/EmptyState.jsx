import{motion}from'framer-motion'
import Icon3D from './Icon3D'

// Emoji-to-vector-icon map so every existing call site (which passes an emoji
// string) automatically upgrades to the premium 3D badge with zero changes
// needed at each call site.
const ICON_MAP = {
  '🕊':'heart', '📚':'library', '🙏':'praying', '🔖':'bookmark',
  '🎙':'megaphone', '📦':'church', '⚔️':'sword', '📱':'globe',
  '📋':'church', '📖':'book', '✨':'sparkle', '🔍':'search',
}

export default function EmptyState({icon,headline,body,ctaLabel,onCta}){
  const iconName = ICON_MAP[icon]
  return(
    <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
      style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center',padding:'64px 32px',gap:16}}>
      {iconName
        ? <Icon3D name={iconName} tone="gold" active size={26} badgeSize={64}/>
        : <div style={{width:64,height:64,background:'var(--gold-50)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:28,marginBottom:8}}>{icon}</div>
      }
      <h3 style={{fontFamily:'var(--font-serif)',fontSize:22,fontWeight:500,color:'var(--text-primary)'}}>{headline}</h3>
      {body&&<p style={{fontSize:14,color:'var(--text-muted)',maxWidth:300,lineHeight:1.65}}>{body}</p>}
      {ctaLabel&&onCta&&<button className="btn btn-gold" onClick={onCta} style={{marginTop:8}}>{ctaLabel}</button>}
    </motion.div>
  )
}
