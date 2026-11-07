// GENERATED COPY of src/shared/ai.ts. Edit that file instead, then run `npm run sync-shared`.
import { CONFIG } from './config.ts'
import type { ProxyStatus } from './types.ts'

export type AiJob = 'text' | 'vision' | 'stt' | 'image' | 'tts' | 'embed'

export function modelFor(job: AiJob) {
  return CONFIG.MODELS[job]
}

export function versionString(job: AiJob): { model?: string; version?: string } {
  const m = modelFor(job)
  if (m.version) return { version: `${m.model}:${m.version}` }
  return { model: m.model }
}

export function classifyProxyError(status: number, text: string): ProxyStatus {
  const t = text.toLowerCase()
  if (status === 401 || status === 403 || t.includes('expired') || t.includes('invalid token') || t.includes('unauthorized')) {
    return 'expired'
  }
  if (status === 429 || t.includes('quota') || t.includes('limit') || t.includes('too many')) {
    return 'limit'
  }
  return 'unknown'
}

export async function cacheKey(job: string, input: unknown): Promise<string> {
  const body = JSON.stringify({ job, input })
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body))
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('')
}

export function previewOf(output: unknown, n = 180): string {
  const s = typeof output === 'string' ? output
    : Array.isArray(output) ? output.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join('')
      : JSON.stringify(output ?? '')
  return s.replace(/\s+/g, ' ').trim().slice(0, n)
}

export function maskToken(token: string | null | undefined): string | null {
  if (!token) return null
  const t = token.trim()
  if (t.length < 4) return '••••'
  return `••••${t.slice(-4)}`
}
