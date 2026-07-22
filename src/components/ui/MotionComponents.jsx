/**
 * Keryva — Motion & Micro-interaction Library
 * Implements all patterns from the reference video:
 * 1. Staggered word-by-word text reveal (hero headlines)
 * 2. Scroll-triggered card entrance with blur
 * 3. Live number counter animation
 * 4. 3D tilt card with mouse parallax + floating tooltips
 * 5. Orbital icon ring
 * 6. Animated network/node graph
 * 7. Live ticker feed (scroll-up items)
 * 8. Magnetic button with glow ripple
 * 9. Shimmer gold text sweep
 * 10. Scroll progress indicator
 */
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, useInView, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'

// ── 1. Staggered Word Reveal ────────────────────────────────
const wordV = {
  hidden: { y:'110%', opacity:0 },
  visible: i => ({ y:'0%', opacity:1, transition:{ delay:i*0.07, duration:0.65, ease:[0.16,1,0.3,1] } }),
}
export function MotionHeadline({ text, style, className, as='h1', once=true }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once, margin:'-8% 0px' })
  const Tag = as
  return (
    <Tag ref={ref} className={className} style={{ ...style, overflow:'hidden' }} aria-label={text}>
      <span style={{ display:'flex', flexWrap:'wrap', gap:'0.26em' }}>
        {text.split(' ').map((word, i) => (
          <span key={i} style={{ overflow:'hidden', display:'inline-block' }}>
            <motion.span custom={i} variants={wordV} initial="hidden" animate={inView?'visible':'hidden'}
              style={{ display:'inline-block', willChange:'transform' }}>
              {word}
            </motion.span>
          </span>
        ))}
      </span>
    </Tag>
  )
}

// ── 2. Scroll-triggered card entrance ──────────────────────
export function RevealCard({ children, delay=0, style, className }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-6% 0px' })
  return (
    <motion.div ref={ref}
      initial={{ opacity:0, y:28, filter:'blur(6px)' }}
      animate={inView ? { opacity:1, y:0, filter:'blur(0px)' } : {}}
      transition={{ delay, duration:0.55, ease:[0.16,1,0.3,1] }}
      style={{ willChange:'transform, opacity, filter', ...style }}
      className={className}>
      {children}
    </motion.div>
  )
}

// ── 3. Number Counter ───────────────────────────────────────
export function CounterNumber({ end, prefix='', suffix='', duration=1.8, style }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-10% 0px' })
  const [display, setDisplay] = useState(0)
  useEffect(() => {
    if (!inView) return
    const start = 0
    const startTime = performance.now()
    const tick = now => {
      const elapsed = (now - startTime) / (duration * 1000)
      const progress = Math.min(elapsed, 1)
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + (end - start) * eased))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [inView, end, duration])
  return (
    <span ref={ref} style={{ fontVariantNumeric:'tabular-nums', ...style }}>
      {prefix}{display.toLocaleString()}{suffix}
    </span>
  )
}

