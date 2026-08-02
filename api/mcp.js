// api/mcp.js — Remote MCP server (Vercel Serverless Function, Node runtime)
//
// Separate route from the main app: this is /api/mcp, distinct from /api/ai
// which only the Keryva frontend calls. Any MCP-compatible client (Claude,
// etc.) can point at https://<your-deployment>/api/mcp.
//
// Scope, deliberately narrow:
//   - Scripture search, verification, cross-reference-style lookups
//   - Sermon / study guide / Sunday Pack drafting (returns content only —
//     does NOT save to any user's library; there is no user identity here)
//   - Content translation
//   - Static ministry template list
//
// Explicitly NOT exposed, on purpose:
//   - Prayer journal data (private by default; would need an explicit
//     per-user grant once accounts exist — not possible to grant in a
//     stateless, unauthenticated server)
//   - Any save/delete/publish/calendar-write tool (nothing persists here —
//     there is no account to persist to yet). This is what makes the
//     "confirm before saving" requirement a non-issue at this phase: there
//     is nothing to confirm because there is nothing destructive on offer.
//   - Provider/model identity — tool results never mention which AI engine
//     produced them.
//
// This file is intentionally self-contained (no imports from src/) because
// several client-side modules touch IndexedDB/localStorage, which don't
// exist in a Node serverless runtime.

const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: 'keryva-mcp', version: '1.1.0' }

// Resources — read-only reference data an assistant can look up but never
// modify (translations list, templates, glossaries). Kept intentionally
// static/public: no user library, prayer journal, or calendar data here —
// that stays behind tools that don't exist yet in this stateless phase.
const RESOURCES = [
  { uri: 'keryva://bible/translations', name: 'Available Bible translations', mimeType: 'application/json' },
  { uri: 'keryva://templates/sermons', name: 'Sermon structure template', mimeType: 'application/json' },
  { uri: 'keryva://templates/fasting', name: 'Fasting plan template', mimeType: 'application/json' },
]

async function readResource(uri) {
  if (uri === 'keryva://bible/translations') {
    return { translations: ['KJV','NKJV','NIV','NLT','ESV','AMP','MSG','NASB','CSB','NCV','GNT','NRSV','TLB','WEB','YLT','YOR','IBO','PCM'], note: 'YOR/IBO/PCM are native-language editions via a Scripture-provider fallback chain, never live machine translation of the verse text.' }
  }
  if (uri === 'keryva://templates/sermons') {
    return { fields: ['title','theme','mainText','introduction','points','application','altarCall','closingPrayer','prayerPoints'] }
  }
  if (uri === 'keryva://templates/fasting') {
    return { fields: ['purpose','whatToExpect','scriptures','dailyPrayerFocus','practicalTips','breakingTheFast','encouragement'] }
  }
  return null
}

// Prompts — named, parameterised workflow templates. These guide a host
// assistant through a multi-step Keryva task without exposing the detailed
// instructions to the end user directly.
const PROMPTS = [
  { name: 'prepare_sunday_service', description: 'Plan a full Sunday service from one topic: sermon, Sunday Pack, and social content.', arguments: [{ name: 'topic', required: true }, { name: 'date', required: false }] },
  { name: 'build_sermon_series', description: 'Outline a multi-week sermon series from one overall theme.', arguments: [{ name: 'theme', required: true }, { name: 'weeks', required: false }] },
  { name: 'turn_sermon_into_study', description: 'Convert an existing sermon topic/scripture into a small-group study guide.', arguments: [{ name: 'topic', required: true }, { name: 'scripture', required: false }] },
  { name: 'create_21_day_fast', description: 'Build a 21-day church fasting programme with daily subthemes and scriptures.', arguments: [{ name: 'theme', required: true }] },
]

