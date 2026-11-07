// Calls the admin Edge Function's test_ai action through the current Replicate mode.
// Default: embed (free gte-small) + one tiny text call. Add --all for vision/image/tts (uses more quota).
// Usage: npm run test:replicate
//        npm run test:replicate -- --all
import { readFileSync, existsSync } from 'node:fs'

function loadEnv() {
  for (const f of ['.env.local', '.env']) {
    if (!existsSync(f)) continue
    for (const line of readFileSync(f, 'utf8').split('\n')) {
      const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  }
}
loadEnv()

const all = process.argv.includes('--all')
const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const pass = process.env.ADMIN_PASSCODE || '1116'

if (!url || !key) {
  console.log('SKIP: no VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in the environment.')
  console.log('This test talks to the live admin function. It does not run in local-only mode.')
  console.log('Pass/fail here: SKIPPED (no project keys). Deploy functions, then rerun with keys loaded.')
  process.exit(0)
}

const started = Date.now()
const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/admin`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, apikey: key },
  body: JSON.stringify({ passcode: pass, action: 'test_ai', all }),
})
const body = await res.json().catch(() => ({}))
const ms = Date.now() - started

if (!res.ok || !body.ok) {
  console.log(`FAIL  admin test_ai  HTTP ${res.status}  ${ms}ms`)
  console.log(JSON.stringify(body, null, 2).slice(0, 800))
  if (res.status === 401) {
    console.log('The live ADMIN_PASSCODE secret does not match the default 1116.')
    console.log('Put ADMIN_PASSCODE=... in .env.local (same code as #/admin), then rerun.')
  }
  process.exit(1)
}

const tests = body.tests?.rows ?? []
const used = body.tests?.used ?? 0
let failed = 0
for (const row of tests) {
  const mark = row.skipped ? 'SKIP' : row.ok ? 'PASS' : 'FAIL'
  if (!row.ok && !row.skipped) failed++
  console.log(`${mark}  ${row.job.padEnd(8)}  ${String(row.ms).padStart(5)}ms  ${row.source}  ${row.preview || row.error || ''}`)
}
console.log(`mode=${body.status?.replicateMode}  status=${body.status?.proxyStatus}  proxyToday=${body.status?.proxyToday}  thisTestUsed=${used}  totalMs=${ms}`)
if (body.status?.mockMode) console.log('NOTE: MOCK MODE is ON. Live proxy calls are skipped inside generate; this test still hits the wrapper.')
process.exit(failed ? 1 : 0)
