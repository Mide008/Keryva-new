// src/pages/AgentPage.jsx
import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '@/lib/AppContext'
import { useAI } from '@/lib/useAI'
import { useTranslation } from '@/hooks/useTranslation'
import { SERMON_PROMPTS, STUDY_GUIDE_PROMPTS, SUNDAY_PACK_PROMPTS, languageLabelFor } from '@/lib/aiServices'
import { verifyReference } from '@/services/bibleApi'
import { idbGet, idbSet } from '@/lib/idb'
import { tryConsume } from '@/lib/usageLimits'
import VerifiedBadge from '@/components/ui/VerifiedBadge'
import Icon3D from '@/components/ui/Icon3D'

function parseJSON(raw) {
  try { return JSON.parse((raw || '').replace(/```json|```/g, '').match(/\{[\s\S]*\}/)?.[0] || raw) }
  catch { return null }
}

// One fast Groq call decides what the user wants and with what parameters.
// Kept intentionally small and strict about output shape so a cheap/fast
// model can do it reliably — this is tool SELECTION, not tool EXECUTION.
function buildRouterPrompt(userText, history, currentDraft, vaultTitles) {
  const recent = history.slice(-6).map(m => `${m.role}: ${m.text}`).join('\n')
  const draftContext = currentDraft
    ? `\n\nCurrent draft in progress: a ${currentDraft.type} on "${currentDraft.topic}". If the newest message is an edit instruction about THIS draft (e.g. "make point 2 shorter", "make it more youth-friendly", "change the tone"), use action="edit_current" with args={ instruction: "<their exact request>" } rather than asking them to re-explain the topic.`
    : ''
  const vaultContext = vaultTitles?.length
    ? `\n\nUser's Knowledge Vault contains: ${vaultTitles.join(', ')}. If they ask to use/base something on one of these (e.g. "using our leadership manual"), add args.vaultRef set to the exact matching title.`
    : ''
  return `You are a routing classifier for a ministry assistant. Given the conversation so far and the newest user message, decide which single action fits best and extract its arguments. Return ONLY JSON, no extra text, in this exact shape:

{
  "action": "create_sermon" | "create_study_guide" | "create_sunday_pack" | "edit_current" | "search_scripture" | "verify_scripture" | "translate" | "multi_step_plan" | "clarify" | "chat",
  "args": { ...whatever fields the action needs, using the user's own words },
  "question": "a single short follow-up question — ONLY set this and use action=clarify if a required field is genuinely missing (e.g. sermon requested with no topic at all)",
  "reply": "a short natural reply — ONLY for action=chat (small talk, general questions not needing a tool)"
}

Field guide per action:
- create_sermon: { topic, scripture?, audience?, tone?, length? }
- create_study_guide: { topic, groupType?, length? }
- create_sunday_pack: { topic, date?, scripture?, church? }
- edit_current: { instruction }
- search_scripture: { topic }
- verify_scripture: { reference }
- translate: { text, targetLanguage }
- multi_step_plan: { steps: [{ action: "create_sermon"|"create_study_guide"|"create_sunday_pack"|"search_scripture", args: {...} }, ...], summary: "one short sentence describing the overall plan" }

Use multi_step_plan ONLY when the request clearly asks for more than one deliverable in one go (e.g. "prepare everything for Sunday's youth service on purpose" → sermon + study guide + Sunday Pack). Cap steps at 5 — if the request implies more, include only the first 5 and note the rest isn't included in the summary. For a single deliverable, use that action directly, not multi_step_plan.

Prefer acting over asking — only use "clarify" when there is truly not enough to proceed (e.g. "build me a sermon" with zero topic given anywhere in the conversation). Do not ask about optional fields.${draftContext}${vaultContext}

Conversation so far:
${recent}

Newest user message: "${userText}"

Return ONLY the JSON object.`
}

