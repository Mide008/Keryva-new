// src/services/bibleApi.js
// Real Bible text — replaces the old SAMPLE_CHAPTERS placeholder.
// Primary source: bible-api.com (free, keyless, CORS-enabled, public-domain translations).
// Optional upgrade: ESV, proxied server-side via /api/bible-esv so the ESV_API_KEY
// never reaches the browser. Configure ESV_API_KEY in Vercel project settings —
// get one free at https://api.esv.org/account/create-application/

// Map our TRANSLATIONS codes to bible-api.com's free public-domain identifiers.
// bible-api.com does not license NIV/NLT/ESV/AMP/MSG/NASB/CSB — those fall back
// to KJV text with a note, unless the server-side ESV proxy is configured.
const BIBLE_API_MAP = {
  KJV: 'kjv', NKJV: 'kjv', WEB: 'web', NCV: 'web', GNT: 'web',
  ASV: 'asv', YLT: 'ylt', BBE: 'bbe', WEBSTER: 'webster',
  CLEMENTINE: 'clementine', ALMEIDA: 'almeida', RCCV: 'rccv',
}

import { idbGet, idbSet } from '@/lib/idb'

const CACHE_PREFIX = 'rhema_bible_cache_'
const memCache = new Map()

function cacheGet(key) {
  if (memCache.has(key)) return memCache.get(key)
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key)
    if (raw) { const v = JSON.parse(raw); memCache.set(key, v); return v }
  } catch {}
  return null
}
async function cacheGetAsync(key) {
  const hit = cacheGet(key)
  if (hit) return hit
  // localStorage missed (quota eviction, cleared, etc) — fall back to the
  // larger-capacity IndexedDB store so already-read chapters still work offline.
  const idbHit = await idbGet(CACHE_PREFIX + key)
  if (idbHit) { memCache.set(key, idbHit); return idbHit }
  return null
}
function cacheSet(key, value) {
  memCache.set(key, value)
  try { localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(value)) } catch {}
  idbSet(CACHE_PREFIX + key, value).catch(() => {})
}

/**
 * Verify a single scripture reference the AI returned (e.g. "Hebrews 11:1" or
 * "Romans 8:28-39") by fetching the real text from bible-api.com directly —
 * never trusting what the model recalled from memory. This is the core
 * anti-hallucination step: any reference that doesn't resolve is either
 * malformed or invented, and callers should treat it as unverified.
 * Returns { verified: true, text, reference } or { verified: false, reason }.
 */
export async function verifyReference(reference, translationCode = 'KJV') {
  if (!reference || typeof reference !== 'string') return { verified: false, reason: 'No reference given' }
  const cacheKey = `verify_${reference}_${translationCode}`
  const cached = await cacheGetAsync(cacheKey)
  if (cached) return cached

  const apiCode = BIBLE_API_MAP[translationCode] || 'kjv'
  try {
    const url = `https://bible-api.com/${encodeURIComponent(reference.trim())}?translation=${apiCode}`
    const res = await fetch(url)
    if (!res.ok) {
      const result = { verified: false, reason: `Reference not found (${res.status})` }
      return result
    }
    const data = await res.json()
    if (!data?.text || !data?.verses?.length) {
      return { verified: false, reason: 'Empty response — likely an invented or malformed reference' }
    }
    const result = {
      verified: true,
      text: data.text.trim().replace(/\s+/g, ' '),
      reference: data.reference || reference,
    }
    cacheSet(cacheKey, result)
    return result
  } catch (err) {
    return { verified: false, reason: 'Network error while verifying' }
  }
}

/**
 * Verify a batch of references in parallel — used to check every scripture
 * an AI response cites (e.g. all points in a sermon) in one pass.
 */
export async function verifyReferences(references, translationCode = 'KJV') {
  const unique = [...new Set(references.filter(Boolean))]
  const results = await Promise.all(unique.map(ref => verifyReference(ref, translationCode)))
  const map = {}
  unique.forEach((ref, i) => { map[ref] = results[i] })
  return map
}

async function fetchFromBibleApi(bookName, chapter, apiCode) {
  const ref = encodeURIComponent(`${bookName} ${chapter}`)
  const url = `https://bible-api.com/${ref}?translation=${apiCode}`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`bible-api.com ${res.status}`)
  const data = await res.json()
  if (!data?.verses?.length) throw new Error('No verses in response')
  return data.verses.map(v => ({ v: v.verse, text: v.text.trim() }))
}

