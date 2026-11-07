// GENERATED COPY of src/shared/locations.ts. Edit that file instead, then run `npm run sync-shared`.
import { COUNTRY_ALIASES, COUNTRY_NAMES, STATE_PROFILES, type StateProfile } from './stateProfiles.ts'

export type ResolvedLocation =
  | { kind: 'none' }
  | { kind: 'state'; profile: StateProfile }
  | { kind: 'country'; name: string }

function norm(s: string) {
  return s.toLowerCase().replace(/[.]/g, '').replace(/\s+/g, ' ').trim()
}

export function resolveLocation(raw: string | null | undefined): ResolvedLocation {
  const n = norm(raw ?? '')
  if (!n) return { kind: 'none' }
  if (n === 'usa' || n === 'us' || n === 'united states' || n === 'america' || n === 'united states of america') {
    return { kind: 'none' }
  }
  if (n === 'dc' || n === 'd c' || n === 'washington dc' || n === 'washington d c' || n === 'district of columbia') {
    const dc = STATE_PROFILES.find((s) => s.abbr === 'DC')
    if (dc) return { kind: 'state', profile: dc }
  }
  const state = STATE_PROFILES.find((s) => norm(s.name) === n || norm(s.abbr) === n)
  if (state) return { kind: 'state', profile: state }
  const aliased = COUNTRY_ALIASES[n]
  if (aliased) return { kind: 'country', name: aliased }
  const country = COUNTRY_NAMES.find((c) => norm(c) === n)
  if (country) return { kind: 'country', name: country }
  return { kind: 'none' }
}

export function locationLabel(loc: ResolvedLocation): string | null {
  if (loc.kind === 'state') return loc.profile.name.toUpperCase()
  if (loc.kind === 'country') return loc.kind === 'country' ? loc.name.toUpperCase() : null
  return null
}

export function locationSuggestions(q: string, limit = 6): string[] {
  const n = norm(q)
  if (n.length < 1) return []
  const states = STATE_PROFILES
    .filter((s) => norm(s.name).startsWith(n) || norm(s.abbr) === n || norm(s.name).includes(` ${n}`))
    .map((s) => s.name)
  const countries = COUNTRY_NAMES.filter((c) => norm(c).startsWith(n) || norm(c).includes(` ${n}`))
  const out: string[] = []
  for (const x of [...states, ...countries]) {
    if (!out.includes(x)) out.push(x)
    if (out.length >= limit) break
  }
  return out
}

export function locationLogValue(loc: ResolvedLocation): string | null {
  if (loc.kind === 'state') return loc.profile.abbr
  if (loc.kind === 'country') return loc.name
  return null
}

/** What this place would care about — never includes the place name. */
export function inferEmphasis(profile: StateProfile): string[] {
  const blob = [...profile.topIndustries, ...profile.topIssues, profile.notes].join(' ').toLowerCase()
  const out: string[] = []
  const add = (test: RegExp, label: string) => {
    if (test.test(blob) && !out.includes(label)) out.push(label)
  }
  add(/manufactur|factory|auto|job|plant|aerospace|shipbuild|logistics/, 'jobs')
  add(/water/, 'water')
  add(/energy|oil|gas|grid|coal|power/, 'energy and power bills')
  add(/hous/, 'housing costs')
  add(/farm|agri|crop|dairy|cattle/, 'farm income')
  add(/tax/, 'the local tax base')
  add(/tech|semiconductor/, 'whether new investment stays')
  add(/health/, 'health-care costs')
  add(/trade|port/, 'trade')
  return out.slice(0, 3)
}