const ACTION_LABELS = {
  create_sermon: 'Draft a sermon',
  create_study_guide: 'Build a study guide',
  create_sunday_pack: 'Build a Sunday Pack',
  search_scripture: 'Find scripture',
  verify_scripture: 'Verify a reference',
  translate: 'Translate',
}

export default function AgentPage() {
  const { t } = useTranslation()
  const { user, showToast, confirmAction, saveSermon, saveStudyGuide, saveSundayPack, setActivePage, setPendingVerse, setPendingChapter, vaultItems } = useApp()
  const { ask, error } = useAI()
  const [messages, setMessages] = useState([
    { role: 'assistant', text: t('agentIntro') },
  ])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [listening, setListening] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [resumeOffer, setResumeOffer] = useState(null) // saved memory, offered but not yet restored
  const scrollRef = useRef(null)
  const recognitionRef = useRef(null)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const lastArtifactRef = useRef(null) // { type, args, data } of the most recently generated draft

  const SpeechRecognitionAPI = typeof window !== 'undefined' ? (window.SpeechRecognition || window.webkitSpeechRecognition) : null
  const hasNativeSpeech = !!SpeechRecognitionAPI
  const hasMicFallback = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof window !== 'undefined' && !!window.MediaRecorder
  const voiceSupported = hasNativeSpeech || hasMicFallback

  const toggleListening = async () => {
    if (listening) {
      if (hasNativeSpeech) recognitionRef.current?.stop()
      else mediaRecorderRef.current?.stop()
      return
    }
    if (hasNativeSpeech) {
      const recognition = new SpeechRecognitionAPI()
      recognition.lang = 'en-US'
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      recognition.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript
        if (transcript) setInput(prev => (prev ? prev + ' ' : '') + transcript)
      }
      recognition.onerror = () => setListening(false)
      recognition.onend = () => setListening(false)
      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
      return
    }
    // Fallback: record audio and transcribe server-side via Groq Whisper —
    // covers Firefox (native API disabled by default) and Safari-as-PWA
    // (blocks the native API entirely once installed to home screen).
    if (!hasMicFallback) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream)
      audioChunksRef.current = []
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data)
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop())
        setListening(false)
        setTranscribing(true)
        try {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
          const res = await fetch('/api/transcribe', { method: 'POST', headers: { 'Content-Type': 'audio/webm' }, body: blob })
          const data = await res.json()
          if (data.text) setInput(prev => (prev ? prev + ' ' : '') + data.text)
          else showToast('Could not transcribe that — please try again or type instead', '⚠️')
        } catch {
          showToast('Voice transcription unavailable right now — please type instead', '⚠️')
        }
        setTranscribing(false)
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setListening(true)
    } catch {
      showToast('Microphone access was denied — please type instead', '⚠️')
    }
  }

  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }) }, [messages])

  useEffect(() => {
    (async () => {
      const saved = await idbGet('agent_working_memory')
      if (saved?.value?.lastArtifact && saved.value.messages?.length > 1) {
        const ageMs = Date.now() - new Date(saved.value.lastUpdatedAt || 0).getTime()
        if (ageMs < 30 * 24 * 60 * 60 * 1000) setResumeOffer(saved.value) // only offer if updated within 30 days
      }
    })()
  }, [])

  useEffect(() => {
    if (messages.length <= 1) return // don't persist the empty default intro
    idbSet('agent_working_memory', {
      messages: messages.slice(-20), // cap what's persisted — this is working memory, not a full transcript archive
      lastArtifact: lastArtifactRef.current,
      lastUpdatedAt: new Date().toISOString(),
    }).catch(() => {})
  }, [messages])

  const resumeDraft = () => {
    if (!resumeOffer) return
    setMessages(resumeOffer.messages)
    lastArtifactRef.current = resumeOffer.lastArtifact
    setResumeOffer(null)
  }
  const dismissResume = () => setResumeOffer(null)

  const pushMessage = (msg) => setMessages(prev => [...prev, msg])

  const handleSend = async (e) => {
    e?.preventDefault()
    const text = input.trim()
    if (!text || busy) return
    setInput('')
    pushMessage({ role: 'user', text })
    setBusy(true)

    try {
      const routerRaw = await ask(buildRouterPrompt(text, messages, lastArtifactRef.current, vaultItems.map(v => v.title)), 'fast')
      if (!routerRaw) {
        pushMessage({ role: 'assistant', text: error || t('agentCouldNotProcess') })
        setBusy(false)
        return
      }
      const routed = parseJSON(routerRaw) || { action: 'chat', reply: routerRaw }

      if (routed.action === 'clarify') {
        pushMessage({ role: 'assistant', text: routed.question || t('agentClarifyDefault') })
        setBusy(false)
        return
      }
      if (routed.action === 'chat') {
        pushMessage({ role: 'assistant', text: routed.reply || t('agentChatDefault') })
        setBusy(false)
        return
      }
      if (routed.action === 'multi_step_plan') {
        const steps = (routed.args?.steps || []).slice(0, 5)
        if (!steps.length) {
          pushMessage({ role: 'assistant', text: "I couldn't break that into clear steps — could you describe each part you need separately?" })
          setBusy(false)
          return
        }
        pushMessage({ role: 'assistant', text: `📋 Plan: ${routed.args.summary || `${steps.length} steps`}` })
        for (let i = 0; i < steps.length; i++) {
          pushMessage({ role: 'assistant', text: `Step ${i + 1} of ${steps.length}…` })
          await executeAction(steps[i].action, steps[i].args || {})
        }
        pushMessage({ role: 'assistant', text: `✅ That's the full plan — review each draft above and save whichever you'd like to keep. Nothing has been saved yet.` })
        setBusy(false)
        return
      }

      await executeAction(routed.action, routed.args || {})
    } catch (err) {
      console.warn('Agent error:', err)
      pushMessage({ role: 'assistant', text: t('agentSomethingWrong') })
    }
    setBusy(false)
  }

  const executeAction = async (action, args) => {
    const langLabel = languageLabelFor(user.language)

    if (action === 'verify_scripture') {
      pushMessage({ role: 'assistant', text: `${t('agentCheckingRef')} ${args.reference}…`, pending: true })
      const result = await verifyReference(args.reference, user.translation || 'KJV')
      setMessages(prev => prev.filter(m => !m.pending))
      pushMessage({ role: 'assistant', kind: 'verse-check', data: { reference: args.reference, ...result } })
      return
    }

    if (action === 'search_scripture') {
      const gate = tryConsume('inspire')
      if (!gate.allowed) { pushMessage({ role: 'assistant', text: t('agentSearchLimitReached') }); return }
      pushMessage({ role: 'assistant', text: `${t('agentLookingScripture')} "${args.topic}"…`, pending: true })
      const raw = await ask(`Suggest 4-6 Bible verses relevant to: "${args.topic}". Return ONLY JSON: {"verses":[{"reference":"...","reason":"..."}]}. Respond in ${langLabel}.`, 'longform')
      setMessages(prev => prev.filter(m => !m.pending))
      const parsed = parseJSON(raw)
      if (!parsed?.verses?.length) { pushMessage({ role: 'assistant', text: t('agentCouldNotFindScripture') }); return }
      const verified = await Promise.all(parsed.verses.map(async v => {
        const check = await verifyReference(v.reference, user.translation || 'KJV')
        return check.verified ? { reference: check.reference, text: check.text, reason: v.reason, verified: true } : { reference: v.reference, reason: v.reason, verified: false }
      }))
      pushMessage({ role: 'assistant', kind: 'verse-list', data: verified })
      return
    }

    if (action === 'translate') {
      pushMessage({ role: 'assistant', text: t('agentTranslating'), pending: true })
      const raw = await ask(`Translate the following ministry text into ${args.targetLanguage}, preserving pastoral tone. Return ONLY the translated text.\n\n${args.text}`, 'fast')
      setMessages(prev => prev.filter(m => !m.pending))
      pushMessage({ role: 'assistant', text: raw || t('agentCouldNotTranslate') })
      return
    }

    if (action === 'create_sermon') {
      if (!args.topic) { pushMessage({ role: 'assistant', text: t('agentWhatSermonTopic') }); return }
      const gate = tryConsume('sermon')
      if (!gate.allowed) { pushMessage({ role: 'assistant', text: t('agentSermonLimitReached') }); return }
      pushMessage({ role: 'assistant', text: `${t('agentDraftingSermon')} "${args.topic}"…`, pending: true })
      const vaultMatch = args.vaultRef ? vaultItems.find(v => v.title === args.vaultRef) : null
      const topicWithVault = vaultMatch
        ? `${args.topic}\n\n[Reference material the user provided — from their Knowledge Vault, titled "${vaultMatch.title}". This is the user's own material, NOT Scripture and not independently verified — draw on it for tone/content but do not present it as Bible text:]\n${vaultMatch.content}`
        : args.topic
      const raw = await ask(SERMON_PROMPTS.generate({ topic: topicWithVault, scripture: args.scripture || '', audience: args.audience || 'General congregation', tone: args.tone || 'Inspirational', length: args.length || '30-minute sermon', translation: user.translation || 'KJV', languageLabel: langLabel }), 'longform')
      setMessages(prev => prev.filter(m => !m.pending))
      const sermon = parseJSON(raw)
      if (!sermon) { pushMessage({ role: 'assistant', text: t('agentCouldNotBuildSermon') }); return }
      if (sermon.points) {
        sermon.points = await Promise.all(sermon.points.map(async p => {
          if (!p.scripture) return p
          const check = await verifyReference(p.scripture, user.translation || 'KJV')
          return { ...p, verified: check.verified }
        }))
      }
      pushMessage({ role: 'assistant', kind: 'sermon-draft', data: sermon })
      lastArtifactRef.current = { type: 'sermon', args: { ...args, translation: user.translation || 'KJV', languageLabel: langLabel }, data: sermon }
      return
    }

    if (action === 'create_study_guide') {
      if (!args.topic) { pushMessage({ role: 'assistant', text: t('agentWhatStudyTopic') }); return }
      const gate = tryConsume('studyGuide')
      if (!gate.allowed) { pushMessage({ role: 'assistant', text: t('agentStudyLimitReached') }); return }
      pushMessage({ role: 'assistant', text: `${t('agentBuildingStudyGuide')} "${args.topic}"…`, pending: true })
      const raw = await ask(STUDY_GUIDE_PROMPTS.generate({ topic: args.topic, groupType: args.groupType || 'Adults', length: args.length || '60 minutes', translation: user.translation || 'KJV', languageLabel: langLabel }), 'longform')
      setMessages(prev => prev.filter(m => !m.pending))
      const guide = parseJSON(raw)
      if (!guide) { pushMessage({ role: 'assistant', text: t('agentCouldNotBuildStudy') }); return }
      pushMessage({ role: 'assistant', kind: 'study-guide', data: guide })
      lastArtifactRef.current = { type: 'study guide', args: { ...args, translation: user.translation || 'KJV', languageLabel: langLabel }, data: guide }
      return
    }

    if (action === 'create_sunday_pack') {
      if (!args.topic) { pushMessage({ role: 'assistant', text: t('agentWhatSundayTopic') }); return }
      const gate = tryConsume('sundayPack')
      if (!gate.allowed) { pushMessage({ role: 'assistant', text: t('agentSundayLimitReached') }); return }
      const date = args.date || new Date().toISOString().split('T')[0]
      pushMessage({ role: 'assistant', text: `${t('agentBuildingSundayPack')} "${args.topic}"…`, pending: true })
      const raw = await ask(SUNDAY_PACK_PROMPTS.generate({ topic: args.topic, date, scripture: args.scripture || '', church: args.church || 'Our Church', languageLabel: langLabel }), 'longform')
      setMessages(prev => prev.filter(m => !m.pending))
      const pack = parseJSON(raw)
      if (!pack) { pushMessage({ role: 'assistant', text: t('agentCouldNotBuildSunday') }); return }
      pushMessage({ role: 'assistant', kind: 'sunday-pack', data: { ...pack, topic: args.topic, date, scripture: args.scripture, church: args.church || 'Our Church' } })
      lastArtifactRef.current = { type: 'Sunday Pack', args: { ...args, date }, data: pack }
      return
    }

    if (action === 'edit_current') {
      const current = lastArtifactRef.current
      if (!current) { pushMessage({ role: 'assistant', text: "I don't have a draft to edit yet — build a sermon, study guide, or Sunday Pack first, then ask me to adjust it." }); return }
      pushMessage({ role: 'assistant', text: `Updating your ${current.type}…`, pending: true })
      const editPrompt = `Here is a ${current.type} as JSON:
${JSON.stringify(current.data)}

Apply this edit request: "${args.instruction}"

Return ONLY the complete updated JSON in the exact same shape as the input — not just the changed part, the whole object with the edit applied. Respond in ${langLabel}.`
      const raw = await ask(editPrompt, 'longform')
      setMessages(prev => prev.filter(m => !m.pending))
      const updated = parseJSON(raw)
      if (!updated) { pushMessage({ role: 'assistant', text: "I couldn't apply that edit cleanly — want me to try again, or describe it differently?" }); return }
      const kindMap = { sermon: 'sermon-draft', 'study guide': 'study-guide', 'Sunday Pack': 'sunday-pack' }
      pushMessage({ role: 'assistant', kind: kindMap[current.type], data: updated })
      lastArtifactRef.current = { ...current, data: updated }
      return
    }
  }

  const handleSaveSermon = async (sermon) => {
    const ok = await confirmAction(t('agentSaveSermonConfirm'), { confirmLabel: t('save') })
    if (!ok) return
    saveSermon(sermon)
    showToast('Sermon saved', '🎙')
    pushMessage({ role: 'assistant', text: t('agentSermonSaved') })
    pushMessage({ role: 'assistant', kind: 'chain-suggest', data: { label: '📚 Turn this into a Study Guide', action: 'create_study_guide', args: { topic: sermon.title || sermon.theme || '', scripture: sermon.mainText || '' } } })
  }
  const handleSaveStudy = async (guide) => {
    const ok = await confirmAction(t('agentSaveStudyConfirm'), { confirmLabel: t('save') })
    if (!ok) return
    saveStudyGuide(guide)
    showToast('Study guide saved', '📚')
    pushMessage({ role: 'assistant', text: t('agentStudySaved') })
  }
  const handleSaveSunday = async (pack) => {
    const ok = await confirmAction(t('agentSaveSundayConfirm'), { confirmLabel: t('save') })
    if (!ok) return
    saveSundayPack(pack)
    showToast('Sunday Pack saved', '📋')
    pushMessage({ role: 'assistant', text: t('agentSundaySaved') })
  }

  return (
    <div className="agent-shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <Icon3D name="sparkle" tone="gold" active size={20} badgeSize={44} />
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 20, fontWeight: 500 }}>{t('agentTitle')}</h1>
          <p style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>{t('agentSubtitle')}</p>
        </div>
      </div>

      {resumeOffer && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', background: 'var(--gold-50)', border: '1px solid var(--border-gold)', borderRadius: 12, padding: '10px 14px', marginBottom: 14 }}>
          <span style={{ fontSize: 13, color: 'var(--gold-800)' }}>
            You still have a {resumeOffer.lastArtifact?.type} in progress on "{resumeOffer.lastArtifact?.args?.topic || resumeOffer.lastArtifact?.args?.instruction || 'your last session'}".
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={resumeDraft} className="btn btn-gold btn-sm">Continue it</button>
            <button onClick={dismissResume} className="btn btn-ghost btn-sm">Start fresh</button>
          </div>
        </div>
      )}

      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, paddingRight: 4 }}>
        {messages.map((m, i) => (
          <MessageBubble key={i} m={m} onSaveSermon={handleSaveSermon} onSaveStudy={handleSaveStudy} onSaveSunday={handleSaveSunday}
            onChainAction={(action, args) => executeAction(action, args)}
            onAddToSermon={(ref, text) => { setPendingVerse({ ref, translation: user.translation || 'KJV', text }); setActivePage('sermon') }}
            onAddToPrayer={(ref, text) => { setPendingVerse({ ref, translation: user.translation || 'KJV', text }); setActivePage('prayer') }}
            onGoToBible={(ref) => {
              const m2 = ref?.match(/^(.+?)\s+(\d+):(\d+)/)
              if (!m2) { showToast('Could not open this reference', '⚠️'); return }
              setPendingChapter({ bookName: m2[1].trim(), chapter: parseInt(m2[2],10), verse: parseInt(m2[3],10), translation: user.translation || 'KJV' })
              setActivePage('bible')
            }}
          />
        ))}
        {busy && (
          <div style={{ display: 'flex', gap: 6, padding: '10px 14px' }}>
            <div className="loading-dots"><div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" /></div>
          </div>
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', gap: 8, marginTop: 14, position: 'relative' }}>
        <input
          className="input-search"
          placeholder={t('agentPlaceholder')}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={busy}
          style={{ flex: 1 }}
        />
        {voiceSupported && (
          <button type="button" onClick={toggleListening} className="btn btn-outline" disabled={busy || transcribing}
            style={{ color: listening ? 'var(--terra-500)' : undefined, borderColor: listening ? 'var(--terra-400)' : undefined }}
            title={listening ? 'Stop listening' : transcribing ? 'Transcribing…' : 'Speak instead of typing'}>
            {transcribing ? <span className="loading-dots"><span className="loading-dot"/><span className="loading-dot"/><span className="loading-dot"/></span> : listening ? '⏺' : '🎙'}
          </button>
        )}
        <button type="submit" className="btn btn-primary" disabled={busy || !input.trim()}>{t('agentSend')}</button>
      </form>
    </div>
  )
}

