import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import EmptyState from '@/components/ui/EmptyState'

const VAULT_TYPES = [
  { key: 'doctrine', label: '📜 Doctrine / Statement of Faith' },
  { key: 'vision', label: '🎯 Vision & Mission' },
  { key: 'sermon', label: '🎙 Previous Sermon Notes' },
  { key: 'manual', label: '📘 Teaching / Leadership Manual' },
  { key: 'terminology', label: '🔤 Ministry Terminology' },
  { key: 'other', label: '📄 Other' },
]

export default function VaultPage() {
  const { vaultItems, saveVaultItem, deleteVaultItem, confirmAction } = useApp()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('doctrine')
  const [content, setContent] = useState('')
  const [filter, setFilter] = useState('all')

  const create = () => {
    if (!title.trim() || !content.trim()) return
    saveVaultItem({ title: title.trim(), type, content: content.trim() })
    setTitle(''); setContent('')
  }

  const filtered = filter === 'all' ? vaultItems : vaultItems.filter(v => v.type === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>📚 Knowledge Vault</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          Add your church's doctrine, vision, past sermons, or leadership materials. The Ministry Assistant can draw from these when you ask — always clearly labelled as <b>your material</b>, never mixed in with Scripture or presented as generated content.
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="input-group">
          <label className="input-label">Title</label>
          <input className="input-field" placeholder="e.g. Our Statement of Faith" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">Type</label>
          <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
            {VAULT_TYPES.map(t => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">Content</label>
          <textarea className="textarea-field" rows={6} placeholder="Paste the text here…" value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>+ Add to Vault</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className={`tag ${filter === 'all' ? 'tag-dark' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '6px 12px' }}>All ({vaultItems.length})</button>
        {VAULT_TYPES.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)} className={`tag ${filter === t.key ? 'tag-gold' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '6px 12px' }}>{t.label}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📚" headline="Nothing here yet." body="Add your church's doctrine, vision, or past sermon notes above." />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="tag tag-gold" style={{ fontSize: 10.5 }}>{VAULT_TYPES.find(t => t.key === v.type)?.label}</span>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 6 }}>{v.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>{v.content}</p>
                  </div>
                  <button onClick={async () => { if (await confirmAction('Remove this from the Vault?', { tone: 'danger', confirmLabel: 'Remove' })) deleteVaultItem(v.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)', flexShrink: 0 }}>🗑</button>
                </div>
              </motion.div>
            ))}
          </div>}
    </div>
  )
}
