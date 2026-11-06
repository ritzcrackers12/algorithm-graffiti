import type { View } from '../shared/types.ts'

export default function ViewTabs({ view, hasAltered }: { view: View; hasAltered: boolean }) {
  return (
    <div className="view-tabs">
      <span className={view === 'original' || !hasAltered ? 'on' : ''}>ORIGINAL</span>
      <span className={view === 'altered' && hasAltered ? 'on altered' : ''} style={!hasAltered ? { opacity: 0.4 } : undefined}>
        ALTERED
      </span>
    </div>
  )
}
