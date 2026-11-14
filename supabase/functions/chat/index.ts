import {
  chatSystemPrompt, isYou, personaLabel, portraitSystemPrompt, scenarioCast, scenarioOf,
  scriptedNext, sessionReadout, type ChatTurn, type PersonaId,
} from '../_shared/chatScript.ts'
import { emptyProfile, hydrateProfile, type VisitorProfile } from '../_shared/profile.ts'
import { isBlocked } from '../_shared/text.ts'
import { predict } from '../_shared/replicateClient.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function fallback(history: ChatTurn[], profile: VisitorProfile) {
  const next = scriptedNext(history, profile)
  return {
    ok: true,
    messages: next.messages,
    bot: next.messages.at(-1)?.text ?? '',
    chips: [],
    topic: next.topic,
    source: 'scripted',
    done: next.done,
  }
}

/** Display name for a persona turn (jordan / dev / jules…), used in transcripts. */
function speakerOf(t: ChatTurn, profile: VisitorProfile): string {
  const scenario = scenarioOf(profile)
  const slot = (t.from && t.from !== 'you' ? t.from : scenarioCast(scenario)[0]) as PersonaId
  return personaLabel(scenario, slot, profile)
}

function transcript(history: ChatTurn[], profile: VisitorProfile) {
  if (!history.length) return '(no messages yet — you open the thread)'
  return history.map((t) => `${isYou(t) ? 'you' : speakerOf(t, profile)}: ${t.text}`).join('\n')
}

/** Role-based messages for chat APIs. Persona turns are prefixed with the
 *  speaker's name so the model knows who's who; consecutive same-role turns merge. */
function toMessages(history: ChatTurn[], profile: VisitorProfile) {
  const msgs: { role: 'user' | 'assistant'; content: string }[] = []
  for (const t of history) {
    const role: 'user' | 'assistant' = isYou(t) ? 'user' : 'assistant'
    const content = isYou(t) ? t.text : `${speakerOf(t, profile)}: ${t.text}`
    const last = msgs[msgs.length - 1]
    if (last && last.role === role) last.content += '\n' + content
    else msgs.push({ role, content })
  }
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(start the thread)' })
  if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '(your turn — reply)' })
  return msgs
}

/** Parse a plain-text model reply into persona messages. Lines may be prefixed
 *  with a sender name ("jordan: ...") for group chats; unknown/absent prefixes
 *  fall to the first cast member. Strips quotes/fences/narration. */
function parseReply(text: string, profile: VisitorProfile) {
  const scenario = scenarioOf(profile)
  const cast = scenarioCast(scenario)
  const nameToSlot: Record<string, PersonaId> = {}
  for (const slot of cast) nameToSlot[personaLabel(scenario, slot, profile).toLowerCase()] = slot

  const out: { from: PersonaId; text: string }[] = []
  for (const rawLine of String(text).split('\n')) {
    let line = rawLine.trim()
    if (!line || line.startsWith('```') || line.startsWith('{') || line.startsWith('}')) continue
    line = line.replace(/^["'“”]+|["'“”]+$/g, '').trim()
    if (!line) continue
    let slot: PersonaId = cast[0]
    const m = line.match(/^([A-Za-z][A-Za-z0-9_]{0,20})\s*:\s*(.+)$/)
    if (m) {
      const hit = nameToSlot[m[1].toLowerCase()]
      if (hit) slot = hit
      line = m[2].trim() // drop the speaker prefix either way
    }
    line = line.replace(/^["'“”]+|["'“”]+$/g, '').trim()
    if (line) out.push({ from: slot, text: line })
    if (out.length >= 3) break
  }
  if (!out.length) return null
  return { messages: out, bot: out.at(-1)!.text, chips: [] as string[], topic: scenario, done: false }
}

type PortraitLine = { k: string; v: string }
type PortraitBlock = { title: string; lines: PortraitLine[] }

function parseLines(rows: unknown): PortraitLine[] {
  const out: PortraitLine[] = []
  if (!Array.isArray(rows)) return out
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    const k = String((row as { k?: unknown }).k ?? '').trim()
    const v = String((row as { v?: unknown }).v ?? '').trim()
    if (k && v) out.push({ k: k.toUpperCase(), v })
  }
  return out
}

function parsePortrait(text: string): PortraitBlock[] | null {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as { sections?: unknown; portrait?: unknown }
    if (Array.isArray(raw.sections)) {
      const blocks: PortraitBlock[] = []
      for (const sec of raw.sections) {
        if (!sec || typeof sec !== 'object') continue
        const title = String((sec as { title?: unknown }).title ?? '').trim().toUpperCase()
        const lines = parseLines((sec as { lines?: unknown }).lines)
        if (title && lines.length) blocks.push({ title, lines })
      }
      return blocks.length ? blocks : null
    }
    const flat = parseLines(raw.portrait)
    return flat.length ? [{ title: '', lines: flat }] : null
  } catch {
    return null
  }
}

// End-of-visit synthesis: always on the Replicate chat model (independent of
// CHAT_PROVIDER) so the portrait is model-written whenever Replicate works.
async function synthesizePortrait(profile: VisitorProfile) {
  const prompt = portraitSystemPrompt() +
    '\n\nSIGNALS\n' + sessionReadout(profile) +
    '\n\nCHAT\n' + transcript(profile.session?.chat?.turns ?? [], profile) +
    '\n\nWrite the portrait as JSON only.'
  const pred = await predict({ job: 'chat', timeoutSeconds: 30, input: { prompt, max_tokens: 900, temperature: 0.95 } })
  if (!pred.ok) return null
  return parsePortrait(String(pred.output ?? ''))
}

async function gemini(system: string, history: ChatTurn[], profile: VisitorProfile, key: string, model: string) {
  const contents = toMessages(history, profile).map((m) => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }))
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.9, maxOutputTokens: 300 },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  )
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return parseReply(text, profile)
}

