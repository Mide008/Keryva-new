// src/pages/ConfessionsPage.jsx
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { useAIServices, RESPONSE_LANGUAGES } from '@/lib/aiServices'
import { TRANSLATIONS } from '@/lib/bibleData'
import { RevealCard, MagneticBtn } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'

// Themes with translation keys – these will be added to translations.js
const THEMES = [
  { key: 'healing', labelKey: 'confessions.theme_healing' },
  { key: 'finances', labelKey: 'confessions.theme_finances' },
  { key: 'protection', labelKey: 'confessions.theme_protection' },
  { key: 'family', labelKey: 'confessions.theme_family' },
  { key: 'identity', labelKey: 'confessions.theme_identity' },
  { key: 'peace', labelKey: 'confessions.theme_peace' },
  { key: 'favor', labelKey: 'confessions.theme_favor' },
  { key: 'marriage', labelKey: 'confessions.theme_marriage' },
  { key: 'career', labelKey: 'confessions.theme_career' },
]

export default function ConfessionsPage(){
  const { t } = useTranslation()
  const { showToast, confessions, saveConfessions, deleteConfessions, user, confirmAction, setActivePage, setPendingChapter } = useApp()
  const { ask, loading } = useAI()
  const services = useAIServices(ask)
  const [theme, setTheme] = useState('identity')
  const [tran, setTran] = useState(user.translation || 'KJV')
  const [lang, setLang] = useState(user.language||'en')
  const [result, setResult] = useState(null)
  const [view, setView] = useState('generate')

  const generate = async () => {
    setResult(null)
    const langLabel = RESPONSE_LANGUAGES.find(l=>l.code===lang)?.label || 'English'
    const themeLabel = THEMES.find(t => t.key === theme)?.labelKey ? t(THEMES.find(t => t.key === theme).labelKey) : theme
    const r = await services.generateConfessions({ theme: themeLabel, translation: tran, languageLabel: langLabel })
    if (r) { setResult(r); showToast(t('confessions.successToast'), '🕊') }
    else showToast(t('confessions.errorToast'), '❌')
  }

  const save = () => {
    if (!result) return
    const themeLabel = THEMES.find(t => t.key === theme)?.labelKey ? t(THEMES.find(t => t.key === theme).labelKey) : theme
    saveConfessions({ theme: themeLabel, translation: tran, language: lang, ...result })
    showToast(t('confessions.savedToast'), '🕊')
  }

  const shareWA = () => {
    if (!result) return
    const themeLabel = THEMES.find(t => t.key === theme)?.labelKey ? t(THEMES.find(t => t.key === theme).labelKey) : theme
    const msg = `🕊 *${t('confessions.shareTitle')} — ${themeLabel}*\n\n${result.declarations?.map(d => `✦ ${d.text} (${d.ref})`).join('\n')}\n\n— Keryva · OmniCraft Studios`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    showToast(t('confessions.sharedToast'), '💬')
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
      <RevealCard>
        <div className="card-gold" style={{ padding:26 }}>
          <div style={{ fontSize:10, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--gold-700)', marginBottom:8 }}>{t('confessions.tag')}</div>
          <h1 style={{ fontFamily:'var(--font-serif)', fontSize:'clamp(20px,3vw,28px)', fontWeight:500, color:'var(--text-primary)' }}>{t('confessions.headline')}</h1>
        </div>
      </RevealCard>

      <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border-subtle)', borderRadius:12, padding:4, width:'fit-content' }}>
        {[
          ['generate', `✨ ${t('confessions.tabGenerate')}`],
          ['library', `📁 ${t('confessions.tabSaved', { count: confessions.length })}`]
        ].map(([m,label]) => (
          <button key={m} onClick={() => setView(m)}
            style={{
              padding:'8px 16px', borderRadius:9, fontSize:13, fontWeight:500, cursor:'pointer',
              background: view === m ? 'var(--ink-900)' : 'transparent',
              color: view === m ? 'var(--text-inverse)' : 'var(--text-muted)',
              border:'none'
            }}>
            {label}
          </button>
        ))}
      </div>

      {view === 'generate' && (
        <>
          <RevealCard delay={0.05}>
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
              <div className="input-group">
                <label className="input-label">{t('confessions.focusAreaLabel')}</label>
                <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                  {THEMES.map(th => (
                    <button key={th.key} onClick={() => setTheme(th.key)}
                      className={`tag ${theme === th.key ? 'tag-dark' : 'tag-ink'}`}
                      style={{ cursor:'pointer', padding:'8px 14px', fontSize:13 }}>
                      {t(th.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid-2">
                <div className="input-group">
                  <label className="input-label">{t('confessions.translationLabel')}</label>
                  <select className="select-field" value={tran} onChange={e => setTran(e.target.value)}>
                    {TRANSLATIONS.map(tr => <option key={tr.code} value={tr.code}>{tr.code} — {tr.name}</option>)}
                  </select>
                </div>
                <div className="input-group">
                  <label className="input-label">{t('language')}</label>
                  <select className="select-field" value={lang} onChange={e => setLang(e.target.value)}>
                    {RESPONSE_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                  </select>
                </div>
              </div>
              <MagneticBtn onClick={generate} disabled={loading} className="btn btn-primary btn-lg"
                style={{ width:'100%', justifyContent:'center', gap:10 }}>
                {loading ? (
                  <>
                    <span className="loading-dots">
                      <span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/>
                    </span>
                    {t('confessions.generating')}
                  </>
                ) : (
                  <>🕊 {t('confessions.generateButton')}</>
                )}
              </MagneticBtn>
            </div>
          </RevealCard>

          <AnimatePresence>
            {result && (
              <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {result.declarations?.map((d, i) => (
                  <div key={i} className="verse-card">
                    <span className="verse-ref"
                      style={{ cursor:'pointer', textDecoration:'underline', textDecorationColor:'var(--border-gold)' }}
                      title={t('verseActionGoToBible')}
                      onClick={() => {
                        const m = d.ref?.match(/^(.+?)\s+(\d+):(\d+)/)
                        if (!m) { showToast(t('confessions.cannotOpenRef'), '⚠️'); return }
                        setPendingChapter({
                          bookName: m[1].trim(),
                          chapter: parseInt(m[2], 10),
                          verse: parseInt(m[3], 10),
                          translation: 'KJV'
                        })
                        setActivePage('bible')
                      }}>
                      {d.ref}
                    </span>
                    <p style={{ fontFamily:'var(--font-serif)', fontSize:17, fontStyle:'italic', color:'var(--text-secondary)', lineHeight:1.75, fontWeight:500 }}>
                      "{d.text}"
                    </p>
                  </div>
                ))}
                <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                  <button onClick={save} className="btn btn-gold">🔖 {t('confessions.saveButton')}</button>
                  <button onClick={shareWA} className="btn btn-outline">💬 {t('whatsapp')}</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}

      {view === 'library' && (
        confessions.length === 0
          ? <EmptyState
              icon="🕊"
              headline={t('confessions.emptyHeadline')}
              body={t('confessions.emptyBody')}
              ctaLabel={t('confessions.emptyCta')}
              onCta={() => setView('generate')}
            />
          : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {confessions.map(c => (
                <div key={c.id} className="card">
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>{c.date}</div>
                      <div style={{ fontSize:14, fontWeight:600 }}>{c.theme}</div>
                    </div>
                    <button onClick={async () => {
                      if (await confirmAction(t('confessions.deleteConfirm'), { tone:'danger', confirmLabel:t('delete') }))
                        deleteConfessions(c.id)
                    }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:16, color:'var(--terra-400)' }}>
                      🗑
                    </button>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {c.declarations?.map((d, i) => <p key={i} style={{ fontSize:13, color:'var(--text-secondary)', lineHeight:1.6 }}>✦ {d.text}</p>)}
                  </div>
                </div>
              ))}
            </div>
      )}
    </div>
  )
}