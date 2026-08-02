// api/scripture.js — Vercel Serverless Function (Node runtime, default)
//
// Orchestrates the recommended fallback chain for native-language Scripture:
//   1. API.Bible   — check for an authorised edition in the requested language
//   2. Bible Brain  — check Faith Comes By Hearing's catalog (broader
//      language coverage, especially for African languages)
//   3. Azure Translator — LAST resort only: translate the English verse and
//      clearly label the result as machine-translated
//
// This endpoint is ONLY used for languages that need this chain (Yoruba,
// Igbo, Nigerian Pidgin today). English and the existing commercial
// translations continue to go through api/bible-version.js and
// src/services/bibleApi.js's existing bible-api.com path — untouched.
//
// Every response carries { source, machineTranslated, copyright } so the
// client can render an honest "Automatically translated" notice when (and
// only when) that's actually what happened. Never silently present
// machine-translated text as an official Bible edition.

const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1'
const BIBLE_BRAIN_BASE = 'https://4.dbt.io/api'

// USFM 3-letter book codes (stable public standard) — same mapping used in
// api/bible-version.js, duplicated here since this file is intentionally
// self-contained (mirrors the no-cross-import pattern in api/mcp.js).
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

// Our language keys -> ISO 639-3 (api.bible) and Bible Brain's own language
// name/code conventions. Nigerian Pidgin's ISO 639-3 code is 'pcm'.
const LANGUAGES = {
  YOR: { apiBibleLang: 'yor', bibleBrainLang: 'YOR', label: 'Yoruba' },
  IBO: { apiBibleLang: 'ibo', bibleBrainLang: 'IBO', label: 'Igbo' },
  PCM: { apiBibleLang: 'pcm', bibleBrainLang: 'PCM', label: 'Nigerian Pidgin' },
}

// Azure Translator language codes — Azure does NOT support Nigerian Pidgin,
// so pcm is deliberately absent here; the chain falls through to English
// for Pidgin rather than mistranslating with Azure.
const AZURE_LANG_CODE = { YOR: 'yo', IBO: 'ig' }

const memCache = new Map() // key -> { data, cachedAt } — process-lifetime only.
// A real cross-request cache needs Supabase/Redis (not yet provisioned);
// this in-memory cache still helps within a single warm serverless instance.
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours — verse text doesn't change

function cacheKey(langKey, book, chapter, verse) {
  return `${langKey}:${book}:${chapter}:${verse || 'all'}`
}

// ---- 1. API.Bible ----
async function tryApiBible(apiKey, langKey, book, chapter, verse) {
  if (!apiKey) return null
  const lang = LANGUAGES[langKey].apiBibleLang
  const res = await fetch(`${API_BIBLE_BASE}/bibles?language=${lang}`, { headers: { 'api-key': apiKey } })
  if (!res.ok) return null
  const list = (await res.json())?.data || []
  const bibleId = list[0]?.id
  if (!bibleId) return null
  const usfm = USFM[book]
  if (!usfm) return null
  const chapterId = `${usfm}.${chapter}`
  const chRes = await fetch(
    `${API_BIBLE_BASE}/bibles/${bibleId}/chapters/${chapterId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true`,
    { headers: { 'api-key': apiKey } }
  )
  if (!chRes.ok) return null
  const raw = (await chRes.json())?.data?.content || ''
  const parts = raw.split(/\[(\d+)\]/).filter(s => s.trim().length)
  const verses = []
  for (let i = 0; i < parts.length; i += 2) {
    const num = parseInt(parts[i], 10)
    const text = (parts[i + 1] || '').replace(/\s+/g, ' ').trim()
    if (num && text) verses.push({ v: num, text })
  }
  if (!verses.length) return null
  const target = verse ? verses.find(x => x.v === Number(verse)) : null
  return {
    verses,
    text: target?.text,
    source: 'api-bible',
    translationName: list[0]?.name || `${LANGUAGES[langKey].label} Bible`,
    machineTranslated: false,
    copyright: list[0]?.copyright?.text || null,
  }
}

