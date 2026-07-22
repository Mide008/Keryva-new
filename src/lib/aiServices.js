// src/lib/aiServices.js
function parseJSON(raw) {
  if (!raw) return null
  try {
    let cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim()
    const match = cleaned.match(/\{[\s\S]*\}/)
    if (match) cleaned = match[0]
    return JSON.parse(cleaned)
  } catch { return null }
}

export const SERMON_PROMPTS = {
  generate: (p) => `Generate a complete sermon. Return ONLY valid JSON with no extra text. Use this exact structure:
{
  "title": "Sermon Title",
  "theme": "One-line theme",
  "mainText": "${p.scripture || 'Scripture reference'}",
  "introduction": "3-4 sentence introduction",
  "points": [
    { "title": "Point 1", "content": "Content", "scripture": "reference — verse text in ${p.translation||'KJV'}" },
    { "title": "Point 2", "content": "Content", "scripture": "reference — verse text" },
    { "title": "Point 3", "content": "Content", "scripture": "reference — verse text" }
  ],
  "illustrations": ["illustration 1", "illustration 2"],
  "application": "Application paragraph",
  "prayerPoints": ["prayer point 1", "prayer point 2"],
  "altarCall": "Altar call text",
  "closingPrayer": "Closing prayer",
  "preachingNotes": "Bullet-point preaching notes"
}

Topic: ${p.topic}
Scripture: ${p.scripture || 'Not specified'}
Audience: ${p.audience}
Style: ${p.denomination}
Length: ${p.length}
Tone: ${p.tone}
Translation: ${p.translation || 'KJV'}
IMPORTANT: Never invent verse text. Use real references only.${p.languageLabel && p.languageLabel!=='English' ? `\nRespond fully in ${p.languageLabel} (translate all narrative text; keep scripture references in their normal form).` : ''} Return ONLY the JSON object.`,

  improveSection: (section, content, ctx) => `Improve this sermon section for a ${ctx.audience} in ${ctx.tone} tone.
Section: ${section}
Current text: "${content}"
Return ONLY the improved text, no JSON wrapper, no markdown.`,

  nigerianContext: (content) => `Make this sermon content more contextual and relatable for a Nigerian congregation. Keep the scripture accurate.
Content: "${content}"
Return improved text only.`,

  youthSimplify: (content) => `Simplify this sermon section for a youth audience (ages 15-25). Keep it engaging and biblical.
Content: "${content}"
Return simplified text only.`,

  preachingNotes: (sermon) => `Create concise preaching notes from this sermon for use at the pulpit.
Title: ${sermon.title}
Main points: ${sermon.points?.map((p,i)=>`${i+1}. ${p.title}`).join(', ')}
Return bullet-point preaching notes only.`,
}

export const SUNDAY_PACK_PROMPTS = {
  generate: (p) => `Generate a complete Sunday service pack. Return ONLY valid JSON with no extra text.
{
  "bulletinHeader": "Header text",
  "orderOfService": ["item1", "item2", "item3", "item4", "item5"],
  "openingPrayer": "Opening prayer text",
  "callToWorship": "Call to worship text",
  "sermonSummary": "2-3 sentence sermon summary",
  "keyScriptures": ["scripture1", "scripture2"],
  "prayerPoints": ["prayer1", "prayer2", "prayer3"],
  "announcements": "${p.announcements || ''}",
  "newBelieverMessage": "Message for new believers",
  "whatsappMessage": "Brief WhatsApp announcement",
  "closingBlessing": "Closing blessing"
}
Details:
Topic/Title: ${p.topic}
Date: ${p.date}
Scripture: ${p.scripture}
Church: ${p.church || 'Our Church'}
Speaker: ${p.speaker || ''}
Theme: ${p.theme || ''}
Announcements: ${p.announcements || ''}${p.languageLabel && p.languageLabel!=='English' ? `\nRespond fully in ${p.languageLabel}.` : ''}
Return ONLY the JSON object.`,
}

export const SOCIAL_PACK_PROMPTS = {
  generate: (p) => `Generate church social media content. Return ONLY valid JSON with no extra text.
{
  "instagram": ["caption1", "caption2", "caption3"],
  "whatsapp": ["post1", "post2", "post3"],
  "facebook": ["post1", "post2", "post3"],
  "quotes": ["quote1", "quote2", "quote3", "quote4", "quote5"],
  "reelsScript": "Script for a 30-second reel",
  "sundayInvite": "Sunday service invite text",
  "midweekReminder": "Midweek reminder text",
  "hashtags": ["#hashtag1", "#hashtag2"],
  "imagePrompt": "Description for an image"
}
Details:
Theme/Topic: ${p.topic}
Scripture: ${p.scripture}
Church: ${p.church || ''}
Platform focus: ${p.platform}
Tone: ${p.tone}
Content type: ${p.contentType}${p.languageLabel && p.languageLabel!=='English' ? `\nRespond fully in ${p.languageLabel}.` : ''}
Return ONLY the JSON object.`,
}

