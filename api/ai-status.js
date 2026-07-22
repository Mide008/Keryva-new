// api/ai-status.js — Vercel Serverless Function
// Reports which providers are configured server-side, without ever
// exposing key values to the browser. Used by Settings to show real status.

const isRealKey = (k) => !!k && !/^your[-_]/i.test(k) && k.length > 8

export default function handler(req, res) {
  res.status(200).json({
    claude: isRealKey(process.env.ANTHROPIC_API_KEY),
    gemini: isRealKey(process.env.GEMINI_API_KEY),
    groq: isRealKey(process.env.GROQ_API_KEY),
    openrouter: isRealKey(process.env.OPENROUTER_API_KEY),
    esv: isRealKey(process.env.ESV_API_KEY),
  })
}
