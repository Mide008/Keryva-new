// api/bible-version.js — Vercel Serverless Function (Node runtime, default)
// Proxies api.bible (scripture.api.bible) server-side so BIBLE_API_KEY never
// reaches the browser. This is what lets translations beyond the small
// public-domain set (KJV/WEB/ASV/YLT/BBE, already served by bible-api.com in
// src/services/bibleApi.js) work — NIV, NLT, AMP, MSG, NASB, CSB, NKJV, NCV,
// GNT, NRSV, TLB.
//
// IMPORTANT LIMITATION (not a bug — a licensing fact): api.bible only serves
// full verse text for a translation if the API key's account has an approved
// license for it. Public-domain editions (KJV, WEB, ASV, etc.) are always
// available. Modern commercial translations (NIV, NLT, MSG, AMP, NASB, CSB…)
// require Mide's api.bible account to have a separate content license grant
// from the publisher (Biblica, Tyndale, NavPress, Lockman, Holman…) — the API
// key alone does not grant that. If a translation 404s or comes back
// content-restricted below, that's what's happening; the fix is requesting
// access to that Bible's `text` content type in the api.bible dashboard, not
// a code change.
//
// We never hardcode api.bible's internal bibleId UUIDs (they vary by account
// and catalog changes) — instead we resolve them at request time from
// GET /v1/bibles and cache the result for the life of the serverless
// instance.

const API_BASE = 'https://api.scripture.api.bible/v1'

// Our TRANSLATIONS codes -> candidate abbreviations api.bible might list
// this edition under (varies by publisher feed).
const VERSION_ABBR_CANDIDATES = {
  NIV: ['NIV'],
  NLT: ['NLT'],
  ESV: ['ESV'],
  AMP: ['AMP'],
  MSG: ['MSG', 'THE MESSAGE'],
  NASB: ['NASB', 'NASB1995', 'NASB2020'],
  CSB: ['CSB'],
  NKJV: ['NKJV'],
  NCV: ['NCV', 'ERV', 'ERV-EN'],
  GNT: ['GNT', 'GNB'],
  NRSV: ['NRSV', 'NRSVUE'],
  TLB: ['TLB'],
}

// Non-English translation codes -> ISO 639-3 language code. We match by
// language rather than by guessed edition abbreviation, because we haven't
// verified exact abbreviations for these catalogs (e.g. "Open Yoruba
// Contemporary Bible") against a live key — ISO codes are a stable public
// standard, so this resolves correctly regardless of what the specific
// edition happens to be called this month.
const LANGUAGE_ISO = {
  YOR: 'yor', // Yoruba
  IBO: 'ibo', // Igbo
}

// Full 66-book name -> standard USFM 3-letter book code (stable, public spec —
// not account-specific, safe to hardcode).
const USFM = {
  'Genesis':'GEN','Exodus':'EXO','Leviticus':'LEV','Numbers':'NUM','Deuteronomy':'DEU',
  'Joshua':'JOS','Judges':'JDG','Ruth':'RUT','1 Samuel':'1SA','2 Samuel':'2SA',
  '1 Kings':'1KI','2 Kings':'2KI','1 Chronicles':'1CH','2 Chronicles':'2CH','Ezra':'EZR',
  'Nehemiah':'NEH','Esther':'EST','Job':'JOB','Psalms':'PSA','Proverbs':'PRO',
  'Ecclesiastes':'ECC','Song of Solomon':'SNG','Isaiah':'ISA','Jeremiah':'JER','Lamentations':'LAM',
  'Ezekiel':'EZK','Daniel':'DAN','Hosea':'HOS','Joel':'JOL','Amos':'AMO',
  'Obadiah':'OBA','Jonah':'JON','Micah':'MIC','Nahum':'NAM','Habakkuk':'HAB',
  'Zephaniah':'ZEP','Haggai':'HAG','Zechariah':'ZEC','Malachi':'MAL','Matthew':'MAT',
  'Mark':'MRK','Luke':'LUK','John':'JHN','Acts':'ACT','Romans':'ROM',
  '1 Corinthians':'1CO','2 Corinthians':'2CO','Galatians':'GAL','Ephesians':'EPH','Philippians':'PHP',
  'Colossians':'COL','1 Thessalonians':'1TH','2 Thessalonians':'2TH','1 Timothy':'1TI','2 Timothy':'2TI',
  'Titus':'TIT','Philemon':'PHM','Hebrews':'HEB','James':'JAS','1 Peter':'1PE',
  '2 Peter':'2PE','1 John':'1JN','2 John':'2JN','3 John':'3JN','Jude':'JUD','Revelation':'REV',
}