export const STUDY_GUIDE_PROMPTS = {
  generate: (p) => `Generate a complete Bible study guide. Return ONLY valid JSON with no extra text.
{
  "title": "Study Title",
  "objective": "Learning objective",
  "icebreaker": "Icebreaker question",
  "openingPrayer": "Opening prayer",
  "mainScripture": "Main scripture reference",
  "backgroundContext": "2-3 sentence context",
  "lessonPoints": ["point1", "point2", "point3"],
  "discussionQuestions": [${Array.from({length:p.numQuestions||6}).map((_,i)=>`"question ${i+1}"`).join(', ')}],
  "reflectionPrompt": "Reflection prompt",
  "groupActivity": "Group activity description",
  "weeklyChallenge": "Weekly challenge",
  "closingPrayer": "Closing prayer",
  "whatsappInvite": "WhatsApp invite message"
}
Details:
Topic/Passage: ${p.topic}
Group type: ${p.groupType}
Session length: ${p.length}
Tone: ${p.tone}
Questions: ${p.numQuestions || 6}
Translation: ${p.translation || 'KJV'}${p.languageLabel && p.languageLabel!=='English' ? `\nRespond fully in ${p.languageLabel}.` : ''}
Return ONLY the JSON object.`,
}

export const VERSE_PROMPTS = {
  explain: (ref, text) => `Explain this Bible verse clearly and pastorally:
${ref}: "${text}"
Return 3 paragraphs: 1) Historical context, 2) Meaning, 3) Daily application. No JSON.`,
  preachingAngle: (ref, text) => `Give 3 distinct preaching angles for this verse:
${ref}: "${text}"
Format: 1. [Angle title] — [2-sentence description]. Return plain text.`,
  counsellingAngle: (ref, text) => `Give a pastoral counselling application for this verse:
${ref}: "${text}"
How would a pastor use this in counselling? 2-3 sentences. Plain text.`,
  youthExplanation: (ref, text) => `Explain this verse for teenagers (ages 13-19) in simple, relatable language:
${ref}: "${text}"
2-3 sentences with a modern-day example. Plain text.`,
}

export const PRAYER_PROMPTS = {
  encouragement: (prayer) => `Write a short pastoral encouragement message for someone with this prayer request:
"${prayer}"
Warm, faith-building, 3-4 sentences. Include one scripture reference (real reference only). Plain text.`,
  whatsappResponse: (prayer) => `Write a WhatsApp message responding to this prayer request with encouragement:
"${prayer}"
Friendly, warm, brief (under 120 words). Include one real scripture. Plain text.`,
}

export const RESPONSE_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'yo', label: 'Yoruba' },
  { code: 'ig', label: 'Igbo' },
  { code: 'pcm', label: 'Nigerian Pidgin' },
  { code: 'fr', label: 'French' },
  { code: 'es', label: 'Spanish' },
]

// Resolves the app's UI language setting to a label the AI prompts understand,
// so switching language in Settings changes what every page generates too —
// not just the nav and static labels.
export function languageLabelFor(code) {
  return RESPONSE_LANGUAGES.find(l => l.code === code)?.label || 'English'
}

export const WARFARE_PROMPTS = {
  generate: (p) => `You are a spiritual warfare intercessor and pastoral counsellor. Someone has come to you with a real, often heavy situation. Respond with real biblical authority and warmth — never generic.

Return ONLY valid JSON with no extra text, in ${p.languageLabel || 'English'}, in this exact structure:
{
  "situationSummary": "One sentence, compassionate, naming what they're facing without judgment",
  "solution": "3-4 sentence biblical framing of the path forward — what Scripture says is true and available to them right now",
  "battleScriptures": [
    { "ref": "Book Chapter:Verse", "text": "exact verse text in ${p.translation || 'KJV'} — never invent scripture" },
    { "ref": "Book Chapter:Verse", "text": "exact verse text" },
    { "ref": "Book Chapter:Verse", "text": "exact verse text" }
  ],
  "declarations": ["First-person declaration/confession 1", "Declaration 2", "Declaration 3", "Declaration 4"],
  "prayerPoints": ["Specific prayer point 1", "Prayer point 2", "Prayer point 3", "Prayer point 4"],
  "howToFight": "A short numbered strategy (as one string with line breaks) for the next 7 days — concrete spiritual disciplines, not vague encouragement",
  "encouragement": "2-3 sentence warm closing encouragement, pastoral, hope-filled"
}

What they are facing: "${p.situation}"
Translation: ${p.translation || 'KJV'}
Respond fully in ${p.languageLabel || 'English'}. Never fabricate scripture references or text. Return ONLY the JSON object.`,
}

