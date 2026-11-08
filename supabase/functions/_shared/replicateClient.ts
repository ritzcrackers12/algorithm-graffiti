// Deno-only. Not copied from src/shared. All live AI goes through predict().
import { createClient } from 'npm:@supabase/supabase-js@2'
import { cacheKey, classifyProxyError, modelFor, previewOf, versionString, type AiJob } from './ai.ts'
import { CONFIG } from './config.ts'
import type { ProxyStatus, ReplicateMode } from './types.ts'

declare const Supabase: {
  ai: { Session: new (model: string) => { run(input: string, opts: Record<string, unknown>): Promise<number[]> } }
}

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

export interface PredictOpts {
  job: AiJob
  input: Record<string, unknown>
  fieldToConvertBase64ToURL?: string
  fileFormat?: string
  skipCache?: boolean
  /** Admin tests still hit the wrapper even if the last call expired or hit the daily cap. */
  force?: boolean
  /** Override the default AI_TIMEOUT_SECONDS (e.g. music gen is slow). */
  timeoutSeconds?: number
}

export interface PredictResult {
  ok: boolean
  output: unknown
  source: 'cache' | 'proxy' | 'direct' | 'embed-local' | 'error'
  ms: number
  error?: string
  status: ProxyStatus
  preview: string
}

interface AiSettings {
  mode: ReplicateMode
  proxyToken: string | null
  proxyTokenUpdatedAt: string | null
  proxyStatus: ProxyStatus
}

async function settings(): Promise<AiSettings> {
  const { data } = await db.from('ag_state').select('replicate_mode, proxy_token, proxy_token_updated_at, proxy_status').eq('id', 1).maybeSingle()
  const row = data as Record<string, unknown> | null
  const mode = row?.replicate_mode === 'direct' ? 'direct' : 'proxy'
  return {
    mode,
    proxyToken: typeof row?.proxy_token === 'string' && row.proxy_token ? row.proxy_token : (Deno.env.get('REPLICATE_PROXY_TOKEN') ?? null),
    proxyTokenUpdatedAt: typeof row?.proxy_token_updated_at === 'string' ? row.proxy_token_updated_at : null,
    proxyStatus: (row?.proxy_status as ProxyStatus) || 'unknown',
  }
}

async function setStatus(status: ProxyStatus) {
  await db.from('ag_state').update({ proxy_status: status, updated_at: new Date().toISOString() }).eq('id', 1)
}

async function logRequest(job: string, ok: boolean, error: string | null, ms: number) {
  await db.from('ag_proxy_requests').insert({ job, ok, error, ms })
}

async function cached(key: string): Promise<unknown | null> {
  const { data } = await db.from('ag_ai_cache').select('output').eq('key', key).maybeSingle()
  return data ? (data as { output: unknown }).output : null
}

async function storeCache(key: string, job: string, input: unknown, output: unknown) {
  await db.from('ag_ai_cache').upsert({ key, job, input, output })
}

function extractOutput(pred: Record<string, unknown>): unknown {
  if ('output' in pred) return pred.output
  return pred
}

function outputText(output: unknown): string {
  if (typeof output === 'string') return output
  if (Array.isArray(output)) return output.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('')
  if (output && typeof output === 'object' && 'text' in output) return String((output as { text: unknown }).text)
  return JSON.stringify(output ?? '')
}

async function embedLocal(text: string): Promise<number[] | null> {
  try {
    const session = new Supabase.ai.Session('gte-small')
    const out = await session.run(text.slice(0, 4000), { mean_pool: true, normalize: true })
    return Array.isArray(out) ? out as number[] : null
  } catch (e) {
    console.error('gte-small failed', e)
    return null
  }
}

