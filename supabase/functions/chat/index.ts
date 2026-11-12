import { chatSystemPrompt, isPersona, isYou, scriptedNext, type ChatTurn, type PersonaId } from '../_shared/chatScript.ts'
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
    chips: next.chips,
    topic: next.topic,
    source: 'scripted',
    done: next.done,
  }
}

function parseModelJson(text: string) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    const raw = JSON.parse(text.slice(start, end + 1)) as {
      messages?: unknown
      bot?: unknown
      chips?: unknown
      topic?: unknown
      done?: unknown
    }
    const messages: { from: PersonaId; text: string }[] = []
    if (Array.isArray(raw.messages)) {
      for (const row of raw.messages) {
        if (!row || typeof row !== 'object') continue
        const from = String((row as { from?: unknown }).from || '')
        const line = typeof (row as { text?: unknown }).text === 'string' ? (row as { text: string }).text.trim() : ''
        if (isPersona(from) && line) messages.push({ from, text: line })
      }
    }
    if (!messages.length && typeof raw.bot === 'string' && raw.bot.trim()) {
      messages.push({ from: 'rik', text: raw.bot.trim() })
    }
    const chips = Array.isArray(raw.chips) ? raw.chips.map((c) => String(c).toUpperCase()).filter(Boolean).slice(0, 4) : []
    const topic = typeof raw.topic === 'string' ? raw.topic : ''
    if (!messages.length) return null
    return {
      messages,
      bot: messages.at(-1)?.text ?? '',
      chips: chips.length ? chips : ['YES', 'NO', 'UNSURE', 'SKIP'],
      topic,
      done: raw.done === true,
    }
  } catch {
    return null
  }
}

function transcript(history: ChatTurn[]) {
  if (!history.length) return '(empty)'
  return history.map((t) => `${isYou(t) ? 'you' : (t.from || 'jules')}: ${t.text}`).join('\n')
}

async function gemini(system: string, history: ChatTurn[], key: string, model: string) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: `TRANSCRIPT\n${transcript(history)}\n\nContinue as the group. JSON only.` }] }],
        generationConfig: { temperature: 0.85, maxOutputTokens: 420 },
      }),
      signal: AbortSignal.timeout(12_000),
    },
  )
  const data = await res.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return parseModelJson(text)
}

// Reuses the Replicate text model (Llama) + REPLICATE_API_TOKEN already set for
// the Station/Article, so the chatbot needs no separate API key.
async function replicateLlama(system: string, history: ChatTurn[]) {
  const prompt = `${system}\n\nTRANSCRIPT\n${transcript(history)}\n\nContinue as the group. Reply with JSON only, no preamble.`
  const pred = await predict({
    job: 'chat',
    timeoutSeconds: 25,
    input: { prompt, max_tokens: 500, temperature: 0.9 },
  })
  if (!pred.ok) return null
  return parseModelJson(String(pred.output ?? ''))
}

async function anthropic(system: string, history: ChatTurn[], key: string, model: string) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 420,
      system,
      messages: [{ role: 'user', content: `TRANSCRIPT\n${transcript(history)}\n\nContinue as the group. JSON only.` }],
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
  const lastUser = [...history].reverse().find(isYou)
  if (lastUser && isBlocked(lastUser.text)) {
    return json({
      ok: true,
      messages: [{ from: 'mina', text: 'wait what 😭 say that again but like… normal' }],
      bot: 'wait what 😭 say that again but like… normal',
      chips: ['OK', 'NEVER MIND', 'SOMETHING ELSE', 'SKIP'],
      topic: 'blocked',
      source: 'scripted',
    })
  }
  const key = Deno.env.get('CHAT_API_KEY') || ''
  const provider = (Deno.env.get('CHAT_PROVIDER') || (key ? 'gemini' : 'scripted')).toLowerCase()
  const model = Deno.env.get('CHAT_MODEL') || (provider === 'anthropic' ? 'claude-haiku-4-5' : 'gemini-2.0-flash-lite')

  // Replicate/Llama: uses REPLICATE_API_TOKEN (no CHAT_API_KEY needed). Any
  // model error or unparseable reply falls back to the scripted bank.
  if (provider === 'replicate' || provider === 'llama') {
    try {
      const parsed = await replicateLlama(chatSystemPrompt(profile), history)
      if (!parsed) return json(fallback(history, profile))
      return json({ ok: true, ...parsed, source: 'ai' })
    } catch (e) {
      console.error('chat llama failed', e)
      return json(fallback(history, profile))
    }
  }

  // No key → predetermined bank. Key present → custom LLM on that same flow map.
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