function getPrompt(name, args) {
  const a = args || {}
  const templates = {
    prepare_sunday_service: `Prepare a complete Sunday service for "${a.topic}"${a.date ? ` on ${a.date}` : ''}. First draft the sermon (create_sermon_draft), then build the Sunday Pack from it (create_sunday_pack), then suggest social content. Ask before treating anything as final — this is a draft to review, not a finished service.`,
    build_sermon_series: `Outline a ${a.weeks || 4}-week sermon series on "${a.theme}". For each week give a working title, one anchor scripture, and a one-sentence angle distinct from the other weeks — avoid repeating the same point across weeks.`,
    turn_sermon_into_study: `Using the sermon topic "${a.topic}"${a.scripture ? ` and main scripture ${a.scripture}` : ''}, build a small-group study guide (create_study_guide) that reinforces the same theme without just repeating the sermon outline verbatim.`,
    create_21_day_fast: `Build a 21-day church fasting programme on "${a.theme}": an overall programme theme, then a distinct daily subtheme, scripture, and short prayer point for each of the 21 days, plus a closing thanksgiving-service outline for day 21.`,
  }
  return templates[name] || null
}

// ---- AI plumbing (mirrors api/ai.js routing, duplicated to keep this file
// import-free; see api/ai.js for the canonical, documented version used by
// the app itself) ----
const isRealKey = (k) => !!k && !/^your[-_]/i.test(k) && k.length > 8

async function callGemini(prompt, key) {
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (!res.ok) throw new Error('gemini_failed')
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini_empty')
  return text
}

async function callGroq(prompt, key) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
  })
  if (!res.ok) throw new Error('groq_failed')
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('groq_empty')
  return text
}

async function generateText(prompt, task) {
  const geminiKey = process.env.GEMINI_API_KEY
  const groqKey = process.env.GROQ_API_KEY
  const order = task === 'fast'
    ? [['groq', callGroq, groqKey], ['gemini', callGemini, geminiKey]]
    : [['gemini', callGemini, geminiKey], ['groq', callGroq, groqKey]]
  for (const [, fn, key] of order) {
    if (!isRealKey(key)) continue
    try { return await fn(prompt, key) } catch { continue }
  }
  return null
}

// ---- Scripture verification (no AI — direct Bible API lookup) ----
const BIBLE_API_MAP = { KJV: 'kjv', NIV: 'kjv', ESV: 'kjv', NLT: 'kjv', NKJV: 'kjv', ASV: 'asv', WEB: 'web' }

async function verifyScripture(reference, translation = 'KJV') {
  if (!reference || typeof reference !== 'string') return { verified: false, reason: 'No reference given' }
  const apiCode = BIBLE_API_MAP[translation] || 'kjv'
  try {
    const res = await fetch(`https://bible-api.com/${encodeURIComponent(reference.trim())}?translation=${apiCode}`)
    if (!res.ok) return { verified: false, reason: 'Reference not found' }
    const data = await res.json()
    if (!data?.text || !data?.verses?.length) return { verified: false, reason: 'Empty response — likely an invented or malformed reference' }
    return { verified: true, text: data.text.trim().replace(/\s+/g, ' '), reference: data.reference || reference }
  } catch {
    return { verified: false, reason: 'Network error while verifying' }
  }
}

// ---- Static content (no AI, no auth needed) ----
const MINISTRY_TEMPLATES = [
  'Wedding sermon', 'Funeral message', 'Child dedication', 'Thanksgiving service',
  'Communion service', 'Baptism teaching', 'New believer class', "Workers' training",
  'Leadership meeting', 'Church anniversary', 'Youth service', "Women's meeting",
  "Men's fellowship", 'Prayer and fasting programme', 'Outreach message', 'Counselling session guide',
]

