import { useRef, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { haptic } from '../lib/haptics.ts'

/** Rotary knob with detents. Drag around it (or tap a label) to pick a step. */
export function Knob({
  steps, value, onChange, size = 132, disabled, accent = 'var(--color-signal)',
}: {
  steps: string[]
  value: number
  onChange: (v: number) => void
  size?: number
  disabled?: boolean
  accent?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const n = steps.length
  const sweep = 270
  const angleOf = (i: number) => -sweep / 2 + (sweep / (n - 1)) * i
  const set = (i: number) => {
    if (disabled || i === value) return
    haptic('tick')
    onChange(i)
  }
  const fromPointer = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const dx = e.clientX - (r.left + r.width / 2)
    const dy = e.clientY - (r.top + r.height / 2)
    const deg = Math.min(sweep / 2, Math.max(-sweep / 2, (Math.atan2(dx, -dy) * 180) / Math.PI))
    set(Math.round((deg + sweep / 2) / (sweep / (n - 1))))
  }
  const ring = size + 96
  return (
    <div style={{ width: ring, height: ring, position: 'relative', margin: '0 auto', opacity: disabled ? 0.45 : 1 }}>
      {steps.map((s, i) => {
        const a = (angleOf(i) * Math.PI) / 180
        const rad = size / 2 + 30
        return (
          <button
            key={s}
            onClick={() => set(i)}
            style={{
              position: 'absolute', left: ring / 2 + Math.sin(a) * rad, top: ring / 2 - Math.cos(a) * rad, transform: 'translate(-50%, -50%)',
              background: 'none', border: 0, padding: 6, color: i === value ? accent : 'rgba(255,255,255,0.55)',
              font: `800 ${i === value ? 12 : 11}px/1 var(--font-mono)`, letterSpacing: 1, transition: 'color .2s', whiteSpace: 'nowrap',
            }}
          >
            {s}
          </button>
        )
      })}
      <div
        ref={ref}
        onPointerDown={(e) => {
          if (disabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        style={{
          position: 'absolute', left: 48, top: 48, width: size, height: size, borderRadius: '50%', touchAction: 'none',
          background: 'radial-gradient(circle at 35% 30%, #4a4a58 0%, #1c1c24 55%, #0b0b10 100%)',
          boxShadow: '0 14px 30px rgba(0,0,0,0.6), inset 0 2px 2px rgba(255,255,255,0.18), inset 0 -4px 10px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.12)',
        }}
      >
        <div
          style={{
            position: 'absolute', inset: 0, transform: `rotate(${angleOf(value)}deg)`,
            transition: 'transform 0.22s cubic-bezier(.2,.9,.3,1.3)',
          }}
        >
          <div style={{ position: 'absolute', left: '50%', top: 10, width: 6, height: size * 0.26, marginLeft: -3, borderRadius: 3, background: accent, boxShadow: `0 0 12px ${accent}` }} />
        </div>
        <div style={{ position: 'absolute', inset: size * 0.3, borderRadius: '50%', background: 'radial-gradient(circle at 40% 35%, #33333f, #121218)', boxShadow: 'inset 0 1px 1px rgba(255,255,255,0.15)' }} />
      </div>
    </div>
  )
}

/** Horizontal slider that snaps to `steps` detents. */
export function DetentSlider({
  steps, value, onChange, disabled, track, left, right,
}: {
  steps: number
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  track?: string
  left?: string
  right?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const fromPointer = (e: RPointerEvent) => {
    const r = ref.current!.getBoundingClientRect()
    const frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width))
    const i = Math.round(frac * (steps - 1))
    if (i !== value) {
      haptic('tick')
      onChange(i)
    }
  }
  const pct = (value / (steps - 1)) * 100
  const thumb: CSSProperties = {
    position: 'absolute', top: '50%', left: `${pct}%`, width: 54, height: 54, marginLeft: -27, marginTop: -27, borderRadius: '50%',
    background: 'radial-gradient(circle at 35% 30%, #ffffff 0%, #d9d9e0 60%, #a9a9b5 100%)',
    boxShadow: '0 8px 18px rgba(0,0,0,0.55), 0 0 0 4px rgba(255,255,255,0.15)', transition: 'left 0.18s cubic-bezier(.2,.9,.3,1.2)',
  }
  return (
    <div style={{ opacity: disabled ? 0.45 : 1 }}>
      <div
        ref={ref}
        onPointerDown={(e) => {
          if (disabled) return
          e.currentTarget.setPointerCapture(e.pointerId)
          fromPointer(e)
        }}
        onPointerMove={(e) => !disabled && e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
        style={{ position: 'relative', height: 64, margin: '0 28px', touchAction: 'none' }}
      >
        <div style={{ position: 'absolute', left: 0, right: 0, top: 25, height: 14, borderRadius: 7, background: track ?? 'rgba(255,255,255,0.18)', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)' }} />
        {Array.from({ length: steps }, (_, i) => (
          <div key={i} style={{ position: 'absolute', top: 46, left: `${(i / (steps - 1)) * 100}%`, width: 2, height: 10, marginLeft: -1, background: 'rgba(255,255,255,0.5)' }} />
        ))}
        <div style={thumb} />
      </div>
      {(left || right) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '2px 6px 0' }} className="ctl-label">
          <span>{left}</span>
          <span>{right}</span>
        </div>
      )}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options, value, onChange, disabled, pinkWhen,
}: {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
  pinkWhen?: T
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button
          key={String(o.value)}
          disabled={disabled || o.disabled}
          className={`${o.value === value ? 'on' : ''} ${o.value === value && o.value === pinkWhen ? 'pink' : ''}`}
          onClick={() => {
            if (o.value === value) return
            haptic('tick')
            onChange(o.value)
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Section({ label, value, children, style }: { label: string; value?: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="panel" style={{ padding: '14px 14px 12px', ...style }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6, gap: 8 }}>
        <span className="ctl-label">{label}</span>
        {value && <span className="ctl-value" style={{ fontSize: 15, textAlign: 'right' }}>{value}</span>}
      </div>
      {children}
    </div>
  )
}
