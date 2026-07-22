// src/lib/quoteCard.js
export function generateQuoteCardImage({ text, reference, appName = 'Keryva' }) {
  const W = 1080, H = 1080
  const canvas = document.createElement('canvas')
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext('2d')

  // Background: warm gradient matching the app's gold/ink palette
  const grad = ctx.createLinearGradient(0, 0, W, H)
  grad.addColorStop(0, '#1C1710')
  grad.addColorStop(1, '#2E2418')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // Subtle gold border
  ctx.strokeStyle = 'rgba(212,168,75,0.35)'
  ctx.lineWidth = 3
  ctx.strokeRect(40, 40, W - 80, H - 80)

  // Ornamental mark
  ctx.fillStyle = '#D4A84B'
  ctx.font = '48px Georgia, serif'
  ctx.textAlign = 'center'
  ctx.fillText('✦', W / 2, 160)

  // Verse text — word-wrapped, centered, serif italic feel
  ctx.fillStyle = '#F5F0E6'
  const fontSize = text.length > 180 ? 38 : text.length > 100 ? 44 : 52
  ctx.font = `italic ${fontSize}px Georgia, serif`
  ctx.textAlign = 'center'
  const maxWidth = W - 160
  const words = text.replace(/^["“]|["”]$/g, '').split(' ')
  let line = '', lines = []
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = word }
    else line = test
  }
  if (line) lines.push(line)
  const lineHeight = fontSize * 1.5
  const startY = H / 2 - (lines.length * lineHeight) / 2
  lines.forEach((l, i) => {
    const display = (i === 0 ? '\u201C' : '') + l + (i === lines.length - 1 ? '\u201D' : '')
    ctx.fillText(display, W / 2, startY + i * lineHeight)
  })

  // Reference
  ctx.fillStyle = '#D4A84B'
  ctx.font = '600 32px Georgia, serif'
  ctx.fillText(reference, W / 2, startY + lines.length * lineHeight + 50)

  // Footer brand mark
  ctx.fillStyle = 'rgba(245,240,230,0.45)'
  ctx.font = '24px Arial, sans-serif'
  ctx.fillText(appName, W / 2, H - 80)

  return canvas.toDataURL('image/png')
}

export function downloadQuoteCard(dataUrl, filename = 'rhema-verse.png') {
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
}