// Replicate text model (Llama) + REPLICATE_API_TOKEN already set for Station/Article.
async function replicateLlama(system: string, history: ChatTurn[], profile: VisitorProfile) {
  const prompt = `${system}\n\nTRANSCRIPT\n${transcript(history, profile)}\n\nWrite the next message(s) now, in character, reacting to their last message. No preamble, no JSON.`
  const pred = await predict({ job: 'chat', timeoutSeconds: 25, input: { prompt, max_tokens: 300, temperature: 0.9 } })
  if (!pred.ok) return null
  return parseReply(String(pred.output ?? ''), profile)
}

async function anthropic(system: string, history: ChatTurn[], profile: VisitorProfile, key: string, model: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({ model, max_tokens: 300, system, messages: toMessages(history, profile) }),
    signal: AbortSignal.timeout(15_000),
  })
  const data = await res.json() as { content?: { text?: string }[] }
  const text = data.content?.map((c) => c.text ?? '').join('') ?? ''
  return parseReply(text, profile)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false }, 405)
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ ok: false })
  }
  const history = Array.isArray(body.history) ? body.history as ChatTurn[] : []
  const profile = hydrateProfile(body.profile ?? emptyProfile())

  if (body.mode === 'portrait') {
    try {
      const portrait = await synthesizePortrait(profile)
      if (portrait) return json({ ok: true, portrait, source: 'ai' })
    } catch (e) {
      console.error('portrait synth failed', e)
    }
    return json({ ok: true, portrait: null, source: 'fallback' })
  }

  const lastUser = [...history].reverse().find(isYou)
  if (lastUser && isBlocked(lastUser.text)) {
    const scenario = scenarioOf(profile)
    const slot = scenarioCast(scenario)[0]
    return json({
      ok: true,
      messages: [{ from: slot, text: 'wait what 😭 say that again but like… normal' }],
      bot: 'wait what 😭 say that again but like… normal',
      chips: [],
      topic: 'blocked',
      source: 'scripted',
    })
  }

  const key = Deno.env.get('CHAT_API_KEY') || ''
  const provider = (Deno.env.get('CHAT_PROVIDER') || (key ? 'gemini' : 'replicate')).toLowerCase()
  const model = Deno.env.get('CHAT_MODEL') || (provider === 'anthropic' ? 'claude-haiku-5-5' : 'gemini-2.0-flash-lite')
  const system = chatSystemPrompt(profile)

  // Replicate/Llama uses REPLICATE_API_TOKEN (no CHAT_API_KEY needed).
  if (provider === 'replicate' || provider === 'llama') {
    try {
      const parsed = await replicateLlama(system, history, profile)
      return json(parsed ? { ok: true, ...parsed, source: 'ai' } : fallback(history, profile))
    } catch (e) {
      console.error('chat llama failed', e)
      return json(fallback(history, profile))
    }
  }

  if (!key || provider === 'scripted') return json(fallback(history, profile))
  try {
    const parsed = provider === 'anthropic'
      ? await anthropic(system, history, profile, key, model)
      : await gemini(system, history, profile, key, model)
    return json(parsed ? { ok: true, ...parsed, source: 'ai' } : fallback(history, profile))
  } catch (e) {
    console.error('chat llm failed', e)
    return json(fallback(history, profile))
  }
})
