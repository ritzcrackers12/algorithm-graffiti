import { useState } from 'react'

// Control positions survive switching objects / Home during a turn, and reset for each new turn.
const store = new Map<string, unknown>()

export function useControls<T>(object: string, turnKey: number | null, init: () => T): [T, (patch: Partial<T>) => void] {
  const key = `${object}:${turnKey}`
  const [value, setValue] = useState<T>(() => (store.has(key) ? (store.get(key) as T) : init()))
  const update = (patch: Partial<T>) => {
    setValue((prev) => {
      const next = { ...prev, ...patch }
      store.set(key, next)
      return next
    })
  }
  return [value, update]
}