// ---- 2. Bible Brain (Digital Bible Platform v4) ----
// NOTE: Bible Brain's exact fileset/book-id conventions can vary by
// language and haven't been verified against a live key from this session.
// This layer is wrapped defensively — any shape mismatch just falls
// through to Azure below rather than breaking the request.
async function tryBibleBrain(apiKey, langKey, book, chapter, verse) {
  if (!apiKey) return null
  try {
    const lang = LANGUAGES[langKey].bibleBrainLang
    const res = await fetch(`${BIBLE_BRAIN_BASE}/bibles?language_code=${lang}&key=${apiKey}&v=4`)
    if (!res.ok) return null
    const list = (await res.json())?.data || []
    const bible = list[0]
    const fileset = bible?.filesets?.type?.find?.(f => f.type?.includes('text')) || bible?.filesets?.[0]
    const filesetId = fileset?.id || fileset?.fileset_id
    if (!filesetId) return null
    const usfm = USFM[book]
    if (!usfm) return null
    const chRes = await fetch(`${BIBLE_BRAIN_BASE}/bibles/filesets/${filesetId}/${usfm}/${chapter}?key=${apiKey}&v=4`)
    if (!chRes.ok) return null
    const data = (await chRes.json())?.data || []
    const verses = data.map(v => ({ v: Number(v.verse_start || v.verse), text: (v.verse_text || v.text || '').trim() })).filter(v => v.v && v.text)
    if (!verses.length) return null
    const target = verse ? verses.find(x => x.v === Number(verse)) : null
    return {
      verses,
      text: target?.text,
      source: 'bible-brain',
      translationName: bible?.vname || bible?.name || `${LANGUAGES[langKey].label} Bible`,
      machineTranslated: false,
      copyright: bible?.copyright_organization || null,
    }
  } catch {
    return null
  }
}

// ---- 3. Azure Translator (final fallback, English source, always labelled) ----
async function tryAzure(book, chapter, verse, englishVerses, langKey) {
  const key = process.env.AZURE_TRANSLATOR_KEY
  const region = process.env.AZURE_TRANSLATOR_REGION
  const azureLang = AZURE_LANG_CODE[langKey]
  if (!key || !azureLang || !englishVerses?.length) return null
  const toTranslate = verse ? englishVerses.filter(v => v.v === Number(verse)) : englishVerses
  if (!toTranslate.length) return null
  const res = await fetch(`https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=${azureLang}`, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': key,
      'Ocp-Apim-Subscription-Region': region || '',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toTranslate.map(v => ({ Text: v.text }))),
  })
  if (!res.ok) return null
  const data = await res.json()
  const verses = toTranslate.map((v, i) => ({ v: v.v, text: data[i]?.translations?.[0]?.text || v.text }))
  return {
    verses,
    text: verse ? verses[0]?.text : undefined,
    source: 'azure-translator',
    machineTranslated: true,
    sourceLanguage: 'en',
    sourceTranslation: 'WEB',
    translationName: `Automatically translated (English WEB \u2192 ${LANGUAGES[langKey].label})`,
    copyright: 'Machine translation \u2014 Microsoft Azure Translator',
  }
}

// English source verses for the Azure fallback step, via the same
// public-domain bible-api.com source the rest of the app already uses.
async function fetchEnglishSource(book, chapter) {
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(`${book} ${chapter}`)}?translation=web`)
    if (!res.ok) return []
    const data = await res.json()
    return (data?.verses || []).map(v => ({ v: v.verse, text: v.text.trim() }))
  } catch {
    return []
  }
}

export default async function handler(req, res) {
  const { book, chapter, verse, lang } = req.query || {}
  const langKey = String(lang || '').toUpperCase()
  if (!book || !chapter) { res.status(400).json({ error: 'Missing book or chapter' }); return }
  if (!LANGUAGES[langKey]) { res.status(400).json({ error: `Unsupported language: ${lang}` }); return }

  const key = cacheKey(langKey, book, chapter, verse)
  const cached = memCache.get(key)
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) { res.status(200).json(cached.data); return }

  try {
    // 1. API.Bible
    let result = await tryApiBible(process.env.BIBLE_API_KEY, langKey, book, chapter, verse).catch(() => null)
    // 2. Bible Brain
    if (!result) result = await tryBibleBrain(process.env.BIBLE_BRAIN_API_KEY, langKey, book, chapter, verse)
    // 3. Azure Translator — only if pcm is NOT the target (Azure has no
    // Pidgin support) and neither Scripture provider had this language.
    if (!result && langKey !== 'PCM') {
      const englishVerses = await fetchEnglishSource(book, chapter)
      result = await tryAzure(book, chapter, verse, englishVerses, langKey)
    }

    if (!result) {
      res.status(404).json({
        error: `No ${LANGUAGES[langKey].label} text available for ${book} ${chapter} from any source yet.`,
        note: langKey === 'PCM'
          ? 'Nigerian Pidgin has no Azure fallback by design (not supported) — only an authorised pcm Bible edition will display here.'
          : 'Add BIBLE_API_KEY, BIBLE_BRAIN_API_KEY, or AZURE_TRANSLATOR_KEY (+ AZURE_TRANSLATOR_REGION) to enable this chain.',
      })
      return
    }

    const response = { reference: `${book} ${chapter}${verse ? ':' + verse : ''}`, language: langKey, ...result }
    memCache.set(key, { data: response, cachedAt: Date.now() })
    res.status(200).json(response)
  } catch (err) {
    res.status(502).json({ error: 'scripture service failed', detail: err.message })
  }
}
