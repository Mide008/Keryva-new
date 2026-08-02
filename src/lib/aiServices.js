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

// Specialist role framing — the main Keryva Agent still routes to exactly
// ONE of these per request (never running all of them, to keep free-tier
// usage sane); this just scopes each prompt's system framing to its own
// domain so the model stays focused rather than one generic "do anything"
// voice for every kind of task.
const AGENT_ROLES = {
  scripture: 'You are Keryva\u2019s Scripture Agent \u2014 focused only on accurate retrieval, verification, and context of Bible text. Never invent a reference or wording.',
  sermon: 'You are Keryva\u2019s Sermon Agent \u2014 focused on sermon outlines, illustrations, applications, and altar calls.',
  service: 'You are Keryva\u2019s Service Agent \u2014 focused on Sunday Pack, order of service, and bulletin content.',
  prayer: 'You are Keryva\u2019s Prayer Agent \u2014 focused on prayer points, fasting guidance, and reflection.',
  study: 'You are Keryva\u2019s Study Agent \u2014 focused on small-group lessons, discussion questions, and challenges.',
  translation: 'You are Keryva\u2019s Translation Agent \u2014 focused only on faithful translation of the given content, never altering its meaning.',
  review: 'You are Keryva\u2019s Review Agent \u2014 focused only on flagging structural concerns for human review, never declaring doctrinal correctness.',
}
function withRole(role, prompt) { return `${AGENT_ROLES[role]}\n\n${prompt}` }

export const FASTING_END_REVIEW_PROMPT = (entry) => `A user has completed a fast. Write a warm, reflective end-of-fast review based on their own journal entries below — do not invent anything they didn't note.

Fast: ${entry.fastType}, ${entry.duration}. Goal: "${entry.goal}"
Days logged: ${(entry.daysCompleted||[]).length}
Journal entries: ${JSON.stringify((entry.journal||[]).map(j=>({date:j.date, reflection:j.reflection, lesson:j.lesson, answeredPrayer:j.answeredPrayer})))}

Return ONLY valid JSON, no extra text, in ${entry.languageLabel || 'English'}:
{
  "summary": "3-4 sentence warm reflection tying together what they actually wrote, not generic encouragement",
  "growthObserved": "1-2 sentences on any pattern of growth visible across their journal entries, or 'Not enough journal entries to observe a pattern yet' if there's too little to go on",
  "answeredPrayers": ["pull out anything they marked as an answered prayer, verbatim or lightly cleaned up"],
  "encouragement": "2-3 sentence closing encouragement for what's next"
}`

export const CHURCH_FASTING_PROGRAMME_PROMPT = (p) => `Build a church-wide fasting and prayer programme for a pastor to run with their congregation. Respond in ${p.languageLabel || 'English'}.

Programme title: "${p.title}"
Duration: ${p.days} days
Overall focus: "${p.focus}"

Return ONLY valid JSON, no extra text:
{
  "theme": "one overarching programme theme statement",
  "days": [
    { "day": 1, "subtheme": "short daily subtheme", "scripture": { "ref": "Book Chapter:Verse", "text": "exact verse text — never invent scripture" }, "prayerPoint": "one sentence", "devotional": "3-4 sentence short devotional" }
    // one object per day, ${p.days} total
  ],
  "whatsappMessages": ["a short WhatsApp-ready reminder message for the programme launch", "one for the midpoint", "one for the final day"],
  "socialPost": "one short social caption announcing the programme",
  "midweekOutline": "a brief midweek service outline tied to the programme theme",
  "finalThanksgivingService": "a brief outline for a closing thanksgiving service on the last day"
}
Keep each day's content concise — this will be read one day at a time, not all at once. Never fabricate scripture text.`

export const SERMON_REVIEW_PROMPT = (sermon, durationMinutes) => `You are reviewing a sermon draft for a pastor before they preach it. Do NOT judge doctrinal correctness — only flag structural and practical concerns for the pastor's own human judgement.

Sermon (JSON): ${JSON.stringify(sermon)}
Target length: ${durationMinutes || 'not specified'}

Check for:
- Scripture references that look malformed or suspicious (flag for manual verification — you cannot verify text yourself here)
- Whether the introduction actually connects to the stated theme
- Whether the points repeat the same idea rather than building on each other
- Whether there's a clear, concrete application (not just abstract encouragement)
- Whether the conclusion/altar call connects back to the opening
- Whether the estimated speaking length roughly matches the target length (roughly 130 words/minute spoken)
- Tone/language fit for the stated audience

Return ONLY valid JSON, no extra text:
{
  "concerns": [ { "area": "one of: scripture|structure|repetition|application|length|tone", "note": "one specific, concrete observation — not generic praise" } ],
  "strengths": ["one or two specific things that work well"],
  "estimatedMinutes": <number>,
  "summary": "one sentence overall impression, framed as 'worth a look before preaching' not a verdict"
}
If there are genuinely no concerns, return an empty concerns array rather than inventing filler.`

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

