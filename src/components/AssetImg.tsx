import { useState, type ReactNode } from 'react'
import { asset } from '../lib/content.ts'

const missing = new Set<string>()

/** Shows the first of `names` found in public/assets/, or `fallback` if none exist yet. */
export function AssetImg({ names, fallback, alt = '', className }: { names: string[]; fallback: ReactNode; alt?: string; className?: string }) {
  const candidates = names.filter((n) => !missing.has(n))
  const [, force] = useState(0)
  const name = candidates[0]
  if (!name) return <>{fallback}</>
  return (
    <img
      key={name}
      src={asset(name)}
      alt={alt}
      className={className}
      draggable={false}
      onError={() => {
        missing.add(name)
        force((n) => n + 1)
      }}
    />
  )
}