async function callProxy(token: string, job: AiJob, input: Record<string, unknown>, media?: { field: string; format: string }, deadline: number): Promise<{ pred: Record<string, unknown>; raw: string; status: number }> {
  const ident = versionString(job)
  const body: Record<string, unknown> = { ...ident, input }
  if (media) {
    body.fieldToConvertBase64ToURL = media.field
    body.fileFormat = media.format.startsWith('.') ? media.format : `.${media.format}`
  }
  const res = await fetch(CONFIG.PROXY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(Math.max(1000, deadline - Date.now())),
  })
  const raw = await res.text()
  let pred: Record<string, unknown> = {}
  try { pred = JSON.parse(raw) } catch { pred = { error: raw.slice(0, 400) } }
  return { pred, raw, status: res.status }
}

async function uploadDataUrl(dataUrl: string): Promise<string | null> {
  const m = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!m) return null
  const mime = m[1]
  const ext = mime.includes('png') ? 'png' : mime.includes('wav') ? 'wav' : mime.includes('mp3') ? 'mp3' : mime.includes('webp') ? 'webp' : 'jpg'
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0))
  const path = `${Date.now()}-${crypto.randomUUID()}.${ext}`
  const { error } = await db.storage.from('ai-temp').upload(path, bytes, { contentType: mime, upsert: true })
  if (error) {
    console.error('ai-temp upload failed', error)
    return null
  }
  const { data } = db.storage.from('ai-temp').getPublicUrl(path)
  return data.publicUrl
}

async function resolveDirectInput(input: Record<string, unknown>): Promise<Record<string, unknown>> {
  const out: Record<string, unknown> = { ...input }
  for (const [k, v] of Object.entries(out)) {
    if (typeof v === 'string' && v.startsWith('data:')) {
      const url = await uploadDataUrl(v)
      if (url) out[k] = url
    }
  }
  return out
}

async function callDirect(token: string, job: AiJob, input: Record<string, unknown>, deadline: number): Promise<{ pred: Record<string, unknown>; raw: string; status: number }> {
  const m = modelFor(job)
  const resolved = await resolveDirectInput(input)
  const url = m.version
    ? 'https://api.replicate.com/v1/predictions'
    : `https://api.replicate.com/v1/models/${m.model}/predictions`
  const payload = m.version ? { version: m.version, input: resolved } : { input: resolved }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'wait=25' }
  const signal = AbortSignal.timeout(Math.max(1000, deadline - Date.now()))
  let pred = await (await fetch(url, { method: 'POST', headers, signal, body: JSON.stringify(payload) })).json() as Record<string, unknown>
  const getUrl = pred?.urls && typeof pred.urls === 'object' ? (pred.urls as { get?: string }).get : null
  while ((pred?.status === 'starting' || pred?.status === 'processing') && getUrl) {
    if (Date.now() > deadline) throw new Error('timeout')
    await new Promise((r) => setTimeout(r, 1000))
    pred = await (await fetch(getUrl, { headers, signal })).json() as Record<string, unknown>
  }
  const raw = JSON.stringify(pred)
  const http = pred?.status === 'succeeded' ? 200 : 500
  return { pred, raw, status: http }
}