export const DEVOTIONAL_PROMPTS = {
  generate: (p) => `Write today's daily devotional. Return ONLY valid JSON with no extra text, in ${p.languageLabel || 'English'}:
{
  "verseRef": "${p.verseRef}",
  "verseText": "${p.verseText}",
  "title": "A short, warm devotional title (not just the verse reference)",
  "reflection": "3-4 sentence pastoral reflection connecting this verse to everyday life",
  "application": "One specific, concrete action for today, one sentence",
  "prayer": "A 2-3 sentence prayer based on this verse",
  "declaration": "A single first-person faith declaration drawn directly from this verse"
}
Translation: ${p.translation || 'KJV'}
Respond fully in ${p.languageLabel || 'English'}. Return ONLY the JSON object.`,
}

export const CONFESSION_PROMPTS = {
  generate: (p) => `Generate today's scripture-based declarations and confessions for a believer to speak over their life. Return ONLY valid JSON with no extra text, in ${p.languageLabel || 'English'}:
{
  "theme": "${p.theme || 'General faith'}",
  "declarations": [
    { "text": "First-person declaration 1, rooted in scripture", "ref": "Supporting reference" },
    { "text": "Declaration 2", "ref": "Supporting reference" },
    { "text": "Declaration 3", "ref": "Supporting reference" },
    { "text": "Declaration 4", "ref": "Supporting reference" },
    { "text": "Declaration 5", "ref": "Supporting reference" }
  ]
}
Theme/focus area: ${p.theme || 'General faith, identity, and daily strength'}
Translation: ${p.translation || 'KJV'}
Respond fully in ${p.languageLabel || 'English'}. Never fabricate scripture references. Return ONLY the JSON object.`,
}

export function useAIServices(ask) {
  return {
    generateSermon: async (params) => {
      const response = await ask(SERMON_PROMPTS.generate(params))
      return parseJSON(response)
    },
    improveSection: async (section, content, ctx) => ask(SERMON_PROMPTS.improveSection(section, content, ctx)),
    nigerianContext: async (content) => ask(SERMON_PROMPTS.nigerianContext(content)),
    youthSimplify: async (content) => ask(SERMON_PROMPTS.youthSimplify(content)),
    preachingNotes: async (sermon) => ask(SERMON_PROMPTS.preachingNotes(sermon)),
    generateSundayPack: async (params) => {
      const response = await ask(SUNDAY_PACK_PROMPTS.generate(params))
      return parseJSON(response)
    },
    generateSocialPack: async (params) => {
      const response = await ask(SOCIAL_PACK_PROMPTS.generate(params))
      return parseJSON(response)
    },
    generateStudyGuide: async (params) => {
      const response = await ask(STUDY_GUIDE_PROMPTS.generate(params))
      return parseJSON(response)
    },
    explainVerse: async (ref, text) => ask(VERSE_PROMPTS.explain(ref, text)),
    preachingAngle: async (ref, text) => ask(VERSE_PROMPTS.preachingAngle(ref, text)),
    counsellingAngle: async (ref, text) => ask(VERSE_PROMPTS.counsellingAngle(ref, text)),
    youthExplanation: async (ref, text) => ask(VERSE_PROMPTS.youthExplanation(ref, text)),
    prayerEncouragement: async (prayer) => ask(PRAYER_PROMPTS.encouragement(prayer)),
    prayerWhatsApp: async (prayer) => ask(PRAYER_PROMPTS.whatsappResponse(prayer)),
    generateWarfare: async (params) => {
      const response = await ask(WARFARE_PROMPTS.generate(params))
      return parseJSON(response)
    },
    generateDevotional: async (params) => {
      const response = await ask(DEVOTIONAL_PROMPTS.generate(params))
      return parseJSON(response)
    },
    generateConfessions: async (params) => {
      const response = await ask(CONFESSION_PROMPTS.generate(params))
      return parseJSON(response)
    },
  }
}