// In-memory cache for the life of this serverless instance — avoids
// refetching the full bible catalog on every request. Keyed by language
// since we now fetch more than just English.
const catalogCache = new Map() // language -> { data, fetchedAt }
const CATALOG_TTL_MS = 60 * 60 * 1000 // 1 hour

async function getCatalog(apiKey, language) {
  const now = Date.now()
  const cached = catalogCache.get(language)
  if (cached && now - cached.fetchedAt < CATALOG_TTL_MS) return cached.data
  const res = await fetch(`${API_BASE}/bibles?language=${language}`, { headers: { 'api-key': apiKey } })
  if (!res.ok) throw new Error(`bibles_list_failed_${res.status}`)
  const data = await res.json()
  const list = data?.data || []
  catalogCache.set(language, { data: list, fetchedAt: now })
  return list
}

function resolveBibleId(catalog, versionCode) {
  const candidates = (VERSION_ABBR_CANDIDATES[versionCode] || [versionCode]).map(c => c.toUpperCase())
  const match = catalog.find(b => candidates.includes((b.abbreviation || '').toUpperCase()))
    || catalog.find(b => candidates.some(c => (b.abbreviationLocal || '').toUpperCase() === c))
    || catalog.find(b => candidates.some(c => (b.name || '').toUpperCase().includes(c)))
  return match?.id || null
}

// For Yoruba/Igbo we match by language rather than a guessed abbreviation —
// just take the first available edition api.bible's catalog returns for
// that language (the free Starter tier typically exposes one open edition
// per language; if an account has more than one, the first is used).
function resolveBibleIdByLanguage(catalog) {
  return catalog[0]?.id || null
}

export default async function handler(req, res) {
  const apiKey = process.env.BIBLE_API_KEY
  if (!apiKey) { res.status(404).json({ error: 'BIBLE_API_KEY not configured' }); return }

  const { book, chapter, version } = req.query || {}
  if (!book || !chapter || !version) { res.status(400).json({ error: 'Missing book, chapter, or version' }); return }

  const usfm = USFM[book]
  if (!usfm) { res.status(400).json({ error: `Unrecognised book: ${book}` }); return }

  try {
    const versionUpper = String(version).toUpperCase()
    const isoLang = LANGUAGE_ISO[versionUpper]
    const catalog = await getCatalog(apiKey, isoLang || 'eng')
    const bibleId = isoLang ? resolveBibleIdByLanguage(catalog) : resolveBibleId(catalog, versionUpper)
    if (!bibleId) { res.status(404).json({ error: `No accessible edition found for ${version}` }); return }

    const chapterId = `${usfm}.${chapter}`
    const url = `${API_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`
    const chRes = await fetch(url, { headers: { 'api-key': apiKey } })
    if (!chRes.ok) { res.status(chRes.status).json({ error: `api.bible chapter fetch failed (${chRes.status}) — this edition may need a separate content license approved in the api.bible dashboard.` }); return }
    const chData = await chRes.json()
    const raw = chData?.data?.content || ''

    // content-type=text returns verse markers like "[1] In the beginning..."
    const verses = []
    const parts = raw.split(/\[(\d+)\]/).filter(s => s.trim().length)
    for (let i = 0; i < parts.length; i += 2) {
      const num = parseInt(parts[i], 10)
      const text = (parts[i + 1] || '').replace(/\s+/g, ' ').trim()
      if (num && text) verses.push({ v: num, text })
    }
    if (!verses.length) { res.status(404).json({ error: 'No verses returned for this chapter/edition' }); return }
    res.status(200).json({ verses })
  } catch (err) {
    res.status(502).json({ error: 'bible-version proxy failed', detail: err.message })
  }
}
