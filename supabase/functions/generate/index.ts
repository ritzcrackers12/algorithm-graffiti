// Builds every AI prompt from fixed templates. The phone only sends an object id and control values.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { pickAd, personalizeAd, reservedAdIds, weaveSponsored } from '../_shared/ads.ts'
import { CONFIG } from '../_shared/config.ts'
import { deriveGenre, genreMeta, musicPrompt, stationLegitimacy, type GenreId } from '../_shared/station.ts'
import type { ArticleParams, ReelParams } from '../_shared/types.ts'
import {
  AFFINITY_KEY, addRating, attachPrefetch, emptyReelResult, logRound, parseAffinity,
  pickNext, pickStart, playableUrl, rowFromRecord, sessionLine,
  type ReelResult, type ReelRow,
} from '../_shared/reel.ts'
import {
  articlePrompt, canonicalArticleParams, inventedNumbers, mockArticle, parseArticleMarkdown, parseArticleOutput, tooShort, validateArticleParams,
} from '../_shared/article.ts'
import { resolveLocation } from '../_shared/locations.ts'
import { emptyProfile, inferProfile, type VisitorProfile } from '../_shared/profile.ts'
import { cacheKey } from '../_shared/ai.ts'
import { predict } from '../_shared/replicateClient.ts'
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

