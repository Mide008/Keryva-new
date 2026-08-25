// api/ai.js — Vercel Serverless Function (Node runtime)
// Keeps every AI provider key server-side. The browser only ever calls
// same-origin /api/ai and never sees API keys, model names, or which
// provider actually served a given request.
//
// Task-based routing (not a fixed provider order):
//   task: 'fast'     -> Groq first (verse explain, captions, short rewrites,
//                        tool selection for the in-app agent)
//   task: 'longform'  -> Gemini first (sermons, devotionals, study guides,
//                        Sunday Packs, structured long-form output)
// A secondary provider is only tried on a genuine request failure (network
// error, non-2xx, malformed response) — never because the output "wasn't
// good enough". That judgment is not this layer's job.

const isRealKey = (k) => !!k && !/^your[-_]/i.test(k) && k.length > 8

async function callClaude(prompt, key) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model: 'claude-sonnet-5', max_tokens: 4096, messages: [{ role: 'user', content: prompt }] }),
  })
  if (!res.ok) { const e = new Error('claude_failed'); e.status = res.status; throw e }
  const data = await res.json()
  const text = data.content?.find(b => b.type === 'text')?.text
  if (!text) throw new Error('claude_empty')
  return text
}

async function callGemini(prompt, key) {
  // checked 2026-08-25 — gemini-2.0-flash was retired by Google; using
  // gemini-2.5-flash (active). Re-verify at ai.google.dev/gemini-api/docs/models
  // every few months, as Google does not keep dated snapshots alive long-term.
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }),
  })
  if (!res.ok) { const e = new Error('gemini_failed'); e.status = res.status; throw e }
  const data = await res.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text
  if (!text) throw new Error('gemini_empty')
  return text
}

async function callGroq(prompt, key) {
  // checked 2026-08-25 — llama-3.3-70b-versatile was deprecated by Groq
  // on 2026-08-16; using openai/gpt-oss-120b (their recommended replacement).
  // Re-verify at console.groq.com/docs/deprecations periodically.
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'openai/gpt-oss-120b', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
  })
  if (!res.ok) { const e = new Error('groq_failed'); e.status = res.status; throw e }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('groq_empty')
  return text
}

async function callOpenRouter(prompt, key) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: 'meta-llama/llama-3.3-70b-instruct:free', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }),
  })
  if (!res.ok) { const e = new Error('openrouter_failed'); e.status = res.status; throw e }
  const data = await res.json()
  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('openrouter_empty')
  return text
}

const PROVIDERS = {
  claude: { fn: callClaude, key: () => process.env.ANTHROPIC_API_KEY },
  gemini: { fn: callGemini, key: () => process.env.GEMINI_API_KEY },
  groq: { fn: callGroq, key: () => process.env.GROQ_API_KEY },
  openrouter: { fn: callOpenRouter, key: () => process.env.OPENROUTER_API_KEY },
}

const ROUTES = {
  fast: ['groq', 'gemini', 'claude', 'openrouter'],
  longform: ['gemini', 'claude', 'groq', 'openrouter'],
}

// Internal function — importable by other server routes (e.g. api/mcp.js)
// without going through HTTP, so the MCP server reuses the exact same
// routing and never duplicates provider logic.
export async function generate(prompt, task = 'longform') {
  const order = ROUTES[task] || ROUTES.longform
  let lastErr = null
  for (const name of order) {
    let key
    try {
      key = PROVIDERS[name].key()
    } catch {
      continue
    }
    if (!isRealKey(key)) continue
    try {
      const text = await PROVIDERS[name].fn(prompt, key)
      if (text) return { text, ok: true }
    } catch (err) {
      lastErr = err
      continue
    }
  }
  return { text: null, ok: false, category: categorize(lastErr) }
}

function categorize(err) {
  if (!err) return 'unavailable'
  if (err.status === 429) return 'rate_limited'
  if (err.status === 504 || /timeout/i.test(err.message || '')) return 'timeout'
  if (err.status >= 500) return 'unavailable'
  return 'unavailable'
}

// Human, provider-free messages — this is the only text the browser ever sees
// on failure. No model names, no raw provider error text, no status codes.
const HUMAN_MESSAGES = {
  rate_limited: "Personalised generation has reached today's free capacity. Your Bible reader, saved content and offline resources remain fully available — please try again shortly.",
  timeout: "That took longer than expected. Please try again — your saved content and Bible reader are unaffected.",
  unavailable: "Personalised generation is temporarily unavailable. Your Bible reader, saved content and offline resources remain available.",
}

export default async function handler(req, res) {
  // Everything below is wrapped in try/catch on purpose: whatever happens —
  // a bad env var, a provider SDK throwing something unexpected, anything —
  // this function must always return readable JSON, never crash outright.
  // A crash (FUNCTION_INVOCATION_FAILED) gives the browser nothing to show
  // the user and nothing useful in DevTools; a caught error always does.
  try {
    res.setHeader('Access-Control-Allow-Credentials', 'true')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')

    if (req.method === 'OPTIONS') {
      res.status(200).end()
      return
    }
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' })
      return
    }

    let body = req.body
    if (typeof body === 'string') {
      try { body = JSON.parse(body) } catch { body = {} }
    }
    const { prompt, task } = body || {}
    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Missing prompt' })
      return
    }

    const result = await generate(prompt, task === 'fast' ? 'fast' : 'longform')
    if (result.ok) {
      res.status(200).json({ text: result.text })
      return
    }
    res.status(200).json({
      text: null,
      error: HUMAN_MESSAGES[result.category] || HUMAN_MESSAGES.unavailable,
    })
  } catch (err) {
    // Last-resort catch — logs the real cause to Vercel Runtime Logs
    // (server-side only) and still returns clean JSON to the browser.
    console.error('api/ai unexpected error:', err)
    res.status(200).json({ text: null, error: HUMAN_MESSAGES.unavailable })
  }
}