export const FASTING_PROMPTS = {
  generate: (p) => `You are a pastoral guide helping someone plan a biblical fast. Respond with real spiritual depth — never generic.

Return ONLY valid JSON with no extra text, in ${p.languageLabel || 'English'}, in this exact structure:
{
  "purpose": "2-3 sentence biblical framing of why fasting for this goal matters, grounded in scripture",
  "whatToExpect": "3-4 sentence honest, encouraging description of physical and spiritual experience during a ${p.fastType || 'partial'} fast lasting ${p.duration || '1 day'}",
  "scriptures": [
    { "ref": "Book Chapter:Verse", "text": "exact verse text in ${p.translation || 'KJV'} — never invent scripture" },
    { "ref": "Book Chapter:Verse", "text": "exact verse text" },
    { "ref": "Book Chapter:Verse", "text": "exact verse text" }
  ],
  "dailyPrayerFocus": ["Day 1 prayer focus, one sentence", "Day 2 prayer focus", "Day 3 prayer focus"],
  "practicalTips": ["Practical tip 1 for this fast type", "Tip 2", "Tip 3"],
  "breakingTheFast": "1-2 sentence guidance on how to end the fast well, physically and spiritually",
  "encouragement": "2-3 sentence warm closing encouragement"
}

Fast type: ${p.fastType || 'Partial fast'}
Duration: ${p.duration || '1 day'}
Goal: "${p.goal}"
Translation: ${p.translation || 'KJV'}
Respond fully in ${p.languageLabel || 'English'}. Never fabricate scripture references or text. If the goal or duration suggests a medically risky extended fast, gently note in whatToExpected that they should consult a doctor first for multi-day full fasts. Return ONLY the JSON object.`,
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
      const response = await ask(withRole('sermon', SERMON_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    improveSection: async (section, content, ctx) => ask(withRole('sermon', SERMON_PROMPTS.improveSection(section, content, ctx))),
    nigerianContext: async (content) => ask(withRole('sermon', SERMON_PROMPTS.nigerianContext(content))),
    youthSimplify: async (content) => ask(withRole('sermon', SERMON_PROMPTS.youthSimplify(content))),
    preachingNotes: async (sermon) => ask(withRole('sermon', SERMON_PROMPTS.preachingNotes(sermon))),
    generateSundayPack: async (params) => {
      const response = await ask(withRole('service', SUNDAY_PACK_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    generateSocialPack: async (params) => {
      const response = await ask(withRole('service', SOCIAL_PACK_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    generateStudyGuide: async (params) => {
      const response = await ask(withRole('study', STUDY_GUIDE_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    explainVerse: async (ref, text) => ask(withRole('scripture', VERSE_PROMPTS.explain(ref, text))),
    preachingAngle: async (ref, text) => ask(withRole('scripture', VERSE_PROMPTS.preachingAngle(ref, text))),
    counsellingAngle: async (ref, text) => ask(withRole('scripture', VERSE_PROMPTS.counsellingAngle(ref, text))),
    youthExplanation: async (ref, text) => ask(withRole('scripture', VERSE_PROMPTS.youthExplanation(ref, text))),
    prayerEncouragement: async (prayer) => ask(PRAYER_PROMPTS.encouragement(prayer)),
    prayerWhatsApp: async (prayer) => ask(PRAYER_PROMPTS.whatsappResponse(prayer)),
    generateWarfare: async (params) => {
      const response = await ask(withRole('prayer', WARFARE_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    generateDevotional: async (params) => {
      const response = await ask(DEVOTIONAL_PROMPTS.generate(params))
      return parseJSON(response)
    },
    generateConfessions: async (params) => {
      const response = await ask(withRole('prayer', CONFESSION_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    generateFasting: async (params) => {
      const response = await ask(withRole('prayer', FASTING_PROMPTS.generate(params)))
      return parseJSON(response)
    },
    reviewSermon: async (sermon, durationMinutes) => {
      const response = await ask(withRole('review', SERMON_REVIEW_PROMPT(sermon, durationMinutes)), 'longform')
      return parseJSON(response)
    },
    reviewFastingJourney: async (entry) => {
      const response = await ask(withRole('review', FASTING_END_REVIEW_PROMPT(entry)), 'longform')
      return parseJSON(response)
    },
    generateChurchFastingProgramme: async (params) => {
      const response = await ask(withRole('prayer', CHURCH_FASTING_PROGRAMME_PROMPT(params)), 'longform')
      return parseJSON(response)
    },
  }
}