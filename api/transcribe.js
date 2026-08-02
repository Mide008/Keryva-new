// api/transcribe.js — Vercel Serverless Function (Node runtime, default)
// Fallback voice-to-text for browsers where the native Web Speech API
// isn't available (Firefox desktop/Android keep it disabled by default;
// Safari blocks it entirely once a site is installed as a PWA). Uses
// Groq's Whisper endpoint since GROQ_API_KEY is already configured for
// the rest of the app.

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'POST only' }); return }
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) { res.status(404).json({ error: 'GROQ_API_KEY not configured' }); return }

  try {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    const audioBuffer = Buffer.concat(chunks)
    if (!audioBuffer.length) { res.status(400).json({ error: 'No audio received' }); return }

    const form = new FormData()
    form.append('file', new Blob([audioBuffer], { type: req.headers['content-type'] || 'audio/webm' }), 'audio.webm')
    form.append('model', 'whisper-large-v3')
    form.append('response_format', 'json')

    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    })
    if (!groqRes.ok) { res.status(groqRes.status).json({ error: 'Transcription failed' }); return }
    const data = await groqRes.json()
    res.status(200).json({ text: data.text || '' })
  } catch (err) {
    res.status(502).json({ error: 'transcribe proxy failed', detail: err.message })
  }
}

export const config = { api: { bodyParser: false } }
