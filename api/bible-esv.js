// api/bible-esv.js — Vercel Serverless Function
// Proxies the ESV API server-side so ESV_API_KEY never reaches the client.

export default async function handler(req, res) {
  const key = process.env.ESV_API_KEY
  if (!key || /^your[-_]/i.test(key)) { res.status(404).json({ error: 'ESV not configured' }); return }
  const { book, chapter } = req.query
  if (!book || !chapter) { res.status(400).json({ error: 'Missing book/chapter' }); return }
  const ref = encodeURIComponent(`${book} ${chapter}`)
  try {
    const r = await fetch(`https://api.esv.org/v3/passage/text/?q=${ref}&include-headings=false&include-footnotes=false&include-verse-numbers=true&include-short-copyright=false&include-passage-references=false`, {
      headers: { Authorization: `Token ${key}` },
    })
    if (!r.ok) throw new Error(`ESV API ${r.status}`)
    const data = await r.json()
    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ error: err.message })
  }
}
