// src/components/ui/VerifiedBadge.jsx
export default function VerifiedBadge({ status = 'verified', size = 'sm' }) {
  const cfg = {
    verified: { bg: 'var(--sage-100, #E3ECE1)', color: 'var(--sage-700, #3D5A38)', text: 'Scripture verified', icon: (
      <path d="M4 12.5l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    )},
    unverified: { bg: 'var(--terra-100, #F3E4DE)', color: 'var(--terra-600, #A8563E)', text: 'Reference not found — please check', icon: (
      <><path d="M12 9v4M12 17h.01" strokeLinecap="round"/><path d="M10.3 3.86 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.86a2 2 0 0 0-3.4 0Z" strokeLinecap="round" strokeLinejoin="round"/></>
    )},
    checking: { bg: 'var(--gold-50, #FBF3DF)', color: 'var(--gold-700, #8A6217)', text: 'Verifying…', icon: null },
  }
  const c = cfg[status] || cfg.verified
  const fontSize = size === 'sm' ? 10.5 : 12
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: c.bg, color: c.color, borderRadius: 20, padding: size === 'sm' ? '2px 8px' : '4px 10px', fontSize, fontWeight: 600, letterSpacing: '0.01em' }}>
      {c.icon && <svg width={size === 'sm' ? 10 : 12} height={size === 'sm' ? 10 : 12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>{c.icon}</svg>}
      {status === 'checking' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.color, animation: 'pulse 1s infinite' }} />}
      {c.text}
    </span>
  )
}
