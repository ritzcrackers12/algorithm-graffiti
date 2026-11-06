// Cache-busting: every build writes version.json. Pages poll it and reload when a new
// version is deployed, so the iPad never keeps showing an old build.
declare const __BUILD_ID__: string

export function startVersionCheck(canReload: () => boolean) {
  if (import.meta.env.DEV) return
  setInterval(async () => {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}version.json?t=${Date.now()}`, { cache: 'no-store' })
      const { build } = await res.json()
      if (build && build !== __BUILD_ID__ && canReload()) location.reload()
    } catch {
      /* offline: try again later */
    }
  }, 60_000)
}
