import { createClient } from 'npm:@supabase/supabase-js@2'
import { CONFIG } from '../_shared/config.ts'
import { maskToken } from '../_shared/ai.ts'
import { hasLiveCredentials, predict, replicateAdminView } from '../_shared/replicateClient.ts'
import type { AdminStatus, AiTestRow } from '../_shared/types.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const SQL_ACTIONS = ['status', 'reset', 'skip', 'clear_queue', 'mock_on', 'mock_off']
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

async function withAi(status: AdminStatus): Promise<AdminStatus> {
  try {
    const extra = await replicateAdminView()
    return { ...status, ...extra }
  } catch (e) {
    console.error('replicate admin view failed', e)
    return {
      ...status,
      replicateMode: CONFIG.REPLICATE_MODE,
      proxyStatus: 'unknown',
      proxyTokenLast4: null,
      proxyTokenUpdatedAt: null,
      proxyToday: 0,
      proxyQuota: CONFIG.PROXY_QUOTA_CHEAP,
    }
  }
}

async function runTests(all: boolean): Promise<{ rows: AiTestRow[]; used: number }> {
  const rows: AiTestRow[] = []
  let used = 0
  const add = (row: AiTestRow) => {
    rows.push(row)
    if (row.ok && (row.source === 'proxy' || row.source === 'direct')) used++
  }

  const embed = await predict({ job: 'embed', input: { text: 'hello station' }, skipCache: true, force: true })
  add({ job: 'embed', ok: embed.ok, ms: embed.ms, source: embed.source, preview: embed.preview, error: embed.error })

  const live = await hasLiveCredentials()
  if (!live) {
    add({ job: 'text', ok: true, skipped: true, ms: 0, source: 'skip', preview: 'no proxy/direct token yet' })
  } else {
    const text = await predict({
      job: 'text',
      input: { prompt: 'Reply with the single word OK.', max_tokens: 8, temperature: 0 },
      skipCache: true,
      force: true,
    })
    add({ job: 'text', ok: text.ok, ms: text.ms, source: text.source, preview: text.preview, error: text.error })
  }

  const rest: { job: 'vision' | 'stt' | 'image' | 'tts'; skip: boolean }[] = [
    { job: 'vision', skip: !all || !live },
    { job: 'stt', skip: true },
    { job: 'image', skip: !all || !live },
    { job: 'tts', skip: !all || !live },
  ]
  for (const r of rest) {
    if (r.skip) {
      add({ job: r.job, ok: true, skipped: true, ms: 0, source: 'skip', preview: 'not called (use --all; stt waits for Phase B audio)' })
      continue
    }
    const input = r.job === 'image'
      ? { prompt: 'a plain gray square, no text', num_outputs: 1 }
      : r.job === 'tts'
        ? { text: 'OK.', voice: 'af_bella' }
        : r.job === 'vision'
          ? { image: 'https://replicate.delivery/pbxt/placeholder.jpg', prompt: 'Reply with the single word OK.' }
          : {}
    const pred = await predict({ job: r.job, input, skipCache: true, force: true })
    add({ job: r.job, ok: pred.ok, ms: pred.ms, source: pred.source, preview: pred.preview, error: pred.error })
  }

  // Station audio (meta/musicgen) — slow model, needs a longer deadline.
  if (!live) {
    add({ job: 'music', ok: true, skipped: true, ms: 0, source: 'skip', preview: 'no proxy/direct token yet' })
  } else {
    const music = await predict({
      job: 'music',
      input: { prompt: 'calm ambient pads, no vocals', model_version: 'stereo-large', duration: 5, output_format: 'mp3' },
      skipCache: true, force: true, timeoutSeconds: 60,
    })
    add({ job: 'music', ok: music.ok, ms: music.ms, source: music.source, preview: music.preview, error: music.error })
  }
  return { rows, used }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let body: Record<string, unknown> = {}
  try {
    body = await req.json()
  } catch { /* empty body */ }

  const expected = Deno.env.get('ADMIN_PASSCODE') || CONFIG.ADMIN_PASSCODE
  if (typeof body.passcode !== 'string' || body.passcode !== expected) {
    await new Promise((r) => setTimeout(r, 800))
    return json({ ok: false, reason: 'denied' }, 401)
  }
  const action = typeof body.action === 'string' ? body.action : 'status'

  if (action === 'set_proxy_token') {
    // Strip anything that isn't visible ASCII (stray newline/space/smart-quote/
    // zero-width char from a copy-paste) so the Bearer header stays valid.
    const token = typeof body.token === 'string' ? body.token.replace(/[^\x21-\x7E]/g, '') : ''
    if (token.length < 8) return json({ ok: false, reason: 'invalid' })
    const { error } = await db.from('ag_state').update({
      proxy_token: token,
      proxy_token_updated_at: new Date().toISOString(),
      proxy_status: 'unknown',
    }).eq('id', 1)
    if (error) {
      console.error(error)
      return json({ ok: false, reason: 'error' }, 500)
    }
    const { data, error: stErr } = await db.rpc('ag_admin', { p_action: 'status', p_tz: CONFIG.TIME_ZONE })
    if (stErr) return json({ ok: false, reason: 'error' }, 500)
    const status = await withAi(data as AdminStatus)
    return json({ ok: true, status, tokenSaved: maskToken(token) })
  }

  if (action === 'replicate_proxy' || action === 'replicate_direct') {
    const mode = action === 'replicate_direct' ? 'direct' : 'proxy'
    const { error } = await db.from('ag_state').update({ replicate_mode: mode }).eq('id', 1)
    if (error) {
      console.error(error)
      return json({ ok: false, reason: 'error' }, 500)
    }
    const { data, error: stErr } = await db.rpc('ag_admin', { p_action: 'status', p_tz: CONFIG.TIME_ZONE })
    if (stErr) return json({ ok: false, reason: 'error' }, 500)
    return json({ ok: true, status: await withAi(data as AdminStatus) })
  }

  if (action === 'test_ai') {
    const tests = await runTests(body.all === true)
    const { data, error } = await db.rpc('ag_admin', { p_action: 'status', p_tz: CONFIG.TIME_ZONE })
    if (error) return json({ ok: false, reason: 'error' }, 500)
    return json({ ok: true, status: await withAi(data as AdminStatus), tests })
  }

  if (!SQL_ACTIONS.includes(action)) return json({ ok: false, reason: 'invalid' }, 400)
  const { data, error } = await db.rpc('ag_admin', { p_action: action, p_tz: CONFIG.TIME_ZONE })
  if (error) {
    console.error(error)
    return json({ ok: false, reason: 'error' }, 500)
  }
  return json({ ok: true, status: await withAi(data as AdminStatus) })
})
