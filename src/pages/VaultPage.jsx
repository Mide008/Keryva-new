// src/pages/VaultPage.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import EmptyState from '@/components/ui/EmptyState'
import { useTranslation } from '@/hooks/useTranslation'

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
  const { t, tOpt } = useTranslation()
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
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{t('vaultTitle')}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('vaultDescPre')} <b>{t('vaultDescBold')}</b>{t('vaultDescPost')}
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="input-group">
          <label className="input-label">{t('vaultTitleFieldLabel')}</label>
          <input className="input-field" placeholder={t('vaultTitlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">{t('vaultTypeFieldLabel')}</label>
          <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
            {VAULT_TYPES.map(vt => <option key={vt.key} value={vt.key}>{tOpt('vaultType', vt.label)}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">{t('vaultContentFieldLabel')}</label>
          <textarea className="textarea-field" rows={6} placeholder={t('vaultContentPlaceholder')} value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t('addToVaultBtn')}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')} className={`tag ${filter === 'all' ? 'tag-dark' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '6px 12px' }}>{t('allFilterLabel')} ({vaultItems.length})</button>
        {VAULT_TYPES.map(vt => (
          <button key={vt.key} onClick={() => setFilter(vt.key)} className={`tag ${filter === vt.key ? 'tag-gold' : 'tag-ink'}`} style={{ cursor: 'pointer', padding: '6px 12px' }}>{tOpt('vaultType', vt.label)}</button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📚" headline={t('vaultEmptyHeadline')} body={t('vaultEmptyBody')} />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="tag tag-gold" style={{ fontSize: 10.5 }}>{tOpt('vaultType', VAULT_TYPES.find(vt => vt.key === v.type)?.label)}</span>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 6 }}>{v.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>{v.content}</p>
                  </div>
                  <button onClick={async () => { if (await confirmAction(t('removeFromVaultConfirm'), { tone: 'danger', confirmLabel: t('removeBtn') })) deleteVaultItem(v.id) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)', flexShrink: 0 }}>🗑</button>
                </div>
              </motion.div>
            ))}
          </div>}
    </div>
  )
}