async function fetchFromESVProxy(bookName, chapter) {
  const res = await fetch(`/api/bible-esv?book=${encodeURIComponent(bookName)}&chapter=${chapter}`)
  if (!res.ok) throw new Error(`ESV proxy ${res.status}`)
  const data = await res.json()
  const raw = data?.passages?.[0] || ''
  const parts = raw.split(/\[(\d+)\]/).filter(s => s.trim())
  const verses = []
  for (let i = 0; i < parts.length; i += 2) {
    const num = parseInt(parts[i], 10)
    const text = (parts[i + 1] || '').trim()
    if (num && text) verses.push({ v: num, text })
  }
  return verses
}

// Translations that need api.bible (server-side, via BIBLE_API_KEY) because
// bible-api.com's free catalog is public-domain only.
const NEEDS_BIBLE_VERSION_PROXY = new Set(['NIV','NLT','AMP','MSG','NASB','CSB','NKJV','NCV','GNT','NRSV','TLB'])

async function fetchFromBibleVersionProxy(bookName, chapter, translationCode) {
  const res = await fetch(`/api/bible-version?book=${encodeURIComponent(bookName)}&chapter=${chapter}&version=${encodeURIComponent(translationCode)}`)
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `bible-version proxy ${res.status}`)
  }
  const data = await res.json()
  if (!data?.verses?.length) throw new Error('No verses in bible-version response')
  return data.verses
}

/**
 * Fetch real chapter text for a book/chapter/translation.
 * Returns { verses: [{v,text}], source: 'esv'|'bible-api'|'kjv-fallback', note?: string }
 */
export async function fetchChapter(bookName, chapter, translationCode = 'KJV') {
  const cacheKey = `${bookName}_${chapter}_${translationCode}`
  const cached = await cacheGetAsync(cacheKey)
  if (cached) return cached

  // Try the server-side ESV proxy first if ESV was requested — it silently
  // 404s if ESV_API_KEY isn't configured, and we fall through to bible-api.com.
  if (translationCode === 'ESV') {
    try {
      const verses = await fetchFromESVProxy(bookName, chapter)
      if (verses.length) { const result = { verses, source: 'esv' }; cacheSet(cacheKey, result); return result }
    } catch (err) {
      console.warn('ESV proxy unavailable, falling back:', err.message)
    }
  }

  // Commercially-licensed translations (NIV, NLT, AMP, MSG, NASB, CSB, NKJV,
  // NCV, GNT, NRSV, TLB) aren't in bible-api.com's free public-domain set —
  // try the api.bible proxy (BIBLE_API_KEY) first. This only succeeds if
  // Mide's api.bible account has an approved content license for that
  // specific edition; otherwise it 404s and we fall back to KJV below.
  if (NEEDS_BIBLE_VERSION_PROXY.has(translationCode)) {
    try {
      const verses = await fetchFromBibleVersionProxy(bookName, chapter, translationCode)
      if (verses.length) { const result = { verses, source: 'api-bible' }; cacheSet(cacheKey, result); return result }
    } catch (err) {
      console.warn(`api.bible proxy unavailable for ${translationCode}, falling back:`, err.message)
    }
  }

  const apiCode = BIBLE_API_MAP[translationCode] || 'kjv'
  try {
    const verses = await fetchFromBibleApi(bookName, chapter, apiCode)
    const isNativeMatch = translationCode === 'KJV' || translationCode === 'WEB' || translationCode === 'ASV' || translationCode === 'YLT' || translationCode === 'BBE'
    const result = isNativeMatch
      ? { verses, source: 'bible-api' }
      : { verses, source: 'kjv-fallback', note: `${translationCode} isn't licensed for text access on this account yet — showing ${apiCode.toUpperCase()} instead. Approve that edition's content license in the api.bible or ESV dashboard to unlock it here.` }
    cacheSet(cacheKey, result)
    return result
  } catch (err) {
    console.error('bible-api.com failed:', err.message)
    return { verses: [], source: 'error', note: 'Could not load this chapter. Check your connection and try again.' }
  }
}