function MessageBubble({ m, onSaveSermon, onSaveStudy, onSaveSunday, onAddToSermon, onAddToPrayer, onGoToBible, onChainAction }) {
  const isUser = m.role === 'user'
  const bubbleStyle = {
    maxWidth: '88%', alignSelf: isUser ? 'flex-end' : 'flex-start',
    background: isUser ? 'var(--ink-900)' : 'var(--bg-card)',
    color: isUser ? 'var(--text-inverse)' : 'var(--text-primary)',
    border: isUser ? 'none' : '1px solid var(--border-subtle)',
    borderRadius: 16, padding: '12px 16px', fontSize: 14, lineHeight: 1.6,
  }

  if (m.kind === 'chain-suggest') {
    return (
      <button onClick={() => onChainAction(m.data.action, m.data.args)} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>
        {m.data.label}
      </button>
    )
  }

  if (m.kind === 'verse-check') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...bubbleStyle, maxWidth: '92%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, flexWrap: 'wrap', gap: 6 }}>
          <span style={{ fontWeight: 600, cursor: m.data.verified ? 'pointer' : 'default', textDecoration: m.data.verified ? 'underline' : 'none', textDecorationColor: 'var(--border-gold)' }} onClick={() => m.data.verified && onGoToBible(m.data.reference)}>{m.data.reference}</span>
          <VerifiedBadge status={m.data.verified ? 'verified' : 'unverified'} />
        </div>
        {m.data.verified ? <p style={{ fontStyle: 'italic' }}>{m.data.text}</p> : <p style={{ color: 'var(--terra-500)', fontSize: 13 }}>{m.data.reason}</p>}
      </motion.div>
    )
  }

  if (m.kind === 'verse-list') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...bubbleStyle, maxWidth: '92%', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {m.data.map((v, i) => (
          <div key={i} style={{ borderBottom: i < m.data.length - 1 ? '1px solid var(--border-subtle)' : 'none', paddingBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontWeight: 600, fontSize: 13, cursor: v.verified ? 'pointer' : 'default', textDecoration: v.verified ? 'underline' : 'none', textDecorationColor: 'var(--border-gold)' }} onClick={() => v.verified && onGoToBible(v.reference)}>{v.reference}</span>
              <VerifiedBadge status={v.verified ? 'verified' : 'unverified'} />
            </div>
            {v.verified && <p style={{ fontStyle: 'italic', fontSize: 13.5 }}>{v.text}</p>}
            {v.reason && <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{v.reason}</p>}
            <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
              {v.verified && <button onClick={() => onGoToBible(v.reference)} className="btn btn-outline btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>📍 Bible</button>}
              <button onClick={() => onAddToSermon(v.reference, v.text || '')} className="btn btn-outline btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>🎙 Sermon</button>
              <button onClick={() => onAddToPrayer(v.reference, v.text || '')} className="btn btn-outline btn-sm" style={{ fontSize: 11.5, padding: '4px 10px' }}>🙏 Prayer</button>
            </div>
          </div>
        ))}
      </motion.div>
    )
  }

  if (m.kind === 'sermon-draft') {
    const s = m.data
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...bubbleStyle, maxWidth: '92%' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{s.title}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{s.theme} · {s.mainText}</div>
        <p style={{ fontSize: 13, marginBottom: 8 }}>{s.introduction}</p>
        {(s.points || []).map((p, i) => (
          <div key={i} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, fontWeight: 600 }}>{p.title} {p.scripture && <VerifiedBadge status={p.verified ? 'verified' : 'unverified'} />}</div>
            <p style={{ fontSize: 13 }}>{p.content}</p>
            {p.scripture && <p style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--text-muted)' }}>{p.scripture}</p>}
          </div>
        ))}
        <button onClick={() => onSaveSermon(s)} className="btn btn-gold btn-sm" style={{ marginTop: 6 }}>🔖 Save to Sermon Studio</button>
      </motion.div>
    )
  }

  if (m.kind === 'study-guide') {
    const g = m.data
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...bubbleStyle, maxWidth: '92%' }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>🎯 {g.icebreaker}</div>
        <p style={{ fontSize: 13 }}>{g.mainScripture}</p>
        <p style={{ fontSize: 13, marginTop: 6 }}>{g.backgroundContext}</p>
        {(g.discussionQuestions || []).map((q, i) => <p key={i} style={{ fontSize: 13 }}>• {q}</p>)}
        <button onClick={() => onSaveStudy(g)} className="btn btn-gold btn-sm" style={{ marginTop: 8 }}>🔖 Save to Study Guides</button>
      </motion.div>
    )
  }

  if (m.kind === 'sunday-pack') {
    const p = m.data
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={{ ...bubbleStyle, maxWidth: '92%' }}>
        <p style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{p.bulletin}</p>
        {(p.prayerPoints || []).map((pt, i) => <p key={i} style={{ fontSize: 13 }}>🙏 {pt}</p>)}
        {p.whatsappMessage && <p style={{ fontSize: 12, background: 'var(--gold-50)', padding: 8, borderRadius: 8, marginTop: 6 }}>{p.whatsappMessage}</p>}
        <button onClick={() => onSaveSunday(p)} className="btn btn-gold btn-sm" style={{ marginTop: 8 }}>🔖 Save to Sunday Packs</button>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} style={bubbleStyle}>
      {m.text}
      {!isUser && typeof window !== 'undefined' && window.speechSynthesis && (
        <button onClick={() => speak(m.text)} style={{ display: 'block', marginTop: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--text-muted)', padding: 0 }} title="Listen">🔊 Listen</button>
      )}
    </motion.div>
  )
}

function speak(text) {
  if (!text || typeof window === 'undefined' || !window.speechSynthesis) return
  window.speechSynthesis.cancel() // stop anything already playing
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.95
  window.speechSynthesis.speak(utterance)
}