export async function predict(opts: PredictOpts): Promise<PredictResult> {
  const started = Date.now()
  const key = await cacheKey(opts.job, opts.input)
  if (!opts.skipCache) {
    const hit = await cached(key)
    if (hit != null) {
      return { ok: true, output: hit, source: 'cache', ms: Date.now() - started, status: 'ok', preview: previewOf(hit) }
    }
  }

  if (opts.job === 'embed') {
    const text = String(opts.input.text ?? opts.input.prompt ?? '')
    const local = await embedLocal(text)
    if (local) {
      await storeCache(key, 'embed', opts.input, local)
      return { ok: true, output: local, source: 'embed-local', ms: Date.now() - started, status: 'ok', preview: `vector[${local.length}]` }
    }
  }

  const s = await settings()
  if (!opts.force && s.mode === 'proxy' && (s.proxyStatus === 'expired' || s.proxyStatus === 'limit')) {
    return { ok: false, output: null, source: 'error', ms: Date.now() - started, error: s.proxyStatus, status: s.proxyStatus, preview: '' }
  }
  const { data: todayCount } = await db.rpc('ag_proxy_today', { p_tz: CONFIG.TIME_ZONE })
  if (!opts.force && s.mode === 'proxy' && typeof todayCount === 'number' && todayCount >= CONFIG.PROXY_QUOTA_CHEAP) {
    await setStatus('limit')
    return { ok: false, output: null, source: 'error', ms: Date.now() - started, error: 'daily limit', status: 'limit', preview: '' }
  }
  const deadline = Date.now() + (opts.timeoutSeconds ?? CONFIG.AI_TIMEOUT_SECONDS) * 1000
  const media = opts.fieldToConvertBase64ToURL && opts.fileFormat
    ? { field: opts.fieldToConvertBase64ToURL, format: opts.fileFormat }
    : undefined

  try {
    let pred: Record<string, unknown>
    let raw: string
    let status: number
    let source: PredictResult['source']
    if (s.mode === 'direct') {
      const token = Deno.env.get('REPLICATE_API_TOKEN') ?? ''
      if (!token) throw new Error('no REPLICATE_API_TOKEN')
      const out = await callDirect(token, opts.job, opts.input, deadline)
      pred = out.pred; raw = out.raw; status = out.status
      source = 'direct'
    } else {
      if (!s.proxyToken) throw new Error('no proxy token')
      const out = await callProxy(s.proxyToken, opts.job, opts.input, media, deadline)
      pred = out.pred; raw = out.raw; status = out.status
      source = 'proxy'
    }

    const classified = classifyProxyError(status, raw)
    if (status >= 400 || classified === 'expired' || classified === 'limit') {
      await setStatus(classified === 'unknown' ? 'unknown' : classified)
      await logRequest(opts.job, false, raw.slice(0, 300), Date.now() - started)
      return { ok: false, output: null, source: 'error', ms: Date.now() - started, error: raw.slice(0, 300), status: classified, preview: '' }
    }
    if (pred.status && pred.status !== 'succeeded' && pred.output == null) {
      await logRequest(opts.job, false, String(pred.error ?? pred.status), Date.now() - started)
      return { ok: false, output: null, source: 'error', ms: Date.now() - started, error: String(pred.error ?? pred.status), status: 'unknown', preview: '' }
    }

    const output = opts.job === 'text' ? outputText(extractOutput(pred)) : extractOutput(pred)
    await storeCache(key, opts.job, opts.input, output)
    await logRequest(opts.job, true, null, Date.now() - started)
    await setStatus('ok')
    return { ok: true, output, source, ms: Date.now() - started, status: 'ok', preview: previewOf(output) }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    const classified = classifyProxyError(0, msg)
    await logRequest(opts.job, false, msg, Date.now() - started)
    if (classified === 'expired' || classified === 'limit') await setStatus(classified)
    return { ok: false, output: null, source: 'error', ms: Date.now() - started, error: msg, status: classified, preview: '' }
  }
}

export async function hasLiveCredentials(): Promise<boolean> {
  const s = await settings()
  if (s.mode === 'direct') return !!(Deno.env.get('REPLICATE_API_TOKEN'))
  return !!s.proxyToken
}

export async function replicateAdminView() {
  const s = await settings()
  const { data } = await db.rpc('ag_proxy_today', { p_tz: CONFIG.TIME_ZONE })
  return {
    replicateMode: s.mode,
    proxyStatus: s.proxyStatus,
    proxyTokenLast4: s.proxyToken && s.proxyToken.length >= 4 ? s.proxyToken.slice(-4) : null,
    proxyTokenUpdatedAt: s.proxyTokenUpdatedAt ? new Date(s.proxyTokenUpdatedAt).getTime() : null,
    proxyToday: typeof data === 'number' ? data : 0,
    proxyQuota: CONFIG.PROXY_QUOTA_CHEAP,
  }
}
