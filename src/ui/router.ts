import { useEffect, useState } from 'react'

// Hash routes work on GitHub Pages without any server-side fallback.
export type Route =
  | { name: 'home' }
  | { name: 'games'; username: string }
  | { name: 'game'; username: string; id: string }

export function parseRoute(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p))
  if (parts[0] === 'u' && parts[1]) {
    if (parts[2] === 'game' && parts[3]) return { name: 'game', username: parts[1], id: parts[3] }
    return { name: 'games', username: parts[1] }
  }
  return { name: 'home' }
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'games':
      return `#/u/${encodeURIComponent(route.username)}`
    case 'game':
      return `#/u/${encodeURIComponent(route.username)}/game/${encodeURIComponent(route.id)}`
  }
}

export function navigate(route: Route): void {
  window.location.hash = routeHref(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseRoute(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(parseRoute(window.location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
