import { createClient } from 'npm:@supabase/supabase-js@2'
import { CONFIG } from '../_shared/config.ts'
import { predict } from '../_shared/replicateClient.ts'
import { parseDepth, sponsoredYes } from '../_shared/reel.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

function parseJsonObject(raw: unknown): Record<string, unknown> | null {
  const text = typeof raw === 'string' ? raw
    : Array.isArray(raw) ? raw.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join('')
      : JSON.stringify(raw ?? '')
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  try {
    return JSON.parse(text.slice(start, end + 1)) as Record<string, unknown>
  } catch {
    return null
  }
}

function captionPrompt(): string {
  return 'Describe what is happening in these four video frames. Be factual. One or two sentences. Do not mention Instagram.'
}

function tagPrompt(body: Record<string, unknown>, caption: string, transcript: string): { system: string; prompt: string } {
  const lists = body.lists && typeof body.lists === 'object' ? body.lists as Record<string, string[]> : {}
  const line = (k: string) => (lists[k] ?? []).join(', ')
  return {
    system: 'You label short videos for a media library. Reply with JSON only, no markdown.',
    prompt: `Allowed values (you MAY propose a new subtopic or audience if none fit; if you do, prefix it with NEW: ):
topic: ${line('topic')}
subtopic: ${line('subtopic')}
audience: ${line('audience')}
mood: ${line('mood')}
format: ${line('format')}
vibe: ${line('vibe')}
depth: 1, 2, 3, 4, 5

Curator notes (MOST RELIABLE — if they conflict with the caption, ignore the caption): ${body.curator_notes || '(none)'}
sponsored: ${body.sponsored || 'no'}
ad_category: ${body.ad_category || '(none)'}
Frame caption: ${caption || '(none)'}
Transcript: ${transcript || '(none)'}

Rules:
- Treat curator notes as ground truth for topic, subtopic, audience, description, and keywords.
- Base audience on the content, style, and messaging. Never on the race, ethnicity, or appearance of people on screen.
- depth is a single integer 1-5 (1 mainstream … 5 deep end). No extra words.
- keywords: 4–8 comma-separated tags.
- description: one or two factual sentences about what the video is.

JSON keys: topic, subtopic, audience, mood, format, vibe, depth, keywords, description`,
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let body: Record<string, unknown> = {}
  try { body = await req.json() } catch { return json({ ok: false, reason: 'invalid' }) }
  const action = String(body.action ?? '')

  if (action === 'tag') {
    const used: { job: string; source: string; ms: number; error?: string }[] = []
    let transcript = typeof body.transcript === 'string' ? body.transcript : ''
    if (body.has_speech && body.audio && !transcript) {
      const audio = String(body.audio)
      const stt = await predict({
        job: 'stt',
        input: { audio, task: 'transcribe' },
        ...(audio.startsWith('data:') ? { fieldToConvertBase64ToURL: 'audio', fileFormat: '.wav' } : {}),
      })
      used.push({ job: 'stt', source: stt.source, ms: stt.ms, error: stt.ok ? undefined : stt.error })
      if (stt.ok) {
        const out = stt.output
        transcript = typeof out === 'string' ? out
          : out && typeof out === 'object' && 'text' in out ? String((out as { text: unknown }).text)
            : Array.isArray(out) ? out.join(' ') : ''
      }
    }
    let caption = ''
    if (body.grid) {
      const image = String(body.grid)
      const vis = await predict({
        job: 'vision',
        input: { image, prompt: captionPrompt() },
        ...(image.startsWith('data:') ? { fieldToConvertBase64ToURL: 'image', fileFormat: '.jpg' } : {}),
      })
      used.push({ job: 'vision', source: vis.source, ms: vis.ms, error: vis.ok ? undefined : vis.error })
      if (vis.ok) {
        const out = vis.output
        caption = typeof out === 'string' ? out
          : Array.isArray(out) ? out.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' ')
            : String(out ?? '')
      }
    }
    let fields: Record<string, unknown> = {}
    let flagged: string[] = []
    const { system, prompt } = tagPrompt(body, caption, transcript)
    const text = await predict({
      job: 'text',
      input: { prompt, system_prompt: system, max_tokens: 600, temperature: 0.2 },
    })
    used.push({ job: 'text', source: text.source, ms: text.ms, error: text.ok ? undefined : text.error })
    const parsed = text.ok ? parseJsonObject(text.output) : null
    if (parsed) {
      fields = parsed
      for (const k of ['subtopic', 'audience'] as const) {
        const v = String(parsed[k] ?? '')
        if (/^NEW:/i.test(v)) {
          flagged.push(k)
          fields[k] = v.replace(/^NEW:\s*/i, '')
        }
      }
    }
    if (!fields.description && caption) fields.description = caption
    if (typeof body.energy === 'string' && body.energy) fields.energy = body.energy
    return json({ ok: true, fields, flagged, transcript, caption, used })
  }

  if (action === 'import') {
    const rows = Array.isArray(body.rows) ? body.rows as Record<string, unknown>[] : []
    let embedded = 0
    for (const row of rows) {
      const text = [row.description, row.keywords, row.subtopic, row.transcript, row.curator_notes].filter(Boolean).join('\n')
      let embedding: number[] | null = null
      if (text.trim()) {
        const pred = await predict({ job: 'embed', input: { text } })
        if (pred.ok && Array.isArray(pred.output)) {
          embedding = pred.output as number[]
          embedded++
        }
      }
      const rec = {
        id: String(row.id),
        file: row.file ?? null,
        link: row.link ?? null,
        creator: row.creator ?? null,
        topic: row.topic ?? null,
        subtopic: row.subtopic ?? null,
        audience: row.audience ?? null,
        mood: row.mood ?? null,
        energy: row.energy ?? null,
        format: row.format ?? null,
        vibe: row.vibe ?? null,
        depth: parseDepth(row.depth),
        keywords: row.keywords ?? null,
        description: row.description ?? null,
        curator_notes: row.curator_notes ?? null,
        notes: row.notes ?? null,
        sponsored: sponsoredYes(row.sponsored),
        ad_category: row.ad_category ?? null,
        transcript: row.transcript ?? null,
        video_url: row.video_url ?? null,
        embedding,
        ai_filled: row.ai_filled ?? null,
        extra: row.extra ?? null,
      }
      const { error } = await db.from('ag_reels').upsert(rec)
      if (error) {
        console.error(error)
        return json({ ok: false, reason: 'db', error: error.message, id: rec.id })
      }
    }
    return json({ ok: true, imported: rows.length, embedded })
  }

  if (action === 'upload') {
    const id = String(body.id ?? '')
    const b64 = String(body.bytes ?? '')
    const mime = String(body.mime ?? 'video/mp4')
    if (!id || !b64) return json({ ok: false, reason: 'invalid' })
    const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
    const path = `${id}.mp4`
    const { error } = await db.storage.from('reels').upload(path, bin, { contentType: mime, upsert: true })
    if (error) return json({ ok: false, reason: 'storage', error: error.message })
    const { data } = db.storage.from('reels').getPublicUrl(path)
    return json({ ok: true, url: data.publicUrl, path })
  }

  return json({ ok: false, reason: 'invalid' }, 400)
})
