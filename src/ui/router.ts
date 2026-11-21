import { useEffect, useState } from 'react'

// Hash routes work on GitHub Pages without any server-side fallback.
export type Route =
  | { name: 'home' }
  | { name: 'games'; username: string }
  | { name: 'game'; username: string; id: string; ply?: number }
  /** `focus` preselects a puzzle filter, e.g. a phase ("endgame") from the dashboard. */
  | { name: 'puzzles'; username: string; focus?: string }
  | { name: 'dashboard'; username: string }
  | { name: 'openings'; username: string }

export function parseRoute(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean)
    .map((p) => decodeURIComponent(p))
  if (parts[0] === 'u' && parts[1]) {
    if (parts[2] === 'game' && parts[3]) {
      const ply = Number(parts[4])
      return Number.isInteger(ply) && ply > 0
        ? { name: 'game', username: parts[1], id: parts[3], ply }
        : { name: 'game', username: parts[1], id: parts[3] }
    }
    if (parts[2] === 'puzzles') {
      return parts[3]
        ? { name: 'puzzles', username: parts[1], focus: parts[3] }
        : { name: 'puzzles', username: parts[1] }
    }
    if (parts[2] === 'dashboard') return { name: 'dashboard', username: parts[1] }
    if (parts[2] === 'openings') return { name: 'openings', username: parts[1] }
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
      return `#/u/${encodeURIComponent(route.username)}/game/${encodeURIComponent(route.id)}${
        route.ply ? `/${route.ply}` : ''
      }`
    case 'puzzles':
      return `#/u/${encodeURIComponent(route.username)}/puzzles${
        route.focus ? `/${encodeURIComponent(route.focus)}` : ''
      }`
    case 'dashboard':
      return `#/u/${encodeURIComponent(route.username)}/dashboard`
    case 'openings':
      return `#/u/${encodeURIComponent(route.username)}/openings`
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
