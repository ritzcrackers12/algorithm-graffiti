import {
  fallbackAssistant, fallbackFact, fallbackOptions,
  searchAssistantPrompt, searchFactPrompt, searchOptionsPrompt,
} from '../_shared/search.ts'
import { emptyProfile, hydrateProfile, type SearchFact, type SearchTurn, type VisitorProfile } from '../_shared/profile.ts'
import { isBlocked } from '../_shared/text.ts'
import { predict } from '../_shared/replicateClient.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

async function run(prompt: string, max: number, temp: number): Promise<string | null> {
  const pred = await predict({ job: 'chat', timeoutSeconds: 25, input: { prompt, max_tokens: max, temperature: temp } })
  return pred.ok ? String(pred.output ?? '') : null
}

function parseOptions(text: string): string[] {
  const lines = text.split('\n')
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*•])\s*/, '').replace(/^["'“”]+|["'“”]+$/g, '').trim().toLowerCase())
    .filter((l) => l.length >= 6 && l.length <= 90 && !l.startsWith('round') && !/^(here|sure|options?)\b/.test(l))
  const seen = new Set<string>()
  const out: string[] = []
  for (const l of lines) {
    if (seen.has(l)) continue
    seen.add(l)
    out.push(l)
    if (out.length >= 4) break
  }
  return out
}

function parseFact(text: string, query: string): SearchFact | null {
  const tm = text.match(/TITLE:\s*(.+)/i)
  let title = tm ? tm[1].trim() : ''
  let body = tm ? text.slice(text.indexOf(tm[0]) + tm[0].length).trim() : text.trim()
  body = body.replace(/^BODY:\s*/i, '').replace(/^["'“”]+|["'“”]+$/g, '').trim()
  title = title.replace(/^["'“”]+|["'“”]+$/g, '').trim()
  if (!title) {
    // first line as title, rest as body
    const lines = body.split('\n').map((l) => l.trim()).filter(Boolean)
    title = (lines.shift() ?? '').slice(0, 80)
    body = lines.join(' ')
  }
  if (!title || !body) return null
  return { q: query, title, body }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false }, 405)
  let body: Record<string, unknown>
  try { body = await req.json() } catch { return json({ ok: false }) }

  const kind = String(body.kind ?? '')
  const profile: VisitorProfile = hydrateProfile(body.profile ?? emptyProfile())
  const round = Number(body.round ?? profile.session?.search?.round ?? 0)

  try {
    if (kind === 'options') {
      const picks = Array.isArray(body.picks) ? (body.picks as string[]) : (profile.session?.search?.picks ?? [])
      const takeaways = Array.isArray(body.takeaways) ? (body.takeaways as string[]) : (profile.session?.search?.takeaways ?? [])
      const text = await run(searchOptionsPrompt(profile, round, picks, takeaways), 220, 1.0)
      const options = text ? parseOptions(text) : []
      if (options.length >= 4) return json({ ok: true, options: options.slice(0, 4), source: 'ai' })
      return json({ ok: true, options: fallbackOptions(round), source: 'scripted' })
    }

    if (kind === 'fact') {
      const query = String(body.query ?? '').slice(0, 120)
      if (!query) return json({ ok: false })
      const text = await run(searchFactPrompt(profile, query), 320, 0.9)
      const fact = text ? parseFact(text, query) : null
      if (fact) return json({ ok: true, fact, source: 'ai' })
      return json({ ok: true, fact: fallbackFact(query, round), source: 'scripted' })
    }

    if (kind === 'assistant') {
      const question = String(body.question ?? '')
      if (isBlocked(question)) {
        return json({ ok: true, reply: 'let\'s keep it about the weird stuff — what else are you curious about here?', source: 'scripted' })
      }
      const fact = (body.fact ?? {}) as SearchFact
      const chat = Array.isArray(body.chat) ? (body.chat as SearchTurn[]) : []
      const text = await run(searchAssistantPrompt(profile, fact, chat), 160, 0.85)
      const reply = (text ?? '').split('\n').map((l) => l.trim()).filter(Boolean).join(' ').replace(/^["'“”]+|["'“”]+$/g, '').trim()
      if (reply) return json({ ok: true, reply, source: 'ai' })
      return json({ ok: true, reply: fallbackAssistant(), source: 'scripted' })
    }

    return json({ ok: false })
  } catch (e) {
    console.error('search failed', e)
    if (kind === 'options') return json({ ok: true, options: fallbackOptions(round), source: 'scripted' })
    if (kind === 'fact') return json({ ok: true, fact: fallbackFact(String(body.query ?? ''), round), source: 'scripted' })
    return json({ ok: true, reply: fallbackAssistant(), source: 'scripted' })
  }
})
