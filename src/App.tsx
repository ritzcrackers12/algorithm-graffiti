import { lazy, Suspense, useEffect, useState } from 'react'
import Home from './Home.tsx'

const Library = lazy(() => import('./library/Library.tsx'))
const Controller = lazy(() => import('./controller/Controller.tsx'))
const Admin = lazy(() => import('./admin/Admin.tsx'))
const ReelCheck = lazy(() => import('./admin/ReelCheck.tsx'))
const Stats = lazy(() => import('./Stats.tsx'))
const Credits = lazy(() => import('./Credits.tsx'))

const routeOf = () => location.hash.replace(/^#\/?/, '').split('?')[0]

export default function App() {
  const [route, setRoute] = useState(routeOf)
  useEffect(() => {
    const on = () => setRoute(routeOf())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    // Home Screen apps open on the page they were saved from.
    const link = document.getElementById('manifest-link') as HTMLLinkElement | null
    const which = route === 'library' ? 'library' : 'controller'
    if (link) link.href = `${import.meta.env.BASE_URL}manifest-${which}.webmanifest`
  }, [route])

  return (
    <Suspense fallback={null}>
      {route === 'library' ? <Library />
        : route === 'controller' ? <Controller />
          : route === 'admin' ? <Admin />
            : route === 'reel-check' ? <ReelCheck />
              : route === 'stats' ? <Stats />
                : route === 'credits' ? <Credits />
                  : <Home />}
    </Suspense>
  )
}
