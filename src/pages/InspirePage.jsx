import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { languageLabelFor } from '@/lib/aiServices'
import { useTranslation } from '@/hooks/useTranslation'
import { MOODS } from '@/lib/bibleData'
import { RevealCard } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'

function parseRefForBible(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)/)
  if (!m) return null
  return { bookName: m[1].trim(), chapter: parseInt(m[2],10), verse: parseInt(m[3],10) }
}

export default function InspirePage() {
  const { showToast, setActivePage, user, setPendingVerse, setPendingChapter } = useApp()
  const { ask, loading, error } = useAI()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [selectedMood, setSelectedMood] = useState(null)
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const resultsRef = useRef(null)
  const [recentSearches, setRecentSearches] = useState(()=>{
    try { return JSON.parse(localStorage.getItem('rhema_recent_searches')||'[]') } catch { return [] }
  })
  const addRecentSearch = (term) => {
    if (!term?.trim()) return
    setRecentSearches(prev => {
      const next = [term, ...prev.filter(x=>x.toLowerCase()!==term.toLowerCase())].slice(0,6)
      localStorage.setItem('rhema_recent_searches', JSON.stringify(next))
      return next
    })
  }

  const handleSearch = async (e, override) => {
    e?.preventDefault()
    const searchTerm = (override ?? query).trim() || (selectedMood ? t(selectedMood.labelKey) : '')
    if (!searchTerm) {
      showToast(t('noQuery') || 'Please enter a topic or select a mood', '⚠️')
      return
    }

    setHasSearched(true)
    addRecentSearch(searchTerm)
    setResults([])

    try {
      const prompt = `
        You are a pastoral AI assistant. The user is seeking scripture guidance.
        Their situation or feeling: "${searchTerm}".
        Suggest 4-6 relevant Bible verses. For each, provide the reference, the full verse text, and a brief reason.
        Return a valid JSON object with no extra text:
        {
          "verses": [
            { "reference": "Isaiah 41:10", "text": "Fear not, for I am with you...", "reason": "God promises his presence and strength." },
            ...
          ],
          "pastoral_note": "A warm, encouraging message (2-3 sentences)."
        }
        ${languageLabelFor(user.language)!=='English' ? `Respond fully in ${languageLabelFor(user.language)}.\n        ` : ''}Do not include any markdown or extra text. Return ONLY the JSON.
      `
      const response = await ask(prompt)
      if (response) {
        let parsed
        try {
          const jsonMatch = response.match(/\{[\s\S]*\}/)
          parsed = JSON.parse(jsonMatch ? jsonMatch[0] : response)
        } catch {
          parsed = { verses: [], pastoral_note: response }
        }
        setResults(parsed.verses || [])
        if (parsed.verses?.length === 0) {
          showToast(t('noVersesFound'), '📖')
        } else {
          showToast(`${parsed.verses.length} ${t('versesFound')}`, '✨')
          setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
        }
      } else {
        // ask() returned null — all AI engines failed. Surface the real reason
        // instead of doing nothing (this was the root cause of "search does nothing").
        showToast(error || t('aiRequestFailed'), '❌')
      }
    } catch (err) {
      console.error('Search error:', err)
      showToast(t('aiRequestFailed'), '❌')
    }
  }

  // Quick-chip handoff from Home (mood/topic tap) — prefill and run immediately
  // instead of landing on an empty page.
  useEffect(() => {
    const pending = sessionStorage.getItem('rhema_search_query')
    if (pending) {
      sessionStorage.removeItem('rhema_search_query')
      setQuery(pending)
      handleSearch(null, pending)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleMoodClick = (mood) => {
    setSelectedMood(mood)
    const label = t(mood.labelKey)
    setQuery(label)
    handleSearch(null, label)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <RevealCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: 24, fontWeight: 500 }}>
            {t('findYourWord')}
          </h2>
          <p style={{ fontSize: 14, color: 'var(--text-muted)' }}>
            {t('describeSituation')}
          </p>

          <form onSubmit={handleSearch} style={{ position: 'relative' }}>
            <input
              className="input-search"
              placeholder={t('searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              style={{ paddingRight: 80 }}
            />
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                position: 'absolute',
                right: 6,
                top: '50%',
                transform: 'translateY(-50%)',
                padding: '8px 16px',
              }}
              disabled={loading}
            >
              {loading ? '...' : '🔍 Search'}
            </button>
          </form>

          {recentSearches.length>0 && !hasSearched && (
            <div style={{marginBottom:20}}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>Recent searches</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                {recentSearches.map((term,i)=>(
                  <button key={i} onClick={()=>{setQuery(term);handleSearch(null,term)}} className="tag tag-ink" style={{cursor:'pointer',padding:'6px 13px',fontSize:12}}>
                    ↺ {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginBottom: 8 }}>
              {t('moodLabel')}
            </div>
            <div className="mood-grid">
              {MOODS.slice(0, 8).map((mood) => (
                <motion.button
                  key={mood.key}
                  className={`mood-chip ${selectedMood?.key === mood.key ? 'selected' : ''}`}
                  onClick={() => handleMoodClick(mood)}
                  whileTap={{ scale: 0.92 }}
                  whileHover={{ y: -2 }}
                >
                  <span className="mood-emoji">{mood.emoji}</span>
                  <span className="mood-label">{t(mood.labelKey)}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </RevealCard>

      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: 40 }}
          >
            <div className="loading-dots">
              <div className="loading-dot" />
              <div className="loading-dot" />
              <div className="loading-dot" />
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
              {t('searching')}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {!loading && hasSearched && results.length === 0 && (
        <EmptyState
          icon="📖"
          headline={t('noVersesFound')}
          body={t('tryDifferentWords')}
          ctaLabel="Try again"
          onCta={() => { setQuery(''); setSelectedMood(null); setHasSearched(false); }}
        />
      )}

      {!loading && results.length > 0 && (
        <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {results.map((verse, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.08 }}
              className="verse-card"
            >
              <span className="verse-ref">{verse.reference}</span>
              <p className="verse-text">{verse.text || `[${verse.reference}]`}</p>
              {verse.reason && (
                <p className="verse-note" style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                  {verse.reason}
                </p>
              )}
              <div style={{ display: 'flex', gap: 8, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border-subtle)', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    const msg = `*${verse.reference}*\n\n_${verse.text || ''}_\n\n— Keryva 📖`
                    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
                    showToast(t('shareToWhatsApp'), '💬')
                  }}
                  className="btn btn-gold btn-sm"
                >
                  💬 {t('share')}
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`${verse.reference}: ${verse.text || ''}`)
                    showToast(t('copied'), '📋')
                  }}
                  className="btn btn-outline btn-sm"
                >
                  📋 {t('copy')}
                </button>
                <button
                  onClick={() => { setPendingVerse({ref:verse.reference,translation:user.translation||'KJV',text:verse.text||''}); setActivePage('sermon') }}
                  className="btn btn-outline btn-sm"
                >
                  🎙 {t('sermon')}
                </button>
                <button
                  onClick={() => { setPendingVerse({ref:verse.reference,translation:user.translation||'KJV',text:verse.text||''}); setActivePage('prayer') }}
                  className="btn btn-outline btn-sm"
                >
                  🙏 {t('verseActionAddPrayer')}
                </button>
                <button
                  onClick={() => { setPendingVerse({ref:verse.reference,translation:user.translation||'KJV',text:verse.text||''}); setActivePage('study') }}
                  className="btn btn-outline btn-sm"
                >
                  📚 {t('verseActionAddStudy')}
                </button>
                <button
                  onClick={() => {
                    const parsed = parseRefForBible(verse.reference)
                    if (!parsed) { showToast('Could not locate that verse in the Bible Reader', '⚠️'); return }
                    setPendingChapter({ ...parsed, translation: user.translation||'KJV' })
                    setActivePage('bible')
                  }}
                  className="btn btn-outline btn-sm"
                >
                  📍 {t('verseActionGoToBible')}
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}