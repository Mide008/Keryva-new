// api/scripture.js — Vercel Serverless Function (Node runtime)
// Orchestrates the fallback chain for native-language Scripture:
//   1. API.Bible   — authorised editions
//   2. Bible Brain — Faith Comes By Hearing's catalogue
//   3. Google Translate — machine translation (supports Yoruba, Igbo, French, Spanish)
//   4. DeepL       — machine translation (French, Spanish only)
//   5. MyMemory    — final fallback (free, no billing required)
//
// Every response includes { source, machineTranslated, copyright } so the
// client can render an honest notice when machine‑translated text is used.

const API_BIBLE_BASE = 'https://api.scripture.api.bible/v1'
const BIBLE_BRAIN_BASE = 'https://4.dbt.io/api'

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

// Language mapping: keys -> ISO codes for API.Bible, Bible Brain, Google, DeepL, MyMemory
const LANGUAGES = {
  YOR: { apiBibleLang: 'yor', bibleBrainLang: 'YOR', google: 'yo', deepl: null, mymemory: 'yo', label: 'Yoruba' },
  IBO: { apiBibleLang: 'ibo', bibleBrainLang: 'IBO', google: 'ig', deepl: null, mymemory: 'ig', label: 'Igbo' },
  PCM: { apiBibleLang: 'pcm', bibleBrainLang: 'PCM', google: null, deepl: null, mymemory: null, label: 'Nigerian Pidgin' },
  FRE: { apiBibleLang: 'fra', bibleBrainLang: 'FRN', google: 'fr', deepl: 'fr', mymemory: 'fr', label: 'French' },
  SPA: { apiBibleLang: 'spa', bibleBrainLang: 'SPN', google: 'es', deepl: 'es', mymemory: 'es', label: 'Spanish' },
}

const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const memCache = new Map()

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

// ---- 2. Bible Brain ----
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

// ---- 3. Google Translate ----
async function tryGoogleTranslate(book, chapter, verse, englishVerses, langKey) {
  const key = process.env.GOOGLE_TRANSLATE_API_KEY
  const googleLang = LANGUAGES[langKey].google
  if (!key || !googleLang || !englishVerses?.length) return null
  const toTranslate = verse ? englishVerses.filter(v => v.v === Number(verse)) : englishVerses
  if (!toTranslate.length) return null
  try {
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ q: toTranslate.map(v => v.text), source: 'en', target: googleLang, format: 'text' }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const translations = data?.data?.translations || []
    if (!translations.length) return null
    const verses = toTranslate.map((v, i) => ({ v: v.v, text: translations[i]?.translatedText || v.text }))
    return {
      verses,
      text: verse ? verses[0]?.text : undefined,
      source: 'google-translate',
      machineTranslated: true,
      sourceLanguage: 'en',
      sourceTranslation: 'WEB',
      translationName: `Automatically translated (English WEB → ${LANGUAGES[langKey].label})`,
      copyright: 'Machine translation — Google Cloud Translation',
    }
  } catch {
    return null
  }
}

// ---- 4. DeepL (only for French and Spanish) ----
async function tryDeepL(book, chapter, verse, englishVerses, langKey) {
  const key = process.env.DEEPL_API_KEY
  const deeplLang = LANGUAGES[langKey].deepl
  if (!key || !deeplLang || !englishVerses?.length) return null
  const toTranslate = verse ? englishVerses.filter(v => v.v === Number(verse)) : englishVerses
  if (!toTranslate.length) return null
  try {
    // DeepL expects an array of text, and returns an array of translations
    const res = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        auth_key: key,
        text: toTranslate.map(v => v.text),
        target_lang: deeplLang.toUpperCase(),
        tag_handling: 'html',
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    const translations = data?.translations || []
    if (!translations.length) return null
    const verses = toTranslate.map((v, i) => ({ v: v.v, text: translations[i]?.text || v.text }))
    return {
      verses,
      text: verse ? verses[0]?.text : undefined,
      source: 'deepl',
      machineTranslated: true,
      sourceLanguage: 'en',
      sourceTranslation: 'WEB',
      translationName: `Automatically translated (English WEB → ${LANGUAGES[langKey].label})`,
      copyright: 'Machine translation — DeepL',
    }
  } catch {
    return null
  }
}

// ---- 5. MyMemory (free, email required for higher limits) ----
async function tryMyMemory(book, chapter, verse, englishVerses, langKey) {
  const email = process.env.MYMEMORY_EMAIL
  const mymemoryLang = LANGUAGES[langKey].mymemory
  if (!mymemoryLang || !englishVerses?.length) return null
  const toTranslate = verse ? englishVerses.filter(v => v.v === Number(verse)) : englishVerses
  if (!toTranslate.length) return null
  try {
    const results = []
    for (const v of toTranslate) {
      const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(v.text)}&langpair=en|${mymemoryLang}${email ? `&de=${email}` : ''}`
      const res = await fetch(url)
      if (!res.ok) throw new Error('MyMemory failed')
      const data = await res.json()
      const translated = data?.responseData?.translatedText || v.text
      results.push({ v: v.v, text: translated })
    }
    return {
      verses: results,
      text: verse ? results[0]?.text : undefined,
      source: 'mymemory',
      machineTranslated: true,
      sourceLanguage: 'en',
      sourceTranslation: 'WEB',
      translationName: `Automatically translated (English WEB → ${LANGUAGES[langKey].label})`,
      copyright: 'Machine translation — MyMemory',
    }
  } catch {
    return null
  }
}

// English source (WEB) for fallback translations
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
    let result = await tryApiBible(process.env.BIBLE_API_KEY, langKey, book, chapter, verse).catch(() => null)
    if (!result) result = await tryBibleBrain(process.env.BIBLE_BRAIN_API_KEY, langKey, book, chapter, verse)

    // Machine translation fallbacks – skip PCM entirely (no support)
    if (!result && langKey !== 'PCM') {
      const englishVerses = await fetchEnglishSource(book, chapter)
      if (englishVerses.length) {
        result = await tryGoogleTranslate(book, chapter, verse, englishVerses, langKey)
        if (!result) result = await tryDeepL(book, chapter, verse, englishVerses, langKey)
        if (!result) result = await tryMyMemory(book, chapter, verse, englishVerses, langKey)
      }
    }

    if (!result) {
      res.status(404).json({
        error: `No ${LANGUAGES[langKey].label} text available for ${book} ${chapter} from any source yet.`,
        note: langKey === 'PCM'
          ? 'Nigerian Pidgin has no machine-translation fallback (no provider supports it) — only an authorised Pidgin Bible edition will display here.'
          : 'Add BIBLE_API_KEY, BIBLE_BRAIN_API_KEY, GOOGLE_TRANSLATE_API_KEY, DEEPL_API_KEY, or MYMEMORY_EMAIL to enable this chain.',
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