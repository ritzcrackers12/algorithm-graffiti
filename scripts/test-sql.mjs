// Runs the Supabase migrations in an in-memory Postgres (PGlite) and exercises the queue rules.
// Usage: npm run test:sql
import { PGlite } from '@electric-sql/pglite'
import { readFileSync, readdirSync } from 'node:fs'
import assert from 'node:assert/strict'

const db = new PGlite()
await db.exec(`create role anon; create role authenticated; create role service_role;`)
for (const f of readdirSync('supabase/migrations').sort()) {
  await db.exec(readFileSync(`supabase/migrations/${f}`, 'utf8'))
}

const P = [90, 20, 12, 180, "per_visitor"]
const one = async (sql, params = []) => Object.values((await db.query(sql, params)).rows[0])[0]
const hb = (s, join = true, p = P) => one(`select ag_heartbeat($1,$2,$3,$4,$5,$6,$7)`, [s, join, ...p])
const tick = (p = P) => one(`select ag_tick($1,$2,$3,$4,$5)`, p)
const cmd = (s, c, a = null, p = P) => one(`select ag_command($1,$2,$3,$4,$5,$6,$7,$8)`, [s, c, a, ...p])
const admin = (a) => one(`select ag_admin($1,'America/New_York')`, [a])
const age = (sql) => db.exec(sql)

const A = 'visitor-aaaa', B = 'visitor-bbbb', C = 'visitor-cccc'

let r = await tick()
assert.equal(r.hasActive, false)

r = await hb(A); assert.equal(r.position, 0, 'first visitor becomes active')
r = await hb(B); assert.equal(r.position, 1, 'second waits at position 1')
r = await hb(C); assert.equal(r.position, 2)
assert.equal(r.waiting, 2)

r = await cmd(B, 'open', 'article'); assert.equal(r.ok, false, 'non-active cannot command')
r = await cmd(A, 'open', 'article'); assert.equal(r.ok, true); assert.equal(r.display.open, 'article')
assert.equal(r.display.view, 'original')

// generation round trip
let g = await one(`select ag_begin_generation($1,'article',14,3,5,200,'America/New_York')`, [A])
assert.equal(g.ok, true); assert.equal(g.mockMode, true)
r = await tick(); assert.equal(r.display.busy.object, 'article')
let g2 = await one(`select ag_begin_generation($1,'article',14,3,5,200,'America/New_York')`, [A])
assert.equal(g2.reason, 'busy')
await one(`select ag_finish_generation($1,$2,'article',$3::jsonb,'mock','per_visitor')`, [g.id, A, JSON.stringify({ title: 'X' })])
r = await tick(); assert.equal(r.display.busy, null); assert.equal(r.display.view, 'altered'); assert.equal(r.altered.article.title, 'X')
g2 = await one(`select ag_begin_generation($1,'article',14,3,5,200,'America/New_York')`, [A])
assert.equal(g2.reason, 'cooldown', 'rate limit')

// idle timeout passes control to B and resets (per_visitor)
await age(`update ag_state set last_activity_at = now() - interval '21 seconds'`)
r = await hb(B); assert.equal(r.position, 0, 'B takes over after A idles')
assert.deepEqual(r.altered, {}, 'per_visitor reset')
assert.equal(r.display.open, null)
r = await hb(C); assert.equal(r.position, 1)
r = await hb(A, false); assert.equal(r.position, -1, 'A is out of the queue')

// turn length
await age(`update ag_state set turn_started_at = now() - interval '91 seconds'`)
r = await hb(C); assert.equal(r.position, 0, 'C takes over after 90s')

// vanished phone (locked / tab closed)
r = await hb(A); assert.equal(r.position, 1)
await age(`update ag_queue set last_seen = now() - interval '13 seconds' where session_id = '${C}'`)
r = await tick(); r = await hb(A); assert.equal(r.position, 0, 'A takes over when C disappears')

// a waiter with a locked phone keeps their place, but is skipped when their turn comes
r = await hb(B); assert.equal(r.position, 1)
r = await hb(C); assert.equal(r.position, 2)
await age(`update ag_queue set last_seen = now() - interval '60 seconds' where session_id = '${B}'`)
r = await hb(C); assert.equal(r.position, 2, 'locked waiter B still holds a place')
await age(`update ag_state set turn_started_at = now() - interval '91 seconds'`)
r = await hb(C); assert.equal(r.position, 0, 'stale B skipped, C promoted')
r = await hb(B, false); assert.equal(r.position, 1, 'B back, still in line')
await age(`update ag_queue set last_seen = now() - interval '181 seconds' where session_id = '${B}'`)
r = await tick(); assert.equal(r.waiting, 0, 'B dropped after 3 minutes away')
await admin('clear_queue'); await hb(A)

// persist mode keeps changes across visitors
const PP = [90, 20, 12, 180, "persist"]
await age(`update ag_generations set created_at = now() - interval '1 minute'`)
g = await one(`select ag_begin_generation($1,'website',12,3,5,200,'America/New_York')`, [A])
await one(`select ag_finish_generation($1,$2,'website','{"v":1}'::jsonb,'mock','persist')`, [g.id, A])
r = await hb(B, true, PP); assert.equal(r.position, 1)
r = await cmd(A, 'end', null, PP); r = await hb(B, true, PP)
assert.equal(r.position, 0); assert.ok(r.altered.website, 'persist keeps altered')

// voluntary end + admin
r = await admin('status'); assert.equal(r.today.mock, 2); assert.equal(r.hasActive, true)
r = await admin('mock_off'); assert.equal(r.mockMode, false)
r = await admin('skip'); assert.equal(r.hasActive, false)
r = await admin('reset'); assert.deepEqual(r.alteredObjects, [])
await hb(A); await hb(C)
r = await admin('clear_queue'); assert.equal(r.waiting, 0); assert.equal(r.hasActive, false)

// bad input
await assert.rejects(hb('x'), /invalid session/)
r = await hb(A); await assert.rejects(cmd(A, 'open', 'evil'), /invalid object/)
r = await cmd(A, 'open', 'website'); assert.equal(r.ok, true)
r = await cmd(A, 'done')
assert.equal(r.display.open, null)
assert.deepEqual(r.display.completed, ['website'])
r = await cmd(A, 'open', 'website'); assert.equal(r.ok, true, 'can reopen a finished object')
r = await cmd(A, 'home'); assert.equal(r.display.open, null)
r = await cmd(A, 'open', 'article'); assert.equal(r.ok, true)
r = await cmd(A, 'home')
r = await cmd(A, 'story', 'military-ai')
assert.equal(r.ok, true)
assert.equal(r.display.open, 'article')
assert.equal(r.display.articleId, 'military-ai')
r = await cmd(A, 'home')
assert.equal(r.display.articleId, null)
await assert.rejects(cmd(A, 'story', 'NOPE'), /invalid story/)

// anon must not call server-only functions
await db.exec(`set role anon`)
await assert.rejects(db.query(`select ag_admin('reset','UTC')`), /permission denied/)
await assert.rejects(db.query(`select * from ag_queue`), /permission denied|row-level/)
r = await hb(B); assert.ok(r.position >= 0, 'anon can heartbeat')

console.log('SQL queue tests passed.')
