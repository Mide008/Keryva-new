// src/components/ui/Icon3D.jsx
// Vector icon set + premium "3D" badge wrapper. Real SVG glyphs replace the
// old emoji-as-structural-icon pattern (emoji render inconsistently across
// platforms and can't be themed) — used for nav, section headers, and
// primary action tiles throughout the app.

const GLYPHS = {
  home: (
    <path d="M4 11.5 12 4l8 7.5M6 10v9h4v-5h4v5h4v-9" strokeLinecap="round" strokeLinejoin="round" />
  ),
  book: (
    <>
      <path d="M12 6.5c-1.6-1.2-4-1.8-7-1.5v13c3 -.3 5.4.3 7 1.5m0-13c1.6-1.2 4-1.8 7-1.5v13c-3-.3-5.4.3-7 1.5m0-13v13" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  sword: (
    <path d="M14.5 3 20 8.5 10.5 18l-3-3L17.5 5M5 20l4-4M3 22l2.5-2.5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  praying: (
    <path d="M12 3v6M12 9c0 3-2 4-2 7a2 2 0 0 0 4 0c0-3-2-4-2-7ZM8 12c-1 1-2 2-2 4a2 2 0 0 0 4 0M16 12c1 1 2 2 2 4a2 2 0 0 1-4 0" strokeLinecap="round" strokeLinejoin="round" />
  ),
  bookmark: (
    <path d="M6 3h12v18l-6-4.5L6 21V3Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  sparkle: (
    <path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6L12 3ZM19 15l.7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  search: (
    <path d="M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14ZM21 21l-4.35-4.35" strokeLinecap="round" strokeLinejoin="round" />
  ),
  leaf: (
    <path d="M5 20c9 0 14-5 14-14V5h-1C9 5 5 10 5 19v1Z M5 20c2-6 5-9 10-11" strokeLinecap="round" strokeLinejoin="round" />
  ),
  megaphone: (
    <path d="M3 11v2a2 2 0 0 0 2 2h1l2 6h2l-1-6h2l9 4V6l-9 4H6a2 2 0 0 0-2 2Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  church: (
    <path d="M12 3v3m-2 2 2-2 2 2M6 21V11l6-4 6 4v10M6 21h12M9 21v-5h6v5" strokeLinecap="round" strokeLinejoin="round" />
  ),
  library: (
    <path d="M4 21V6l3-2 3 2v15M11 21V4l3-1 3 1v17M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
  ),
  settings: (
    <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19.4 13.5a7.7 7.7 0 0 0 0-3l2-1.4-2-3.5-2.3.9a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.5 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.3-.9-2 3.5 2 1.4a7.7 7.7 0 0 0 0 3l-2 1.4 2 3.5 2.3-.9c.77.66 1.65 1.17 2.6 1.5l.5 2.5h4l.5-2.5a7.6 7.6 0 0 0 2.6-1.5l2.3.9 2-3.5-2-1.4Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  install: (
    <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 17v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" strokeLinecap="round" strokeLinejoin="round" />
  ),
  globe: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.8 5.7 3.8 9s-1.3 6.5-3.8 9c-2.5-2.5-3.8-5.7-3.8-9s1.3-6.5 3.8-9Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  heart: (
    <path d="M12 21s-7.5-4.6-10-9.3C.4 8.4 2.3 5 5.7 5 8 5 10 6.3 12 8.6 14 6.3 16 5 18.3 5c3.4 0 5.3 3.4 3.7 6.7C19.5 16.4 12 21 12 21Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  user: (
    <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4 21c0-4 3.6-7 8-7s8 3 8 7" strokeLinecap="round" strokeLinejoin="round" />
  ),
  bell: (
    <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9ZM13.7 21a2 2 0 0 1-3.4 0" strokeLinecap="round" strokeLinejoin="round" />
  ),
  lock: (
    <path d="M6 11V8a6 6 0 1 1 12 0v3M5 11h14v10H5V11Zm7 5v2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  info: (
    <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5v.01" strokeLinecap="round" strokeLinejoin="round" />
  ),
  textSize: (
    <path d="M4 7V5h11v2M9.5 5v14M7 19h5M15 12h5M17.5 12v7M16 19h3" strokeLinecap="round" strokeLinejoin="round" />
  ),
  calendar: (
    <path d="M7 3v3M17 3v3M4 9h16M5 6h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  sun: (
    <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z" strokeLinecap="round" strokeLinejoin="round" />
  ),
  shield: (
    <path d="M12 3l7 3v6c0 4.5-3 8-7 9-4-1-7-4.5-7-9V6l7-3ZM9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
  ),
  scroll: (
    <path d="M8 3h11v14a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 0-3-3h6ZM9 8h6M9 12h6" strokeLinecap="round" strokeLinejoin="round" />
  ),
  chart: (
    <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" strokeLinecap="round" strokeLinejoin="round" />
  ),
  check: (
    <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
  ),
}

// Warm gold-to-ink gradient badge with an inner bevel highlight and soft
// ambient glow — this is the "premium 3D" treatment applied consistently
// wherever a structural icon appears (nav, quick actions, section headers).
export default function Icon3D({ name, size = 22, badgeSize = 44, tone = 'gold', active = false }) {
  const glyph = GLYPHS[name] || GLYPHS.sparkle
  const uid = `${name}-${tone}-${active ? 'a' : 'i'}`
  const tones = {
    gold: { from: '#F2D98A', to: '#B8862E', stroke: '#3A2A0E' },
    ink: { from: '#4A4438', to: '#1C1710', stroke: '#EFE6D4' },
    sage: { from: '#B9CDB6', to: '#5C7A57', stroke: '#1C2A18' },
  }
  const c = tones[tone] || tones.gold

  return (
    <div
      style={{
        width: badgeSize,
        height: badgeSize,
        borderRadius: badgeSize * 0.32,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: active
          ? `linear-gradient(155deg, ${c.from} 0%, ${c.to} 100%)`
          : 'var(--bg-card, #fff)',
        border: active ? 'none' : '1.5px solid var(--border-subtle, #e8e2d4)',
        boxShadow: active
          ? `0 1px 0 rgba(255,255,255,0.5) inset, 0 -3px 6px rgba(0,0,0,0.18) inset, 0 6px 14px -4px rgba(184,134,46,0.45)`
          : '0 1px 3px rgba(0,0,0,0.05)',
        transition: 'all 0.2s ease',
        flexShrink: 0,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={active ? c.stroke : 'var(--text-muted, #8a8272)'}
        strokeWidth={1.6}
        style={{ filter: active ? 'drop-shadow(0 1px 1px rgba(255,255,255,0.35))' : 'none' }}
      >
        {glyph}
      </svg>
    </div>
  )
}

export { GLYPHS }
