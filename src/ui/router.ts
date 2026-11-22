import { useEffect, useState } from 'react'

// Hash routes work on GitHub Pages without any server-side fallback.
export type Route =
  | { name: 'home' }
  | { name: 'overview'; username: string }
  | { name: 'games'; username: string }
  | { name: 'game'; username: string; id: string; ply?: number }
  /** `focus` preselects a puzzle filter, e.g. a phase ("endgame") from the dashboard. */
  | { name: 'puzzles'; username: string; focus?: string }
  | { name: 'dashboard'; username: string }
  /** Optional `guide` and `line` jump directly into an interactive opening variation. */
  | { name: 'openings'; username: string; guide?: string; line?: string }
  | { name: 'hanging'; username: string }
  /** Without `lesson`: the list; with it, a curriculum id or an own drill id (`gameId:ply`). */
  | { name: 'endgames'; username: string; lesson?: string }

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
    if (parts[2] === 'games') return { name: 'games', username: parts[1] }
    if (parts[2] === 'dashboard') return { name: 'dashboard', username: parts[1] }
    if (parts[2] === 'openings') {
      if (parts[3] && parts[4]) {
        return { name: 'openings', username: parts[1], guide: parts[3], line: parts[4] }
      }
      if (parts[3]) return { name: 'openings', username: parts[1], guide: parts[3] }
      return { name: 'openings', username: parts[1] }
    }
    if (parts[2] === 'hanging') return { name: 'hanging', username: parts[1] }
    if (parts[2] === 'endgames') {
      return parts[3]
        ? { name: 'endgames', username: parts[1], lesson: parts[3] }
        : { name: 'endgames', username: parts[1] }
    }
    return { name: 'overview', username: parts[1] }
  }
  return { name: 'home' }
}

export function routeHref(route: Route): string {
  switch (route.name) {
    case 'home':
      return '#/'
    case 'overview':
      return `#/u/${encodeURIComponent(route.username)}`
    case 'games':
      return `#/u/${encodeURIComponent(route.username)}/games`
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
    case 'openings': {
      const base = `#/u/${encodeURIComponent(route.username)}/openings`
      if (route.guide && route.line) {
        return `${base}/${encodeURIComponent(route.guide)}/${encodeURIComponent(route.line)}`
      }
      return route.guide ? `${base}/${encodeURIComponent(route.guide)}` : base
    }
    case 'hanging':
      return `#/u/${encodeURIComponent(route.username)}/hanging`
    case 'endgames':
      return `#/u/${encodeURIComponent(route.username)}/endgames${
        route.lesson ? `/${encodeURIComponent(route.lesson)}` : ''
      }`
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
