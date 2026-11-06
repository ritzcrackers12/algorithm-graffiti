import type { CSSProperties, ReactNode } from 'react'

export function XpWindow({
  title, icon, children, className = '', style, menu = ['File', 'Edit', 'View', 'Help'], closeOnly = false,
}: {
  title: string
  icon?: ReactNode
  children: ReactNode
  className?: string
  style?: CSSProperties
  menu?: string[] | null
  closeOnly?: boolean
}) {
  return (
    <div className={`xp-window ${className}`} style={style}>
      <div className="xp-titlebar">
        {icon && <span className="tb-icon">{icon}</span>}
        <span className="title">{title}</span>
        {!closeOnly && (
          <>
            <span className="xp-tbtn"><svg viewBox="0 0 10 10"><rect x="1" y="7" width="6" height="2" fill="#fff" /></svg></span>
            <span className="xp-tbtn"><svg viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill="none" stroke="#fff" strokeWidth="1.6" /><rect x="1" y="1" width="8" height="2.2" fill="#fff" /></svg></span>
          </>
        )}
        <span className="xp-tbtn close"><svg viewBox="0 0 10 10"><path d="M1.5 1.5 L8.5 8.5 M8.5 1.5 L1.5 8.5" stroke="#fff" strokeWidth="1.8" /></svg></span>
      </div>
      {menu && (
        <div className="xp-menubar">
          {menu.map((m) => <span key={m}><u>{m[0]}</u>{m.slice(1)}</span>)}
        </div>
      )}
      {children}
    </div>
  )
}
