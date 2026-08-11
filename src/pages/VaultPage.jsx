// src/pages/VaultPage.jsx
import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import EmptyState from '@/components/ui/EmptyState'

// Vault types with labelKey for translation
const VAULT_TYPES = [
  { key: 'doctrine', labelKey: 'vault.typeDoctrine' },
  { key: 'vision', labelKey: 'vault.typeVision' },
  { key: 'sermon', labelKey: 'vault.typeSermon' },
  { key: 'manual', labelKey: 'vault.typeManual' },
  { key: 'terminology', labelKey: 'vault.typeTerminology' },
  { key: 'other', labelKey: 'vault.typeOther' },
]

export default function VaultPage() {
  const { t } = useTranslation()
  const { vaultItems, saveVaultItem, deleteVaultItem, confirmAction } = useApp()
  const [title, setTitle] = useState('')
  const [type, setType] = useState('doctrine')
  const [content, setContent] = useState('')
  const [filter, setFilter] = useState('all')

  const create = () => {
    if (!title.trim() || !content.trim()) {
      // The validation is silent in the original – we'll keep it, but show a toast
      // Since there's no toast import, we'll leave it as is.
      return
    }
    saveVaultItem({ title: title.trim(), type, content: content.trim() })
    setTitle(''); setContent('')
  }

  const filtered = filter === 'all' ? vaultItems : vaultItems.filter(v => v.type === filter)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>{t('vault.title')}</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {t('vault.subtitle')}
        </p>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="input-group">
          <label className="input-label">{t('vault.titleLabel')}</label>
          <input className="input-field" placeholder={t('vault.titlePlaceholder')} value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className="input-group">
          <label className="input-label">{t('vault.typeLabel')}</label>
          <select className="select-field" value={type} onChange={e => setType(e.target.value)}>
            {VAULT_TYPES.map(t => <option key={t.key} value={t.key}>{t(t.labelKey)}</option>)}
          </select>
        </div>
        <div className="input-group">
          <label className="input-label">{t('vault.contentLabel')}</label>
          <textarea className="textarea-field" rows={6} placeholder={t('vault.contentPlaceholder')} value={content} onChange={e => setContent(e.target.value)} />
        </div>
        <button onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>{t('vault.addButton')}</button>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setFilter('all')}
          className={`tag ${filter === 'all' ? 'tag-dark' : 'tag-ink'}`}
          style={{ cursor: 'pointer', padding: '6px 12px' }}>
          {t('vault.filterAll', { count: vaultItems.length })}
        </button>
        {VAULT_TYPES.map(t => (
          <button key={t.key} onClick={() => setFilter(t.key)}
            className={`tag ${filter === t.key ? 'tag-gold' : 'tag-ink'}`}
            style={{ cursor: 'pointer', padding: '6px 12px' }}>
            {t(t.labelKey)}
          </button>
        ))}
      </div>

      {filtered.length === 0
        ? <EmptyState
            icon="📚"
            headline={t('vault.emptyHeadline')}
            body={t('vault.emptyBody')}
          />
        : <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {filtered.map((v, i) => (
              <motion.div key={v.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span className="tag tag-gold" style={{ fontSize: 10.5 }}>
                      {VAULT_TYPES.find(t => t.key === v.type) ? t(VAULT_TYPES.find(t => t.key === v.type).labelKey) : v.type}
                    </span>
                    <p style={{ fontSize: 15, fontWeight: 500, color: 'var(--text-primary)', marginTop: 6 }}>{v.title}</p>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>{v.content}</p>
                  </div>
                  <button onClick={async () => {
                    if (await confirmAction(t('vault.deleteConfirm'), { tone: 'danger', confirmLabel: t('delete') }))
                      deleteVaultItem(v.id)
                  }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--terra-400)', flexShrink: 0 }}>
                    🗑
                  </button>
                </div>
              </motion.div>
            ))}
          </div>}
    </div>
  )
}