// src/lib/slideDeck.js
//
// Builds a structured slide deck from already-generated content (a sermon
// or a Sunday Pack) and exports it as a real .pptx file the user can open
// and edit in PowerPoint, Keynote, or Google Slides. No extra AI call is
// needed for either source — both already have the exact structure a
// deck needs (title/theme, numbered points or sections, a close).
//
// Requires the `pptxgenjs` package (client-side, MIT licensed, free —
// runs entirely in the browser, no server or paid API involved):
//   npm install pptxgenjs

const GOLD = 'D4A84B'
const INK = '1C1710'
const CREAM = 'FAF7F2'

// Splits long body text into a few bullet-sized chunks so a slide never
// becomes an unreadable wall of text. Sentence-aware, not a hard character
// cut — keeps whole sentences together.
function toBullets(text, maxBullets = 4){
  if (!text) return []
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (sentences.length <= maxBullets) return sentences
  // Merge down to maxBullets by grouping consecutive sentences evenly
  const perGroup = Math.ceil(sentences.length / maxBullets)
  const out = []
  for (let i=0;i<sentences.length;i+=perGroup) out.push(sentences.slice(i,i+perGroup).join(' '))
  return out
}

export function buildSermonSlideDeck(sermon, { church, speaker } = {}){
  const slides = []

  slides.push({
    layout: 'title',
    title: sermon.title || 'Sermon',
    subtitle: [sermon.theme, sermon.mainText].filter(Boolean).join('  ·  '),
    footer: [church, speaker].filter(Boolean).join('  —  '),
  })

  if (sermon.introduction) {
    slides.push({ layout: 'content', heading: 'Introduction', bullets: toBullets(sermon.introduction) })
  }

  ;(sermon.points || []).forEach((p, i) => {
    slides.push({
      layout: 'content',
      heading: `${i+1}. ${p.title || ''}`,
      scripture: p.scripture || '',
      bullets: toBullets(p.content),
    })
  })

  if (sermon.application) {
    slides.push({ layout: 'content', heading: 'Application', bullets: toBullets(sermon.application) })
  }

  if (sermon.altarCall) {
    slides.push({ layout: 'closing', heading: 'Altar Call', body: sermon.altarCall })
  }

  slides.push({ layout: 'end', text: 'Keryva · OmniCraft Studios' })

  return slides
}

export function buildSundayPackSlideDeck(pack, { date, church } = {}){
  const slides = []

  slides.push({
    layout: 'title',
    title: pack.bulletinHeader || 'Sunday Service',
    subtitle: date || '',
    footer: church || '',
  })

  if (pack.callToWorship) slides.push({ layout: 'content', heading: 'Call to Worship', bullets: toBullets(pack.callToWorship) })
  if (pack.sermonSummary) slides.push({ layout: 'content', heading: 'Today\u2019s Word', bullets: toBullets(pack.sermonSummary) })
  if (Array.isArray(pack.keyScriptures) && pack.keyScriptures.length) {
    slides.push({ layout: 'content', heading: 'Key Scriptures', bullets: pack.keyScriptures })
  }
  if (Array.isArray(pack.prayerPoints) && pack.prayerPoints.length) {
    slides.push({ layout: 'content', heading: 'Prayer Points', bullets: pack.prayerPoints })
  }
  if (pack.announcements) slides.push({ layout: 'content', heading: 'Announcements', bullets: toBullets(pack.announcements) })
  if (pack.closingBlessing) slides.push({ layout: 'closing', heading: 'Closing Blessing', body: pack.closingBlessing })

  slides.push({ layout: 'end', text: 'Keryva · OmniCraft Studios' })

  return slides
}

export async function downloadSlidesPptx(slides, filename = 'slides'){
  const pptxgen = (await import('pptxgenjs')).default
  const pres = new pptxgen()
  pres.defineLayout({ name: 'WIDE', width: 13.33, height: 7.5 })
  pres.layout = 'WIDE'

  for (const s of slides) {
    const slide = pres.addSlide()

    if (s.layout === 'title') {
      slide.background = { color: INK }
      slide.addText(s.title, { x:0.8, y:2.4, w:11.7, h:1.6, fontFace:'Georgia', fontSize:40, color:CREAM, align:'left', bold:false })
      if (s.subtitle) slide.addText(s.subtitle, { x:0.8, y:3.9, w:11.7, h:0.6, fontFace:'Arial', fontSize:16, color:GOLD, align:'left' })
      if (s.footer) slide.addText(s.footer, { x:0.8, y:6.6, w:11.7, h:0.4, fontFace:'Arial', fontSize:12, color:'998877', align:'left' })
      slide.addShape(pres.ShapeType.rect, { x:0.8, y:2.15, w:1.4, h:0.05, fill:{color:GOLD} })
    }

    else if (s.layout === 'content') {
      slide.background = { color: CREAM }
      slide.addText(s.heading, { x:0.7, y:0.5, w:11.9, h:0.9, fontFace:'Georgia', fontSize:28, color:INK, bold:false })
      slide.addShape(pres.ShapeType.rect, { x:0.7, y:1.35, w:0.9, h:0.045, fill:{color:GOLD} })
      let y = 1.7
      if (s.scripture) {
        slide.addText(s.scripture, { x:0.7, y, w:11.9, h:0.6, fontFace:'Georgia', italic:true, fontSize:16, color:'8A6217' })
        y += 0.75
      }
      slide.addText(
        (s.bullets||[]).map(b => ({ text:b, options:{ bullet:{code:'25CF',color:GOLD}, breakLine:true, paraSpaceAfter:14 } })),
        { x:0.7, y, w:11.9, h:6.9-y, fontFace:'Arial', fontSize:18, color:'333333', valign:'top', lineSpacing:26 }
      )
    }

    else if (s.layout === 'closing') {
      slide.background = { color: INK }
      slide.addText(s.heading, { x:0.9, y:0.9, w:11.5, h:0.8, fontFace:'Georgia', fontSize:24, color:GOLD })
      slide.addText(s.body, { x:0.9, y:2.0, w:11.5, h:4.5, fontFace:'Georgia', italic:true, fontSize:22, color:CREAM, lineSpacing:32, valign:'top' })
    }

    else if (s.layout === 'end') {
      slide.background = { color: CREAM }
      slide.addText(s.text, { x:0, y:3.4, w:13.33, h:0.7, align:'center', fontFace:'Georgia', italic:true, fontSize:16, color:'998877' })
    }
  }

  await pres.writeFile({ fileName: `${filename}.pptx` })
}