// Android: navigator.vibrate. iOS Safari (18+) has no vibrate API, but toggling a hidden
// <input type="checkbox" switch> produces a system haptic tick, so we use that as a fallback.
let iosSwitch: HTMLLabelElement | null = null

function getIosSwitch() {
  if (iosSwitch) return iosSwitch
  const label = document.createElement('label')
  label.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;pointer-events:none'
  const input = document.createElement('input')
  input.type = 'checkbox'
  input.setAttribute('switch', '')
  label.appendChild(input)
  document.body.appendChild(label)
  iosSwitch = label
  return label
}

export function haptic(kind: 'tick' | 'press' | 'success' | 'error' = 'tick') {
  const pattern = { tick: 8, press: 18, success: [12, 40, 24], error: [40, 30, 40] }[kind]
  if ('vibrate' in navigator && typeof navigator.vibrate === 'function') {
    navigator.vibrate(pattern)
    return
  }
  try {
    getIosSwitch().click()
  } catch {
    /* no haptics available */
  }
}
