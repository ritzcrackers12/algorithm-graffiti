// GENERATED COPY of src/shared/poles.ts. Edit that file instead, then run `npm run sync-shared`.
/** Shared helper: turn a 0-100 dial position between two named poles into a
 *  short cryptic phrase for the blinking read-outs and the reel explain bars. */
export function poleWord(left: string, right: string, value: number): string {
  const v = Math.max(0, Math.min(100, value))
  if (v <= 18) return `VERY ${left}`
  if (v <= 40) return left
  if (v < 60) return 'BALANCED'
  if (v < 82) return right
  return `VERY ${right}`
}

/** Same idea for discrete step sliders where value is an index 0..steps-1. */
export function poleWordStep(left: string, right: string, value: number, steps: number): string {
  if (steps <= 1) return 'BALANCED'
  return poleWord(left, right, (value / (steps - 1)) * 100)
}
