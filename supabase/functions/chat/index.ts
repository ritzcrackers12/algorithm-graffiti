import { chatSystemPrompt, scriptedNext, type ChatTurn } from '../_shared/chatScript.ts'
import { emptyProfile, hydrateProfile, type VisitorProfile } from '../_shared/profile.ts'
import { isBlocked } from '../_shared/text.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

function fallback(history: ChatTurn[], profile: VisitorProfile) {
  const next = scriptedNext(history, profile)
  return { ok: true, bot: next.bot, chips: next.chips, topic: next.topic, source: 'scripted' }
}

function parseModelJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as { bot?: unknown; chips?: unknown; topic?: unknown }
    const bot = typeof raw.bot === 'string' ? raw.bot.trim() : ''
    const chips = Array.isArray(raw.chips) ? raw.chips.map((c) => String(c).toUpperCase()).filter(Boolean).slice(0, 4) : []
    const topic = typeof raw.topic === 'string' ? raw.topic : ''
    if (!bot) return null
    return { bot, chips: chips.length ? chips : ['YES', 'NO', 'UNSURE', 'SKIP'], topic }
  } catch {
    return null
  }
}

async function gemini(system: string, history: ChatTurn[], key: string, model: string) {
  const contents = history.slice(-10).map((t) => ({
    role: t.role === 'bot' ? 'model' : 'user',
    parts: [{ text: t.text }],
  }))
  contents.push({ role: 'user', parts: [{ text: 'Continue. Return JSON only.' }] })
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 240 },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  )
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return parseModelJson(text)
}

async function anthropic(system: string, history: ChatTurn[], key: string, model: string) {
  const messages = history.slice(-10).map((t) => ({
    role: t.role === 'bot' ? 'assistant' : 'user',
    content: t.text,
  }))
  if (!messages.length || messages[0].role !== 'user') {
    messages.unshift({ role: 'user', content: 'Start.' })
  }
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 240,
      system,
      messages,
    }),
    signal: AbortSignal.timeout(12_000),
  })
  const data = await res.json() as { content?: { text?: string }[] }
  const text = data.content?.map((c) => c.text ?? '').join('') ?? ''
  return parseModelJson(text)
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
  const lastUser = [...history].reverse().find((t) => t.role === 'user')
  if (lastUser && isBlocked(lastUser.text)) {
    return json({ ok: true, bot: 'Try that another way.', chips: ['OK', 'NEVER MIND', 'SOMETHING ELSE', 'SKIP'], topic: 'blocked', source: 'scripted' })
  }
  const provider = (Deno.env.get('CHAT_PROVIDER') || 'scripted').toLowerCase()
  const key = Deno.env.get('CHAT_API_KEY') || ''
  const model = Deno.env.get('CHAT_MODEL') || (provider === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.0-flash-lite')
  if (!key || provider === 'scripted') return json(fallback(history, profile))
  try {
    const system = chatSystemPrompt(profile)
    const parsed = provider === 'anthropic'
      ? await anthropic(system, history, key, model)
      : await gemini(system, history, key, model)
    if (!parsed) return json(fallback(history, profile))
    return json({ ok: true, ...parsed, source: 'ai' })
  } catch (e) {
    console.error('chat llm failed', e)
    return json(fallback(history, profile))
  }
})
