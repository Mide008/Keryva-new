import { useState, useEffect, useRef } from 'react'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { languageLabelFor } from '@/lib/aiServices'
import { useTranslation } from '@/hooks/useTranslation'
import { RevealCard } from '@/components/ui/MotionComponents'
import EmptyState from '@/components/ui/EmptyState'

function parseRefForBible(ref) {
  const m = ref.match(/^(.+?)\s+(\d+):(\d+)/)
  if (!m) return null
  return { bookName: m[1].trim(), chapter: parseInt(m[2],10), verse: parseInt(m[3],10) }
}

export default function SearchPage() {
  const { showToast, user, setActivePage, setPendingVerse, setPendingChapter } = useApp()
  const { ask, loading, error } = useAI()
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [hasSearched, setHasSearched] = useState(false)
  const resultsRef = useRef(null)

  useEffect(() => {
    const savedQuery = sessionStorage.getItem('rhema_search_query')
    if (savedQuery) {
      sessionStorage.removeItem('rhema_search_query')
      setQuery(savedQuery)
      handleSearch(null, savedQuery)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = async (e, override) => {
    e?.preventDefault()
    const term = (override ?? query).trim()
    if (!term) {
      showToast(t('noQuery') || 'Please enter a search term', '⚠️')
      return
    }

    setHasSearched(true)
    setResults([])

    try {
      const prompt = `
        You are a pastoral AI assistant. The user is searching for scripture guidance.
        Their search: "${term}".
        Suggest 4-6 relevant Bible verses. For each, provide the reference, the full verse text, and a brief reason.
        Return a valid JSON object with no extra text:
        {
          "verses": [
            { "reference": "Isaiah 41:10", "text": "Fear not, for I am with you...", "reason": "God promises his presence." },
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
        showToast(error || t('aiRequestFailed'), '❌')
      }
    } catch (err) {
      console.error('Search error:', err)
      showToast(t('aiRequestFailed'), '❌')
    }
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <RevealCard>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10 }}>
          <input
            className="input-search"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? '...' : '🔍 Search'}
          </button>
        </form>
      </RevealCard>

      {loading && (
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div className="loading-dots">
            <div className="loading-dot" />
            <div className="loading-dot" />
            <div className="loading-dot" />
          </div>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', marginTop: 12 }}>
            {t('searching')}
          </p>
        </div>
      )}

      {!loading && hasSearched && results.length === 0 && (
        <EmptyState
          icon="📖"
          headline={t('noVersesFound')}
          body={`${t('tryDifferentWords')}`}
          ctaLabel="Try again"
          onCta={() => { setQuery(''); setHasSearched(false); }}
        />
      )}

      {!loading && results.length > 0 && (
        <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {results.map((verse, idx) => (
            <div key={idx} className="verse-card">
              <span className="verse-ref">{verse.reference}</span>
              <p className="verse-text">{verse.text || `[${verse.reference}]`}</p>
              {verse.reason && (
                <p className="verse-note" style={{ fontSize: 13, color: 'var(--ink-500)' }}>
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}