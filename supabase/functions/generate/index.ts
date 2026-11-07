// Builds every AI prompt from fixed templates. The phone only sends an object id and control values.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { pickAd, personalizeAd, weaveSponsored } from '../_shared/ads.ts'
import { CONFIG } from '../_shared/config.ts'
import type { ArticleParams } from '../_shared/types.ts'
import {
  articlePrompt, canonicalArticleParams, inventedNumbers, mockArticle, parseArticleMarkdown, parseArticleOutput, tooShort, validateArticleParams,
} from '../_shared/article.ts'
import { resolveLocation } from '../_shared/locations.ts'
import { emptyProfile, inferProfile, type VisitorProfile } from '../_shared/profile.ts'
import { isBlocked } from '../_shared/text.ts'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const contentCache = new Map<string, { at: number; text: string }>()
async function fetchSite(path: string): Promise<string> {
  const hit = contentCache.get(path)
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.text
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(`${CONFIG.SITE_URL}/${path}?t=${Date.now()}`, { signal: AbortSignal.timeout(8000) })
      if (res.ok) {
        const text = await res.text()
        contentCache.set(path, { at: Date.now(), text })
        return text
      }
    } catch { /* retry */ }
  }
  if (hit) return hit.text
  throw new Error(`could not load ${path}`)
}

async function replicateText(system: string, prompt: string, token: string, deadline: number): Promise<string> {
  const m = CONFIG.TEXT_MODEL
  const url = m.version
    ? 'https://api.replicate.com/v1/predictions'
    : `https://api.replicate.com/v1/models/${m.owner}/${m.name}/predictions`
  const input = { prompt, system_prompt: system, max_tokens: 4096, temperature: 0.7 }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=25' }
  const signal = AbortSignal.timeout(Math.max(1000, deadline - Date.now()))
  let pred = await (await fetch(url, {
    method: 'POST', headers, signal, body: JSON.stringify(m.version ? { version: m.version, input } : { input }),
  })).json()
  while (pred?.status === 'starting' || pred?.status === 'processing') {
    if (Date.now() > deadline) throw new Error('timeout')
    await sleep(1000)
    pred = await (await fetch(pred.urls.get, { headers, signal })).json()
  }
  if (pred?.status !== 'succeeded') throw new Error(`replicate: ${pred?.status} ${pred?.error ?? pred?.detail ?? ''}`)
  return Array.isArray(pred.output) ? pred.output.join('') : String(pred.output)
}

function attachSponsored(body: string, profile: VisitorProfile) {
  const match = pickAd(profile)
  if (!match) return { body, sponsored: undefined }
  const sponsored = personalizeAd(match, profile)
  return { body: weaveSponsored(body, sponsored.paragraph), sponsored }
}

function asProfile(raw: unknown, params: ArticleParams): VisitorProfile {
  const base = emptyProfile()
  const incoming = raw && typeof raw === 'object' ? raw as VisitorProfile : base
  return inferProfile({
    ...base,
    ...incoming,
    article: {
      lean: params.lean,
      education: params.education,
      income: params.income,
      location: params.location,
      connotation: params.connotation,
      sensationalism: params.sensationalism,
    },
  })
}

async function produce(params: ArticleParams, profile: VisitorProfile, useAi: boolean, token: string) {
  const deadline = Date.now() + CONFIG.AI_TIMEOUT_SECONDS * 1000
  const original = parseArticleMarkdown(await fetchSite(`content/articles/${params.articleId}.md`))
  const loc = resolveLocation(params.location)
  const logged = canonicalArticleParams(params)
  const fallback = () => {
    const mock = mockArticle(params, original, loc)
    const extra = attachSponsored(mock.body, profile)
    return { params: logged, title: mock.title, body: extra.body, sponsored: extra.sponsored }
  }
  if (!useAi) return { result: fallback(), ai: false }
  try {
    const { system, prompt } = articlePrompt(params, original, loc)
    const out = parseArticleOutput(await replicateText(system, prompt, token, deadline))
    const sourceText = `${original.title}\n${original.body}`
    if (
      out &&
      !inventedNumbers(sourceText, `${out.title}\n${out.body}`) &&
      !tooShort(original.body, out.body)
    ) {
      const extra = attachSponsored(out.body, profile)
      return { result: { params: logged, title: out.title, body: extra.body, sponsored: extra.sponsored }, ai: true }
    }
    console.error('article: unusable model output, invented numbers, or too short')
  } catch (e) {
    console.error('article AI failed', e)
  }
  return { result: fallback(), ai: false, failed: true }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false, reason: 'invalid' }, 405)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ ok: false, reason: 'invalid' })
  }
  const session = typeof body.session === 'string' && /^[A-Za-z0-9_-]{8,64}$/.test(body.session) ? body.session : null
  const object = body.object === 'article' ? body.object : null
  if (!session || !object) return json({ ok: false, reason: 'invalid' })
  const params = validateArticleParams(body.params)
  if (!params) {
    const loc = body.params && typeof body.params === 'object'
      ? String((body.params as Record<string, unknown>).location ?? '')
      : ''
    return json({ ok: false, reason: loc && isBlocked(loc) ? 'blocked' : 'invalid' })
  }
  const profile = asProfile(body.profile, params)

  const [lo, hi] = CONFIG.MOCK_DELAY_SECONDS
  const mockDelay = Math.round(lo + Math.random() * (hi - lo))
  const { data: begin, error } = await db.rpc('ag_begin_generation', {
    p_session: session, p_object: object, p_eta_ai: CONFIG.EXPECTED_SECONDS[object] ?? 12, p_eta_mock: mockDelay,
    p_rate: CONFIG.RATE_LIMIT_SECONDS, p_cap: CONFIG.DAILY_GENERATION_CAP, p_tz: CONFIG.TIME_ZONE,
  })
  if (error) {
    console.error(error)
    return json({ ok: false, reason: 'error' })
  }
  if (!begin.ok) return json(begin)

  const token = Deno.env.get('REPLICATE_API_TOKEN') ?? ''
  const useAi = !begin.mockMode && !begin.capReached && !!token

  const task = (async () => {
    const started = Date.now()
    let result: unknown = null
    let source = 'mock'
    try {
      const out = await produce(params, profile, useAi, token)
      result = { ...out.result, at: Date.now() }
      source = out.ai ? 'ai' : out.failed ? 'fallback' : begin.capReached && !begin.mockMode ? 'cap' : 'mock'
      ;(result as { source: string }).source = source
      if (!useAi) await sleep(Math.max(0, mockDelay * 1000 - (Date.now() - started)))
    } catch (e) {
      console.error('generation failed', e)
      source = 'fallback'
    }
    const { error: finishError } = await db.rpc('ag_finish_generation', {
      p_id: begin.id, p_session: session, p_object: object, p_result: result, p_source: source,
      p_reset: CONFIG.RESET_MODE,
    })
    if (finishError) console.error(finishError)
  })()
  EdgeRuntime.waitUntil(task)
  return json({ ok: true })
})
