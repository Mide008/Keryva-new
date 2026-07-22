import{AnimatePresence,motion}from'framer-motion'
import{useApp}from'@/lib/AppContext'
export default function ToastStack(){
  const{toasts}=useApp()
  return(
    <div style={{position:'fixed',bottom:'calc(var(--bottomnav-h) + 16px)',left:'50%',transform:'translateX(-50%)',zIndex:'var(--z-toast)',display:'flex',flexDirection:'column',alignItems:'center',gap:8,pointerEvents:'none'}}>
      <AnimatePresence>
        {toasts.map(t=>(
          <motion.div key={t.id} initial={{opacity:0,y:16,scale:0.92}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:8,scale:0.95}} transition={{type:'spring',damping:22,stiffness:280}}
            style={{display:'flex',alignItems:'center',gap:10,padding:'12px 20px',background:'var(--ink-800)',color:'var(--text-inverse)',borderRadius:'var(--radius-full)',fontSize:13.5,fontWeight:500,boxShadow:'var(--shadow-lg)',pointerEvents:'all',whiteSpace:'nowrap'}}>
            <span style={{fontSize:15}}>{t.icon}</span><span>{t.message}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
