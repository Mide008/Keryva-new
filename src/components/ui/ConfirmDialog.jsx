// src/components/ui/ConfirmDialog.jsx
import { AnimatePresence, motion } from 'framer-motion'

export default function ConfirmDialog({ request, onResolve }) {
  if (!request) return null
  const { message, detail, confirmLabel = 'Confirm', tone = 'default' } = request
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={() => onResolve(false)}
        style={{ position: 'fixed', inset: 0, background: 'rgba(21,17,11,0.55)', backdropFilter: 'blur(4px)', zIndex: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.98 }}
          onClick={e => e.stopPropagation()}
          style={{ background: 'var(--bg-card)', borderRadius: 18, padding: 24, maxWidth: 380, width: '100%', boxShadow: 'var(--shadow-xl)' }}
        >
          <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.5, marginBottom: detail ? 6 : 18 }}>{message}</p>
          {detail && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 18 }}>{detail}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={() => onResolve(false)} className="btn btn-outline btn-sm">Cancel</button>
            <button
              onClick={() => onResolve(true)}
              className="btn btn-sm"
              style={{ background: tone === 'danger' ? 'var(--terra-500)' : 'var(--gold-500)', color: tone === 'danger' ? '#fff' : 'var(--ink-900)', fontWeight: 600 }}
            >
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