// ---- Tool definitions (MCP tools/list shape) ----
const TOOLS = [
  {
    name: 'verify_scripture',
    description: "Fetches the real text of a Bible reference directly from a Bible API — never from a model's memory. Use this to check any scripture reference before presenting it as fact.",
    inputSchema: {
      type: 'object',
      properties: {
        reference: { type: 'string', description: 'e.g. "Romans 8:28" or "Isaiah 41:10"' },
        translation: { type: 'string', description: 'KJV, ASV, or WEB (public-domain translations only in this phase)', default: 'KJV' },
      },
      required: ['reference'],
    },
  },
  {
    name: 'search_scripture',
    description: 'Suggests Bible verses relevant to a topic or situation, each independently verified against the real text before being returned.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string', description: 'A topic, feeling, or situation, e.g. "anxiety about the future"' },
        language: { type: 'string', description: 'Response language, default English', default: 'English' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'create_sermon_draft',
    description: 'Drafts a structured sermon (title, introduction, points with scripture, application, altar call, closing prayer). Returns content only — does not save anywhere, since this server has no user accounts yet.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        scripture: { type: 'string', description: 'Optional anchor passage' },
        audience: { type: 'string', default: 'General congregation' },
        tone: { type: 'string', default: 'Inspirational' },
        length: { type: 'string', default: '30-minute sermon' },
        translation: { type: 'string', default: 'KJV' },
        language: { type: 'string', default: 'English' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'create_study_guide',
    description: 'Drafts a small-group Bible study guide: icebreaker, scripture, discussion questions, closing prayer. Content only, not saved.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        groupType: { type: 'string', default: 'Adults' },
        length: { type: 'string', default: '60 minutes' },
        translation: { type: 'string', default: 'KJV' },
        language: { type: 'string', default: 'English' },
      },
      required: ['topic'],
    },
  },
  {
    name: 'create_sunday_pack',
    description: 'Drafts a Sunday service pack: bulletin copy, prayer points, announcements, WhatsApp-ready message. Content only, not saved.',
    inputSchema: {
      type: 'object',
      properties: {
        topic: { type: 'string' },
        date: { type: 'string', description: 'Service date, e.g. "2026-08-03"' },
        scripture: { type: 'string' },
        church: { type: 'string', default: 'Our Church' },
        language: { type: 'string', default: 'English' },
      },
      required: ['topic', 'date'],
    },
  },
  {
    name: 'translate_content',
    description: 'Translates ministry text into another language, preserving pastoral tone.',
    inputSchema: {
      type: 'object',
      properties: {
        text: { type: 'string' },
        targetLanguage: { type: 'string' },
      },
      required: ['text', 'targetLanguage'],
    },
  },
  {
    name: 'create_fasting_plan',
    description: 'Builds a personal fasting plan: purpose, what to expect, scriptures, daily prayer focus, practical tips, how to break the fast. Content only, not saved (no user accounts on this server).',
    inputSchema: {
      type: 'object',
      properties: {
        fastType: { type: 'string', default: 'Partial fast' },
        duration: { type: 'string', default: '1 day' },
        goal: { type: 'string', description: 'What the fast is for' },
        language: { type: 'string', default: 'English' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'generate_fasting_prayer_points',
    description: 'Generates focused prayer points for a specific fasting goal — shorter than a full plan, for quick daily use.',
    inputSchema: {
      type: 'object',
      properties: {
        goal: { type: 'string' },
        language: { type: 'string', default: 'English' },
      },
      required: ['goal'],
    },
  },
  {
    name: 'turn_fast_into_church_programme',
    description: 'Builds a multi-day church-wide fasting programme (e.g. "21 Days of Prayer and Fasting"): theme, daily subthemes/scriptures/prayer points, WhatsApp messages, social post, midweek outline, closing thanksgiving service.',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        days: { type: 'number', default: 21 },
        focus: { type: 'string' },
        language: { type: 'string', default: 'English' },
      },
      required: ['title', 'focus'],
    },
  },
  {
    name: 'list_ministry_templates',
    description: 'Lists available structured starting-point templates (wedding, funeral, dedication, etc). No AI call, no auth required.',
    inputSchema: { type: 'object', properties: {} },
  },
]

