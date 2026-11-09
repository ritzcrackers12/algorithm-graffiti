import { useRef, type CSSProperties, type PointerEvent as RPointerEvent, type ReactNode } from 'react'
import { PixelButton } from '../components/PixelButton.tsx'
import { haptic } from '../lib/haptics.ts'

/** Compact vintage rotary. Drag around it (or tap a tick) to pick a step. */
export function Knob({
  steps, value, onChange, size = 72, disabled, accent = '#0f7a56', label,
}: {
  steps: string[]
  value: number
  onChange: (v: number) => void
  size?: number
  disabled?: boolean
  accent?: string
  label?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const n = steps.length
  const sweep = 270
  const angleOf = (i: number) => -sweep / 2 + (sweep / Math.max(1, n - 1)) * i
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
    set(Math.round((deg + sweep / 2) / (sweep / Math.max(1, n - 1))))
  }
  return (
    <div className="knob-wrap" style={{ width: size + 8, opacity: disabled ? 0.4 : 1 }}>
      <div
        ref={ref}
        className="knob-face"
        style={{ width: size, height: size }}
        role="slider"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, n - 1)}
        aria-valuenow={value}
        onPointerDown={(e) => {
          if (disabled) return
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* synthetic events */ }
          fromPointer(e)
        }}
        onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
      >
        {steps.map((_, i) => {
          const a = (angleOf(i) * Math.PI) / 180
          const rad = size / 2 - 7
          return (
            <i
              key={i}
              className={`knob-tick ${i === value ? 'on' : ''}`}
              style={{
                left: size / 2 + Math.sin(a) * rad,
                top: size / 2 - Math.cos(a) * rad,
                background: i === value ? accent : undefined,
              }}
            />
          )
        })}
        <div className="knob-pointer" style={{ transform: `rotate(${angleOf(value)}deg)` }}>
          <b style={{ background: accent }} />
        </div>
        <div className="knob-cap" />
      </div>
    </div>
  )
}

/** Horizontal metal fader that snaps to detents. */
export function DetentSlider({
  steps, value, onChange, disabled, track, left, right, unset, readout,
}: {
  steps: number
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  track?: string
  left?: string
  right?: string
  /** Grayed, no effect until the visitor touches it. */
  unset?: boolean
  /** Blinking cryptic phrase shown centered between the pole labels. */
  readout?: string
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
  const pct = unset ? 0 : (value / (steps - 1)) * 100
  const thumb: CSSProperties = { left: `${pct}%`, opacity: unset ? 0.35 : 1 }
  return (
    <div className={`fader${unset ? ' unset' : ''}`} style={{ opacity: disabled ? 0.4 : 1 }}>
      <div
        ref={ref}
        className="fader-track"
        onPointerDown={(e) => {
          if (disabled) return
          try { e.currentTarget.setPointerCapture(e.pointerId) } catch { /* synthetic events */ }
          fromPointer(e)
        }}
        onPointerMove={(e) => !disabled && e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e)}
      >
        <div className="fader-groove" style={!unset && track ? { background: track } : undefined} />
        {!unset && <div className="fader-fill" style={{ width: `${pct}%` }} />}
        {Array.from({ length: steps }, (_, i) => (
          <i key={i} className="fader-notch" style={{ left: `${(i / (steps - 1)) * 100}%` }} />
        ))}
        <div className="fader-thumb" style={thumb} />
      </div>
      {(left || right || readout) && (
        <div className={`fader-ends${readout ? ' three' : ''}`}>
          <span className="fe l">{left}</span>
          {readout && <span className="fe m blink">{readout}</span>}
          <span className="fe r">{right}</span>
        </div>
      )}
    </div>
  )
}

export function Segmented<T extends string | number>({
  options, value, onChange, disabled,
}: {
  options: { value: T; label: string; disabled?: boolean }[]
  value: T
  onChange: (v: T) => void
  disabled?: boolean
}) {
  return (
    <div className="seg">
      {options.map((o) => (
        <PixelButton
          key={String(o.value)}
          disabled={disabled || o.disabled}
          selected={o.value === value}
          onClick={() => {
            if (o.value === value) return
            haptic('tick')
            onChange(o.value)
          }}
        >
          {o.label}
        </PixelButton>
      ))}
    </div>
  )
}

/** 0–100 fader with named poles. 11 detents. */
export function PercentDial({
  left, right, value, onChange, disabled,
}: {
  left: string
  right: string
  value: number
  onChange: (n: number) => void
  disabled?: boolean
}) {
  return (
    <DetentSlider
      steps={11}
      value={Math.round(value / 10)}
      onChange={(i) => onChange(i * 10)}
      left={left}
      right={right}
      disabled={disabled}
    />
  )
}

export function Section({
  label, value, children, style, stack,
}: { label: string; value?: string; children: ReactNode; style?: CSSProperties; stack?: boolean }) {
  return (
    <div className={`panel ${stack ? 'stack' : ''}`} style={style}>
      <div className="panel-head">
        <span className="ctl-label">{label}</span>
        {value && <span className="ctl-value">{value}</span>}
      </div>
      {children}
    </div>
  )
}
