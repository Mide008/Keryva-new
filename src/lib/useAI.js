// src/lib/useAI.js
import { useState, useCallback } from 'react'

const SYS = `You are Keryva — a wise, warm spiritual companion. Speak like a trusted pastor: deeply rooted in Scripture, deeply human in tone. Rules: Always quote Bible verses accurately with exact reference. Use the translation specified. Never fabricate scripture. Be warm, specific, pastoral — never generic. Format with clear labels. Never make claims beyond Scripture.`

// All AI calls go through the same-origin /api/ai serverless function.
// Provider keys (ANTHROPIC_API_KEY, GEMINI_API_KEY, GROQ_API_KEY,
// OPENROUTER_API_KEY) live only in Vercel's server environment and are
// never sent to, or readable by, the browser.
async function askServer(prompt, task) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: `${SYS}\n\n${prompt}`, task }),
  })
  // The server always responds 200 with either { text } or { text: null, error }
  // — error is already a human, provider-free message (never a model name,
  // status code, or raw provider error). A non-2xx here means something
  // structural (bad request), not an AI failure.
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error('Something went wrong on our end. Please try again.')
  return { text: data?.text || null, error: data?.error || null }
}

export function useAI() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // task: 'fast' (Groq-first — quick lenses, short rewrites) or
  // 'longform' (Gemini-first — sermons, devotionals, study guides, packs).
  // Defaults to 'longform' for any existing call site that doesn't specify.
  const ask = useCallback(async (prompt, task = 'longform') => {
    setLoading(true); setError(null)
    try {
      const { text, error: humanError } = await askServer(prompt, task)
      if (text) {
        setLoading(false)
        return text
      }
      setLoading(false)
      setError(humanError || 'Personalised generation is temporarily unavailable. Your Bible reader and saved content remain available.')
      return null
    } catch (err) {
      console.warn('AI request failed:', err.message)
      setLoading(false)
      setError('Something went wrong on our end. Please try again.')
      return null
    }
  }, [])

  const searchVerses = useCallback(async ({ topic, mood, situation, translation = 'KJV' }) => {
    const ctx = mood ? `feeling "${mood}"${situation ? ` and says: "${situation}"` : ''}` : `asking about: "${topic}"`
    return ask(`Find 4 Bible verses for someone ${ctx}.\n\nFor each verse:\nVERSE: [Book Chapter:Verse] — ${translation}\nTEXT: [Exact verse text in ${translation}]\nNOTE: [One warm personal sentence connecting this verse to their situation]\n\nSeparate each with:\n---\n\nNo other text.`)
  }, [ask])

  const buildSermon = useCallback(async ({ topic, audience, denomination, length, format, translation = 'KJV' }) => {
    return ask(`Build a complete ${format} sermon on: "${topic}"\nAudience: ${audience}\nStyle: ${denomination}\nLength: ${length}\nTranslation: ${translation}\n\nTITLE: [title]\n\nINTRODUCTION:\n[3-4 sentences]\n\nPOINT 1: [title]\nVERSE: [ref] — [full text in ${translation}]\nEXPOSITION: [2-3 sentences]\n\nPOINT 2: [title]\nVERSE: [ref] — [full text in ${translation}]\nEXPOSITION: [2-3 sentences]\n\nPOINT 3: [title]\nVERSE: [ref] — [full text in ${translation}]\nEXPOSITION: [2-3 sentences]\n\nAPPLICATION:\n[3-4 sentences]\n\nALTAR CALL:\n[2-3 sentences]\n\n⚠️ DISCLAIMER: AI-assisted. Verify all scripture before preaching.`)
  }, [ask])

  const buildStudyGuide = useCallback(async ({ theme, passage, translation = 'KJV' }) => {
    return ask(`Create a complete small group study on: "${theme}"${passage ? ` — passage: ${passage}` : ''}. Translation: ${translation}\n\nTHEME INTRODUCTION:\n[2-3 sentences]\n\nSCRIPTURE CLUSTER:\n[5 numbered verses with ref and exact text in ${translation}]\n\nCONTEXT NOTES:\n[3 sentences of background]\n\nDISCUSSION QUESTIONS:\nOPENING (Easy): [question]\nCORE 1 (Medium): [question]\nCORE 2 (Application): [question]\nDEEP (Challenging): [question]\nCLOSING (Prayer): [prompt]\n\nCLOSING REFLECTION:\n[2 sentences]`)
  }, [ask])

  const getPrayerScripture = useCallback(async ({ prayerText, translation = 'KJV', languageLabel = 'English' }) => {
    return ask(`Prayer request: "${prayerText}"\n\nGive 2 Bible verses that speak to this. Use ${translation}.${languageLabel!=='English' ? ` Respond fully in ${languageLabel}.` : ''}\n\nVERSE: [ref] — [exact text]\nENCOURAGEMENT: [one warm pastoral sentence]\n\n---\n\nVERSE: [ref] — [exact text]\nENCOURAGEMENT: [one warm pastoral sentence]`)
  }, [ask])

  const getDailyDevotional = useCallback(async ({ verse, ref, translation = 'KJV' }) => {
    return ask(`Daily devotional for: "${verse}" — ${ref} (${translation})\n\nREFLECTION:\n[2-3 warm practical sentences]\n\nAPPLICATION:\n[One specific action for today]\n\nPRAYER:\n[2-sentence prayer based on this verse]`)
  }, [ask])

  const getVerseCommentary = useCallback(async ({ ref, text, translation = 'KJV' }) => {
    return ask(`Brief pastoral commentary on ${ref} (${translation}): "${text}"\n\nCONTEXT:\n[2 sentences — historical/literary background]\n\nMEANING:\n[2 sentences — theological meaning]\n\nAPPLICATION:\n[1-2 sentences — daily life application]`)
  }, [ask])

  return { 
    ask, 
    searchVerses, 
    buildSermon, 
    buildStudyGuide, 
    getPrayerScripture, 
    getDailyDevotional, 
    getVerseCommentary, 
    loading, 
    error
  }
}