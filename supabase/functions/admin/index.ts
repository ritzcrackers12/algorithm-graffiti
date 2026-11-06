import { createClient } from 'npm:@supabase/supabase-js@2'
import { CONFIG } from '../_shared/config.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const ACTIONS = ['status', 'reset', 'skip', 'clear_queue', 'mock_on', 'mock_off']
const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

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
  const action = typeof body.action === 'string' && ACTIONS.includes(body.action) ? body.action : 'status'
  const { data, error } = await db.rpc('ag_admin', { p_action: action, p_tz: CONFIG.TIME_ZONE })
  if (error) {
    console.error(error)
    return json({ ok: false, reason: 'error' }, 500)
  }
  return json({ ok: true, status: data })
})