function attachSponsored(body: string, profile: VisitorProfile, rounds?: { rating?: string | null; audience?: string; topic?: string; subtopic?: string; mood?: string; vibe?: string; keywords?: string }[]) {
  const match = pickAd({ ...profile, adsShown: reservedAdIds(profile) }, undefined, rounds)
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

async function produce(params: ArticleParams, profile: VisitorProfile, useAi: boolean) {
  const original = parseArticleMarkdown(await fetchSite(`content/articles/${params.articleId}.md`))
  const loc = resolveLocation(params.location)
  const logged = canonicalArticleParams(params)
  const fallback = () => {
    const mock = mockArticle(params, original, loc)
    const extra = attachSponsored(mock.body, profile)
    return { params: logged, title: mock.title, body: extra.body, sponsored: extra.sponsored }
  }
  if (!useAi) return { result: fallback(), ai: false }

  const { system, prompt } = articlePrompt(params, original, loc)
  const rewriteKey = await cacheKey('article', logged)
  const { data: cached } = await db.from('ag_ai_cache').select('output').eq('key', rewriteKey).maybeSingle()
  if (cached?.output && typeof cached.output === 'object') {
    const hit = cached.output as { title?: string; body?: string }
    if (hit.title && hit.body) {
      const extra = attachSponsored(hit.body, profile)
      return { result: { params: logged, title: hit.title, body: extra.body, sponsored: extra.sponsored }, ai: true, cached: true }
    }
  }

  try {
    const pred = await predict({
      job: 'text',
      input: { prompt, system_prompt: system, max_tokens: 4096, temperature: 0.7 },
    })
    if (!pred.ok) {
      console.error('article AI failed', pred.error, pred.status)
      return { result: fallback(), ai: false, failed: true }
    }
    const out = parseArticleOutput(String(pred.output ?? ''))
    const sourceText = `${original.title}\n${original.body}`
    if (
      out &&
      !inventedNumbers(sourceText, `${out.title}\n${out.body}`) &&
      !tooShort(original.body, out.body)
    ) {
      await db.from('ag_ai_cache').upsert({ key: rewriteKey, job: 'article', input: logged, output: { title: out.title, body: out.body } })
      const extra = attachSponsored(out.body, profile)
      return { result: { params: logged, title: out.title, body: extra.body, sponsored: extra.sponsored }, ai: true }
    }
    console.error('article: unusable model output, invented numbers, or too short')
  } catch (e) {
    console.error('article AI failed', e)
  }
  return { result: fallback(), ai: false, failed: true }
}

async function loadLibrary(): Promise<ReelRow[]> {
  const { data, error } = await db.from('ag_reels').select('*')
  if (!error && data?.length) {
    return data.map((r) => rowFromRecord(r as Record<string, unknown>)).filter((r) => r.id)
  }
  if (error) console.error(error)
  try {
    const text = await fetchSite('content/reels.json')
    const rows = JSON.parse(text) as Record<string, unknown>[]
    return rows.map((r) => rowFromRecord(r)).filter((r) => r.id)
  } catch (e) {
    console.error('reels.json fallback failed', e)
    return []
  }
}

async function loadAffinity() {
  const { data } = await db.from('ag_ai_cache').select('output').eq('key', AFFINITY_KEY).maybeSingle()
  return parseAffinity(data?.output)
}

async function saveAffinity(affinity: ReturnType<typeof parseAffinity>) {
  await db.from('ag_ai_cache').upsert({ key: AFFINITY_KEY, job: 'reel', input: {}, output: affinity })
}

async function produceReel(params: ReelParams, useAi: boolean, profile?: VisitorProfile): Promise<{ result: ReelResult }> {
  const library = await loadLibrary()
  const { data: state } = await db.from('ag_state').select('altered').eq('id', 1).maybeSingle()
  const prev = ((state?.altered as { reel?: ReelResult } | null)?.reel) ?? emptyReelResult()
  const source = useAi ? 'ai' : 'mock'

  if (params.action === 'start') {
    if (prev.phase === 'done') return { result: prev }
    if (prev.currentId && (prev.phase === 'playing' || prev.phase === 'rate')) return { result: prev }
    const pick = pickStart(library, await loadAffinity(), params.seed || Date.now())
    if (!pick) {
      return {
        result: {
          ...emptyReelResult(), phase: 'done', sessionLine: 'NO LIBRARY.',
          at: Date.now(), source: 'fallback',
        },
      }
    }
    const affinity = await loadAffinity()
    return {
      result: attachPrefetch({
        word: '', phase: 'playing', currentId: pick.id, videoUrl: playableUrl(pick.id),
        rounds: [logRound(pick, null, 0)], usedIds: [pick.id], sessionLine: '',
        source, at: Date.now(), prefetchId: null,
      }, library, affinity, profile),
    }
  }

  const rating = params.rating
  if (!rating || !prev.currentId) return { result: { ...prev, at: Date.now() } }
  const current = library.find((r) => r.id === prev.currentId)
  const rounds = prev.rounds.map((r, i) =>
    i === prev.rounds.length - 1 ? { ...r, rating, hesitationMs: params.hesitationMs ?? 0 } : r,
  )
  if (!current) {
    return { result: { ...prev, rounds, phase: 'done', sessionLine: sessionLine(rounds), at: Date.now() } }
  }
  const last = rounds[rounds.length - 1]
  let affinity = await loadAffinity()
  if (last) {
    affinity = addRating(affinity, last, rating)
    await saveAffinity(affinity)
  }
  const next = pickNext(library, prev.usedIds, current, rating, rounds, affinity, current.embedding ?? null, !current.embedding, profile)
  if (!next) {
    return {
      result: {
        ...prev, rounds, currentId: null, videoUrl: null, phase: 'done',
        sessionLine: sessionLine(rounds), at: Date.now(), source, prefetchId: null,
      },
    }
  }
  const nextRounds = [...rounds, logRound(next, null, 0)]
  return {
    result: attachPrefetch({
      ...prev,
      rounds: nextRounds,
      usedIds: [...prev.usedIds, next.id],
      currentId: next.id,
      videoUrl: playableUrl(next.id),
      phase: 'playing',
      sessionLine: sessionLine(nextRounds),
      at: Date.now(),
      source,
      prefetchId: null,
    }, library, affinity, profile),
  }
}

function asMediaUrl(output: unknown): string | null {
  if (typeof output === 'string' && /^https?:\/\//.test(output)) return output
  if (Array.isArray(output)) {
    for (const x of output) {
      const u = asMediaUrl(x)
      if (u) return u
    }
  }
  if (output && typeof output === 'object') {
    const o = output as Record<string, unknown>
    for (const k of ['audio', 'url', 'image', 'output']) {
      if (typeof o[k] === 'string' && /^https?:\/\//.test(o[k] as string)) return o[k] as string
    }
  }
  return null
}

/** The "advertisement" object: a generated instrumental STATION (genre derived from the profile). */
async function produceStation(
  _genreIn: string,
  dials: [number, number, number],
  profile: VisitorProfile,
  useAi: boolean,
) {
  // Genre is DERIVED from the profile (master control); the phone only sends the 3 dials.
  const genre: GenreId = deriveGenre(profile)
  const g = genreMeta(genre)
  const legitimacy = stationLegitimacy(genre)
  const base = {
    brandId: genre,
    brandName: g.label,
    genre,
    genreLabel: g.label,
    dials,
    overlay: { wordmark: g.label, headline: '', cta: '' },
    legitimacy,
    matchedProfile: true,
    at: Date.now(),
  }
  if (!useAi) return { ...base, audioUrl: null as string | null, imageUrl: null as string | null, source: 'mock' as const }
  const pred = await predict({
    job: 'music',
    timeoutSeconds: 60,
    input: {
      prompt: musicPrompt(genre, dials),
      model_version: 'stereo-large',
      duration: 15,
      output_format: 'mp3',
      normalization_strategy: 'peak',
      temperature: 0.9,
      classifier_free_guidance: 5,
    },
  })
  const audioUrl = pred.ok ? asMediaUrl(pred.output) : null
  return {
    ...base,
    audioUrl,
    imageUrl: null as string | null,
    source: (audioUrl ? 'ai' : 'fallback') as const,
  }
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
  const object = body.object === 'article' || body.object === 'ad' ? body.object : null
  if (!session || !object) return json({ ok: false, reason: 'invalid' })

  let articleParams = null as ReturnType<typeof validateArticleParams>
  let adParams = null as { genre: string; dials: [number, number, number] } | null
  if (object === 'article') {
    articleParams = validateArticleParams(body.params)
    if (!articleParams) {
      const loc = body.params && typeof body.params === 'object'
        ? String((body.params as Record<string, unknown>).location ?? '')
        : ''
      return json({ ok: false, reason: loc && isBlocked(loc) ? 'blocked' : 'invalid' })
    }
  } else {
    const p = body.params && typeof body.params === 'object' ? body.params as Record<string, unknown> : {}
    const dials = Array.isArray(p.dials) ? p.dials.map((n) => Number(n)) : [50, 50, 50]
    adParams = {
      genre: typeof p.genre === 'string' ? p.genre : '',
      dials: [dials[0] ?? 50, dials[1] ?? 50, dials[2] ?? 50],
    }
  }
  const profile = articleParams
    ? asProfile(body.profile, articleParams)
    : inferProfile({ ...emptyProfile(), ...(body.profile && typeof body.profile === 'object' ? body.profile as VisitorProfile : {}) })

  const [lo, hi] = CONFIG.MOCK_DELAY_SECONDS
  const mockDelay = object === 'ad' ? 0 : Math.round(lo + Math.random() * (hi - lo))
  const etaAi = CONFIG.EXPECTED_SECONDS[object] ?? 12
  const { data: begin, error } = await db.rpc('ag_begin_generation', {
    p_session: session, p_object: object, p_eta_ai: etaAi, p_eta_mock: mockDelay,
    p_rate: object === 'ad' ? 0 : CONFIG.RATE_LIMIT_SECONDS, p_cap: CONFIG.DAILY_GENERATION_CAP, p_tz: CONFIG.TIME_ZONE,
  })
  if (error) {
    console.error(error)
    return json({ ok: false, reason: 'error' })
  }
  if (!begin.ok) return json(begin)

  const useAi = !begin.mockMode && !begin.capReached

  const task = (async () => {
    const started = Date.now()
    let result: unknown = null
    let source = 'mock'
    try {
      if (object === 'article' && articleParams) {
        const out = await produce(articleParams, profile, useAi)
        result = { ...out.result, at: Date.now() }
        source = out.ai ? 'ai' : out.failed ? 'fallback' : begin.capReached && !begin.mockMode ? 'cap' : 'mock'
        ;(result as { source: string }).source = source
        if (!useAi) await sleep(Math.max(0, mockDelay * 1000 - (Date.now() - started)))
      } else if (object === 'ad' && adParams) {
        const out = await produceStation(adParams.genre, adParams.dials, profile, useAi)
        result = out
        source = out.source
        if (!useAi) await sleep(Math.max(0, mockDelay * 1000 - (Date.now() - started)))
      }
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