async function callTool(name, args) {
  args = args || {}
  switch (name) {
    case 'verify_scripture': {
      const result = await verifyScripture(args.reference, args.translation)
      return result
    }
    case 'search_scripture': {
      const prompt = `Suggest 4-6 Bible verses relevant to: "${args.topic}". Return ONLY JSON: {"verses":[{"reference":"...","reason":"..."}]}. Respond in ${args.language || 'English'}.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      let parsed
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse suggestions.' } }
      const verses = parsed.verses || []
      const verified = await Promise.all(verses.map(async v => {
        const check = await verifyScripture(v.reference)
        return check.verified
          ? { reference: check.reference, text: check.text, reason: v.reason, verified: true }
          : { reference: v.reference, reason: v.reason, verified: false, note: 'Could not verify this reference — treat with caution.' }
      }))
      return { verses: verified }
    }
    case 'create_sermon_draft': {
      const prompt = `Build a complete sermon on "${args.topic}"${args.scripture ? ` anchored on ${args.scripture}` : ''}. Audience: ${args.audience || 'General congregation'}. Tone: ${args.tone || 'Inspirational'}. Length: ${args.length || '30-minute sermon'}. Translation: ${args.translation || 'KJV'}. Respond in ${args.language || 'English'}. Return ONLY JSON: {"title":"","introduction":"","points":[{"title":"","content":"","scripture":""}],"application":"","altarCall":"","closingPrayer":""}. Never invent scripture text — cite references only, real text will be verified separately.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      let parsed
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse sermon draft.' } }
      if (parsed.points) {
        parsed.points = await Promise.all(parsed.points.map(async p => {
          if (!p.scripture) return p
          const check = await verifyScripture(p.scripture, args.translation)
          return { ...p, scriptureVerified: check.verified, scriptureText: check.verified ? check.text : undefined }
        }))
      }
      return { ...parsed, disclaimer: 'Draft only. Verify all scripture and add your own Spirit-led voice before preaching.' }
    }
    case 'create_study_guide': {
      const prompt = `Create a small group study guide on "${args.topic}". Group: ${args.groupType || 'Adults'}. Length: ${args.length || '60 minutes'}. Translation: ${args.translation || 'KJV'}. Respond in ${args.language || 'English'}. Return ONLY JSON: {"icebreaker":"","mainScripture":"","backgroundContext":"","discussionQuestions":[""],"closingPrayer":""}.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      try { return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse study guide.' } }
    }
    case 'create_sunday_pack': {
      const prompt = `Create a Sunday service pack for "${args.topic}" on ${args.date} at ${args.church || 'Our Church'}${args.scripture ? `, scripture: ${args.scripture}` : ''}. Respond in ${args.language || 'English'}. Return ONLY JSON: {"bulletin":"","prayerPoints":[""],"announcements":"","whatsappMessage":""}.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      try { return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse Sunday Pack.' } }
    }
    case 'translate_content': {
      const prompt = `Translate the following ministry text into ${args.targetLanguage}, preserving pastoral tone. Return ONLY the translated text, nothing else.\n\n${args.text}`
      const raw = await generateText(prompt, 'fast')
      if (!raw) return { error: 'Translation is temporarily unavailable.' }
      return { translated: raw.trim() }
    }
    case 'create_fasting_plan': {
      const prompt = `Build a fasting plan for someone doing a ${args.fastType || 'Partial fast'} for ${args.duration || '1 day'}, for this goal: "${args.goal}". Keep it spiritually focused — no medical or dietary instructions. Respond in ${args.language || 'English'}. Return ONLY JSON: {"purpose":"","whatToExpect":"","scriptures":[{"ref":"","text":""}],"dailyPrayerFocus":[""],"practicalTips":[""],"breakingTheFast":"","encouragement":""}. Never invent scripture text — cite references only, real text will be verified separately.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      let parsed
      try { parsed = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse the fasting plan.' } }
      if (parsed.scriptures) {
        parsed.scriptures = await Promise.all(parsed.scriptures.map(async s => {
          const check = await verifyScripture(s.ref)
          return check.verified ? { ref: check.reference, text: check.text, verified: true } : { ref: s.ref, verified: false, note: 'Could not verify this reference — treat with caution.' }
        }))
      }
      return parsed
    }
    case 'generate_fasting_prayer_points': {
      const prompt = `Give 5-6 short, focused prayer points for someone fasting for this goal: "${args.goal}". Respond in ${args.language || 'English'}. Return ONLY JSON: {"prayerPoints":[""]}.`
      const raw = await generateText(prompt, 'fast')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      try { return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse prayer points.' } }
    }
    case 'turn_fast_into_church_programme': {
      const days = Math.min(Math.max(Number(args.days) || 21, 1), 21) // capped — keep response size sane
      const prompt = `Build a ${days}-day church fasting programme titled "${args.title}" focused on: "${args.focus}". Respond in ${args.language || 'English'}. Return ONLY JSON: {"theme":"","days":[{"day":1,"subtheme":"","scripture":{"ref":"","text":""},"prayerPoint":"","devotional":""}],"whatsappMessages":["","",""],"socialPost":"","midweekOutline":"","finalThanksgivingService":""}. One entry per day, ${days} total. Never invent scripture text — cite references only.`
      const raw = await generateText(prompt, 'longform')
      if (!raw) return { error: 'Personalised generation is temporarily unavailable.' }
      try { return JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] || raw) } catch { return { error: 'Could not parse the programme.' } }
    }
    case 'list_ministry_templates':
      return { templates: MINISTRY_TEMPLATES }
    default:
      throw { code: -32601, message: `Unknown tool: ${name}` }
  }
}

function rpcResult(id, result) { return { jsonrpc: '2.0', id, result } }
function rpcError(id, code, message) { return { jsonrpc: '2.0', id, error: { code, message } } }

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') { res.status(204).end(); return }
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return }

  const body = req.body || {}
  const { id, method, params } = body

  try {
    if (method === 'initialize') {
      res.status(200).json(rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: {}, resources: {}, prompts: {} },
        serverInfo: SERVER_INFO,
        instructions: 'Keryva MCP server. Read-only ministry content tools — scripture verification, sermon/study-guide/Sunday-Pack drafting, translation, templates — plus reference resources and guided workflow prompts. No prayer-journal access, no save/delete/publish tools (stateless — no user accounts in this phase).',
      }))
      return
    }
    if (method === 'notifications/initialized') {
      res.status(202).end()
      return
    }
    if (method === 'ping') {
      res.status(200).json(rpcResult(id, {}))
      return
    }
    if (method === 'resources/list') {
      res.status(200).json(rpcResult(id, { resources: RESOURCES }))
      return
    }
    if (method === 'resources/read') {
      const { uri } = params || {}
      const data = await readResource(uri)
      if (!data) { res.status(200).json(rpcError(id, -32602, `Unknown resource: ${uri}`)); return }
      res.status(200).json(rpcResult(id, { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(data, null, 2) }] }))
      return
    }
    if (method === 'prompts/list') {
      res.status(200).json(rpcResult(id, { prompts: PROMPTS }))
      return
    }
    if (method === 'prompts/get') {
      const { name, arguments: args } = params || {}
      const text = getPrompt(name, args)
      if (!text) { res.status(200).json(rpcError(id, -32602, `Unknown prompt: ${name}`)); return }
      res.status(200).json(rpcResult(id, { messages: [{ role: 'user', content: { type: 'text', text } }] }))
      return
    }
    if (method === 'tools/list') {
      res.status(200).json(rpcResult(id, { tools: TOOLS }))
      return
    }
    if (method === 'tools/call') {
      const { name, arguments: args } = params || {}
      if (!TOOLS.find(t => t.name === name)) {
        res.status(200).json(rpcError(id, -32602, `Unknown tool: ${name}`))
        return
      }
      const result = await callTool(name, args)
      res.status(200).json(rpcResult(id, {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        isError: !!result?.error,
      }))
      return
    }
    res.status(200).json(rpcError(id, -32601, `Unknown method: ${method}`))
  } catch (err) {
    res.status(200).json(rpcError(id, err.code || -32000, err.message || 'Internal error'))
  }
}
