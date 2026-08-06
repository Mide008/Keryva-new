import { useState } from 'react'
import { motion } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useTranslation } from '@/hooks/useTranslation'
import EmptyState from '@/components/ui/EmptyState'

const ITEM_SOURCES = [
  { type: 'sermon', label: '🎙 Sermon', key: 'sermons', titleField: 'topic' },
  { type: 'study', label: '📚 Study Guide', key: 'studyGuides', titleField: 'topic' },
  { type: 'sunday', label: '📋 Sunday Pack', key: 'sundayPacks', titleField: 'topic' },
  { type: 'social', label: '📱 Social Pack', key: 'socialPacks', titleField: 'topic' },
  { type: 'fasting', label: '🍽 Fasting Plan', key: 'fastingEntries', titleField: 'goal' },
  { type: 'prayer', label: '🙏 Prayer', key: 'prayers', titleField: 'text' },
]

const PAGE_FOR_TYPE = { sermon: 'sermon', study: 'study', sunday: 'sunday', social: 'social', fasting: 'fasting', prayer: 'prayer' }

export default function ProjectsPage() {
  const { t } = useTranslation()
  const app = useApp()
  const { projects, saveProject, deleteProject, addToProject, removeFromProject, setActivePage, confirmAction, showToast } = app
  const [view, setView] = useState('list')
  const [activeProject, setActiveProject] = useState(null)
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [picker, setPicker] = useState(false)

  const create = () => {
    if (!name.trim()) { showToast('Give the project a name first', '⚠️'); return }
    const p = saveProject({ name: name.trim(), purpose: purpose.trim() })
    setName(''); setPurpose(''); setActiveProject(p); setView('detail')
  }

  const openProject = (p) => { setActiveProject(p); setView('detail') }

  const allAvailableItems = () => ITEM_SOURCES.flatMap(src =>
    (app[src.key] || []).map(item => ({ type: src.type, id: item.id, label: src.label, title: item[src.titleField] || item.title || '(untitled)', date: item.date }))
  )

  const isInProject = (type, id) => (activeProject?.items || []).some(x => x.type === type && x.id === id)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500, marginBottom: 6 }}>🗂 Ministry Projects</h1>
        <p style={{ fontSize: 13.5, color: 'var(--text-muted)' }}>Group sermons, study guides, Sunday Packs, fasting plans, and prayers under one project — like "August Sermon Series" or "21-Day Fast."</p>
      </div>

      {view === 'list' && (
        <>
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div className="input-group">
              <label className="input-label">Project name</label>
              <input className="input-field" placeholder="e.g. August Sermon Series" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="input-group">
              <label className="input-label">Purpose (optional)</label>
              <input className="input-field" placeholder="e.g. Four-part series on faithfulness" value={purpose} onChange={e => setPurpose(e.target.value)} />
            </div>
            <motion.button whileTap={{ scale: 0.96 }} onClick={create} className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>+ Create Project</motion.button>
          </div>

          {projects.length === 0
            ? <EmptyState icon="🗂" headline="No projects yet." body="Create one above to start grouping related ministry materials." />
            : <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 24 }}>
                {projects.map((p, i) => {
                  const items = p.items || []
                  const typeCounts = {}
                  items.forEach(it => { typeCounts[it.type] = (typeCounts[it.type] || 0) + 1 })
                  const presentTypes = ITEM_SOURCES.filter(src => typeCounts[src.type])
                  const dominant = presentTypes[0] || ITEM_SOURCES[0]
                  const stackColors = ['var(--gold-100)', 'var(--sage-100)', 'var(--ink-50)']
                  return (
                    <motion.div key={p.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                      <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{p.name}</p>
                      <p style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 12 }}>{items.length} item{items.length === 1 ? '' : 's'}</p>

                      <motion.div whileHover={{ y: -4 }} onClick={() => openProject(p)} style={{ position: 'relative', width: '100%', maxWidth: 180, height: 140, cursor: 'pointer' }}>
                        {/* Fanned content-type chips peeking from behind the folder */}
                        {presentTypes.slice(0, 3).map((src, si) => (
                          <div key={src.type} style={{
                            position: 'absolute', top: 4, left: `${10 + si * 18}%`, width: 56, height: 72,
                            background: stackColors[si % stackColors.length], borderRadius: 10,
                            border: '1px solid var(--border-subtle)', boxShadow: '0 4px 10px rgba(28,23,16,0.06)',
                            transform: `rotate(${(si - 1) * 7}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
                          }}>{src.label.split(' ')[0]}</div>
                        ))}
                        {/* Folder base */}
                        <div style={{
                          position: 'absolute', bottom: 0, left: 0, right: 0, height: 92, background: 'var(--bg-card)',
                          border: '1px solid var(--border-subtle)', borderRadius: 16, boxShadow: '0 6px 18px rgba(28,23,16,0.08)',
                          display: 'flex', alignItems: 'flex-end', padding: 10,
                        }}>
                          {/* Type icons, bottom-left — stands in for the reference's collaborator avatars */}
                          <div style={{ display: 'flex' }}>
                            {presentTypes.slice(0, 3).map((src, si) => (
                              <div key={src.type} style={{
                                width: 24, height: 24, borderRadius: '50%', background: 'var(--gold-100)',
                                border: '2px solid var(--bg-card)', marginLeft: si === 0 ? 0 : -8,
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12,
                              }}>{src.label.split(' ')[0]}</div>
                            ))}
                            {items.length === 0 && <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>Empty</span>}
                          </div>
                        </div>
                        {/* Decorative sticker, top-right */}
                        <div style={{
                          position: 'absolute', top: -6, right: -6, width: 34, height: 34, borderRadius: 9,
                          background: 'var(--gold-400)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 16, boxShadow: '0 4px 10px rgba(28,23,16,0.15)', transform: 'rotate(8deg)',
                        }}>{dominant.label.split(' ')[0]}</div>
                        {/* Delete */}
                        <button onClick={async (e) => { e.stopPropagation(); if (await confirmAction('Delete this project? Items inside stay saved elsewhere.', { tone: 'danger', confirmLabel: 'Delete' })) deleteProject(p.id) }}
                          style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(28,23,16,0.55)', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer', fontSize: 12, color: '#fff' }}>🗑</button>
                      </motion.div>
                    </motion.div>
                  )
                })}
              </div>}
        </>
      )}

      {view === 'detail' && activeProject && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={() => setView('list')} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>← All Projects</button>
          <div>
            <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500 }}>{activeProject.name}</h2>
            {activeProject.purpose && <p style={{ fontSize: 13.5, color: 'var(--text-muted)', marginTop: 4 }}>{activeProject.purpose}</p>}
          </div>

          <button onClick={() => setPicker(true)} className="btn btn-gold" style={{ alignSelf: 'flex-start' }}>+ Add existing item</button>

          {picker && (
            <div className="card" style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {allAvailableItems().length === 0 && <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Nothing saved yet to add — build a sermon, study guide, or plan first.</p>}
              {allAvailableItems().map(item => (
                <div key={`${item.type}-${item.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 10, background: 'var(--bg-primary)' }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.label}</span>
                    <p style={{ fontSize: 13.5, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.title}</p>
                  </div>
                  {isInProject(item.type, item.id)
                    ? <button onClick={() => removeFromProject(activeProject.id, item.type, item.id)} className="btn btn-outline btn-sm" style={{ flexShrink: 0 }}>Remove</button>
                    : <button onClick={() => { addToProject(activeProject.id, { type: item.type, id: item.id }); setActiveProject(prev => ({ ...prev, items: [...(prev.items || []), { type: item.type, id: item.id }] })) }} className="btn btn-gold btn-sm" style={{ flexShrink: 0 }}>Add</button>}
                </div>
              ))}
              <button onClick={() => setPicker(false)} className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-end' }}>Done</button>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(activeProject.items || []).length === 0
              ? <EmptyState icon="📎" headline="No items linked yet." body="Add sermons, study guides, or plans above to group them here." />
              : (activeProject.items || []).map((it, i) => {
                  const src = ITEM_SOURCES.find(s => s.type === it.type)
                  const full = (app[src?.key] || []).find(x => x.id === it.id)
                  if (!full) return null
                  return (
                    <div key={i} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{src.label}</span>
                        <p style={{ fontSize: 14, fontWeight: 500, color: 'var(--text-primary)' }}>{full[src.titleField] || '(untitled)'}</p>
                      </div>
                      <button onClick={() => setActivePage(PAGE_FOR_TYPE[it.type])} className="btn btn-outline btn-sm">Open</button>
                    </div>
                  )
                })}
          </div>
        </div>
      )}
    </div>
  )
}