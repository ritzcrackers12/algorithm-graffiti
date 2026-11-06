// Copies src/shared/*.ts into supabase/functions/_shared/ so the website and the
// Edge Functions use the exact same config, validation, prompts and mock content.
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'

const from = 'src/shared'
const to = 'supabase/functions/_shared'
mkdirSync(to, { recursive: true })
for (const f of readdirSync(from).filter((f) => f.endsWith('.ts'))) {
  const header = `// GENERATED COPY of ${from}/${f}. Edit that file instead, then run \`npm run sync-shared\`.\n`
  writeFileSync(`${to}/${f}`, header + readFileSync(`${from}/${f}`, 'utf8'))
}
console.log(`Synced ${from} -> ${to}`)
