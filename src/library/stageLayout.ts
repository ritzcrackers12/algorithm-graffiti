export const STAGE_W = 1366
export const STAGE_H = 1024

export type Box = { left: number; top: number; width: number; height: number }

export function stageLayout() {
  const w = window.innerWidth
  const h = window.innerHeight
  const scale = Math.min(w / STAGE_W, h / STAGE_H)
  return {
    scale,
    left: (w - STAGE_W * scale) / 2,
    top: (h - STAGE_H * scale) / 2,
  }
}

/** Offset of `el` from `.stage` in the 1366×1024 design pixels CSS zoom does not own. */
function designOffset(el: HTMLElement, stage: HTMLElement): Box | null {
  if (el.offsetWidth < 40 || el.offsetHeight < 40) return null
  let x = 0
  let y = 0
  let node: HTMLElement | null = el
  while (node && node !== stage) {
    x += node.offsetLeft
    y += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  if (!node) return null
  return { left: x, top: y, width: el.offsetWidth, height: el.offsetHeight }
}

/** Viewport box for a node inside the zoomed stage. Ignores getBoundingClientRect (Safari zoom lies). */
export function stageViewportBox(el: HTMLElement): Box | null {
  const stage = el.closest('.stage') as HTMLElement | null
  if (!stage) return null
  const design = designOffset(el, stage)
  if (!design) return null
  const { scale, left, top } = stageLayout()
  const layoutScale = stage.offsetWidth / STAGE_W
  if (layoutScale > 0.2 && Math.abs(layoutScale - 1) > 0.05) {
    return {
      left: left + design.left,
      top: top + design.top,
      width: design.width,
      height: design.height,
    }
  }
  return {
    left: left + design.left * scale,
    top: top + design.top * scale,
    width: design.width * scale,
    height: design.height * scale,
  }
}