// ── 4. 3D Tilt Card with Floating Tooltip ──────────────────
export function TiltCard({ children, tooltip, style, className }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness:300, damping:30 })
  const sy = useSpring(y, { stiffness:300, damping:30 })
  const rotateX = useTransform(sy, [-0.5, 0.5], ['8deg', '-8deg'])
  const rotateY = useTransform(sx, [-0.5, 0.5], ['-8deg', '8deg'])
  const glowX = useTransform(sx, [-0.5, 0.5], ['0%', '100%'])
  const glowY = useTransform(sy, [-0.5, 0.5], ['0%', '100%'])
  const [hovered, setHovered] = useState(false)
  const [tipPos, setTipPos] = useState({ x:0, y:0 })

  const onMove = useCallback(e => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left) / rect.width - 0.5
    const ny = (e.clientY - rect.top) / rect.height - 0.5
    x.set(nx); y.set(ny)
    setTipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top - 48 })
  }, [x, y])

  const onLeave = useCallback(() => { x.set(0); y.set(0); setHovered(false) }, [x, y])

  return (
    <motion.div ref={ref}
      style={{ perspective:800, ...style }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={onLeave}
      className={className}>
      <motion.div style={{ rotateX, rotateY, transformStyle:'preserve-3d', position:'relative', width:'100%', height:'100%' }}>
        {children}
        {/* Glow layer */}
        <motion.div style={{
          position:'absolute', inset:0, borderRadius:'inherit', pointerEvents:'none', zIndex:1,
          background: useTransform([glowX, glowY], ([gx, gy]) => `radial-gradient(circle at ${gx} ${gy}, rgba(212,168,75,0.14) 0%, transparent 60%)`),
          opacity: hovered ? 1 : 0, transition:'opacity 0.2s',
        }}/>
        {/* Tooltip */}
        {tooltip && (
          <AnimatePresence>
            {hovered && (
              <motion.div initial={{opacity:0,scale:0.85,y:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:0.9,y:4}} transition={{duration:0.18}}
                style={{ position:'absolute', left:tipPos.x, top:tipPos.y, transform:'translateX(-50%)', background:'var(--ink-900)', color:'var(--text-inverse)', borderRadius:10, padding:'10px 14px', fontSize:12, fontWeight:500, whiteSpace:'nowrap', boxShadow:'var(--shadow-xl)', pointerEvents:'none', zIndex:50, transformOrigin:'center bottom' }}>
                {tooltip}
                <div style={{ position:'absolute', bottom:-5, left:'50%', transform:'translateX(-50%)', width:10, height:10, background:'var(--ink-900)', borderRadius:2, rotate:'45deg' }}/>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── 5. Orbital Icon Ring ────────────────────────────────────
const ORBIT_ITEMS = ['📖','✝️','🙏','✨','🕊','🔥','💛','⭐']
export function OrbitalRing({ size=200, radius=80, duration=18 }) {
  return (
    <div style={{ width:size, height:size, position:'relative', flexShrink:0 }}>
      {/* Center core */}
      <motion.div animate={{ scale:[1,1.08,1], boxShadow:['0 0 0 0 rgba(212,168,75,0.4)','0 0 0 16px rgba(212,168,75,0)','0 0 0 0 rgba(212,168,75,0)'] }} transition={{ duration:2.5, repeat:Infinity }}
        style={{ position:'absolute', left:'50%', top:'50%', transform:'translate(-50%,-50%)', width:52, height:52, borderRadius:'50%', background:'linear-gradient(135deg,var(--gold-600),var(--gold-400))', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, zIndex:2 }}>
        📖
      </motion.div>
      {/* Orbit ring */}
      {ORBIT_ITEMS.map((icon, i) => {
        const angle = (i / ORBIT_ITEMS.length) * 360
        const delay = -(i / ORBIT_ITEMS.length) * duration
        return (
          <motion.div key={i}
            animate={{ rotate:360 }}
            transition={{ duration, repeat:Infinity, ease:'linear', delay }}
            style={{ position:'absolute', left:'50%', top:'50%', width:0, height:0, transformOrigin:'0 0' }}>
            <motion.div
              animate={{ rotate:-360 }}
              transition={{ duration, repeat:Infinity, ease:'linear', delay }}
              style={{ position:'absolute', left:radius, top:-16, width:32, height:32, borderRadius:'50%', background:'white', border:'1.5px solid var(--border-gold)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, boxShadow:'var(--shadow-sm)' }}>
              {icon}
            </motion.div>
          </motion.div>
        )
      })}
      {/* Orbit path */}
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%', opacity:0.15 }}>
        <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="var(--gold-500)" strokeWidth={1} strokeDasharray="4 6"/>
      </svg>
    </div>
  )
}

// ── 6. Animated Node Graph ──────────────────────────────────
const NODES = [
  { id:'core',   x:50,  y:50,  label:'Keryva',    emoji:'📖', primary:true },
  { id:'sermon', x:20,  y:20,  label:'Sermons',      emoji:'🎙' },
  { id:'prayer', x:80,  y:22,  label:'Prayer',       emoji:'🙏' },
  { id:'bible',  x:15,  y:65,  label:'Bible',        emoji:'📚' },
  { id:'inspire',x:82,  y:68,  label:'Inspiration',  emoji:'✨' },
  { id:'study',  x:50,  y:82,  label:'Study',        emoji:'🔍' },
]
export function NodeGraph({ width=340, height=200 }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once:true, margin:'-5% 0px' })
  const lines = NODES.slice(1).map(n => ({ from:NODES[0], to:n }))
  return (
    <div ref={ref} style={{ position:'relative', width, height, maxWidth:'100%' }}>
      <svg style={{ position:'absolute', inset:0, width:'100%', height:'100%' }}>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="rgba(212,168,75,0.5)"/>
          </marker>
        </defs>
        {lines.map((l, i) => {
          const x1 = l.from.x/100*width, y1 = l.from.y/100*height
          const x2 = l.to.x/100*width,   y2 = l.to.y/100*height
          return (
            <motion.line key={i} x1={x1} y1={y1} x2={x1} y2={y1}
              animate={inView ? { x2, y2 } : { x2:x1, y2:y1 }}
              transition={{ delay:i*0.12+0.3, duration:0.6, ease:[0.16,1,0.3,1] }}
              stroke="rgba(212,168,75,0.35)" strokeWidth={1.5} strokeDasharray="4 4" markerEnd="url(#arrow)"/>
          )
        })}
      </svg>
      {NODES.map((node, i) => (
        <motion.div key={node.id}
          initial={{ opacity:0, scale:0 }}
          animate={inView ? { opacity:1, scale:1 } : {}}
          transition={{ delay:i*0.1+0.1, duration:0.4, ease:[0.34,1.56,0.64,1] }}
          style={{ position:'absolute', left:`${node.x}%`, top:`${node.y}%`, transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <motion.div animate={{ y:[-2,2,-2] }} transition={{ duration:3+i*0.5, repeat:Infinity, ease:'easeInOut' }}
            style={{ width:node.primary?48:36, height:node.primary?48:36, borderRadius:'50%', background:node.primary?'linear-gradient(135deg,var(--gold-600),var(--gold-400))':'white', border:`${node.primary?'none':'1.5px solid var(--border-gold)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:node.primary?20:15, boxShadow:node.primary?'var(--shadow-gold)':'var(--shadow-sm)' }}>
            {node.emoji}
          </motion.div>
          <span style={{ fontSize:9, fontWeight:500, color:'var(--text-muted)', whiteSpace:'nowrap', letterSpacing:'0.05em' }}>{node.label}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── 7. Live Ticker Feed ─────────────────────────────────────
const FEED = [
  { icon:'✨', text:'New verse found for "Hope in trials"',         time:'just now' },
  { icon:'🙏', text:'Prayer answered — Financial breakthrough',     time:'2m ago'  },
  { icon:'🎙', text:'Sermon saved: "Grace in the Storm"',           time:'5m ago'  },
  { icon:'📖', text:'Bible reading streak — Day 14',                time:'1h ago'  },
  { icon:'🔖', text:'Romans 8:28 saved to collection',              time:'2h ago'  },
]
export function LiveTicker() {
  const [items, setItems] = useState(FEED)
  const [key, setKey] = useState(0)
  useEffect(() => {
    const t = setInterval(() => {
      setItems(prev => {
        const next = [...prev]
        const item = next.pop()
        next.unshift({ ...item, time:'just now', key:Date.now() })
        return next
      })
      setKey(k => k+1)
    }, 4000)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8, overflow:'hidden' }}>
      {items.slice(0,4).map((item, i) => (
        <motion.div key={`${i}-${key}`}
          initial={i===0 ? { opacity:0, y:-20, height:0 } : { opacity:1, y:0 }}
          animate={{ opacity:1, y:0, height:'auto' }}
          transition={{ duration:0.4, ease:[0.16,1,0.3,1] }}
          style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:'var(--radius-md)' }}>
          <span style={{ fontSize:18, flexShrink:0 }}>{item.icon}</span>
          <span style={{ fontSize:13, color:'var(--text-primary)', flex:1, lineHeight:1.4 }}>{item.text}</span>
          <span style={{ fontSize:11, color:'var(--text-muted)', flexShrink:0 }}>{item.time}</span>
        </motion.div>
      ))}
    </div>
  )
}

// ── 8. Magnetic Button ──────────────────────────────────────
export function MagneticBtn({ children, className, onClick, style }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness:200, damping:20 })
  const sy = useSpring(y, { stiffness:200, damping:20 })
  const [mx, setMx] = useState(50)
  const [my, setMy] = useState(50)

  const onMove = e => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const nx = (e.clientX - rect.left - rect.width/2) * 0.25
    const ny = (e.clientY - rect.top - rect.height/2) * 0.25
    x.set(nx); y.set(ny)
    setMx(((e.clientX - rect.left) / rect.width) * 100)
    setMy(((e.clientY - rect.top) / rect.height) * 100)
  }
  const onLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.button ref={ref} className={className} onClick={onClick} onMouseMove={onMove} onMouseLeave={onLeave}
      style={{ x:sx, y:sy, position:'relative', overflow:'hidden', '--mx':`${mx}%`, '--my':`${my}%`, ...style }}>
      <span style={{ position:'absolute', inset:0, background:`radial-gradient(circle at ${mx}% ${my}%, rgba(255,255,255,0.2) 0%, transparent 60%)`, pointerEvents:'none', borderRadius:'inherit' }}/>
      {children}
    </motion.button>
  )
}

// ── 9. Shimmer Gold Text ────────────────────────────────────
export function GoldShimmer({ text, style }) {
  return (
    <span style={{ background:'linear-gradient(90deg,var(--gold-700) 0%,var(--gold-300) 40%,var(--gold-700) 60%,var(--gold-500) 100%)', backgroundSize:'200% auto', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text', animation:'shimmer-text 3s linear infinite', ...style }}>
      {text}
    </span>
  )
}

// ── 10. Scroll Progress Bar ─────────────────────────────────
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)
  useEffect(() => {
    const onScroll = () => {
      const el = document.getElementById('main-content') || document.documentElement
      const h = el.scrollHeight - el.clientHeight
      setProgress(h > 0 ? el.scrollTop / h : 0)
    }
    const el = document.getElementById('main-content') || window
    el.addEventListener('scroll', onScroll, { passive:true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <motion.div style={{ position:'fixed', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,var(--gold-500),var(--gold-300))', transformOrigin:'0%', scaleX:progress, zIndex:999, boxShadow:'0 0 8px rgba(212,168,75,0.5)' }}/>
  )
}

// ── 11. Floating Verse Spotlight (parallax hero card) ───────
export function FloatingCard({ children, style }) {
  const ref = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness:80, damping:18 })
  const sy = useSpring(y, { stiffness:80, damping:18 })

  useEffect(() => {
    const onMove = e => { x.set((e.clientX/window.innerWidth-0.5)*18); y.set((e.clientY/window.innerHeight-0.5)*12) }
    window.addEventListener('mousemove', onMove, { passive:true })
    return () => window.removeEventListener('mousemove', onMove)
  }, [x, y])

  return (
    <motion.div ref={ref} style={{ x:sx, y:sy, ...style }}>
      {children}
    </motion.div>
  )
}
