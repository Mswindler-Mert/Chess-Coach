import { describe, expect, it } from 'vitest'
import { parseRoute, routeHref, type Route } from './router'

describe('router', () => {
  const routes: Route[] = [
    { name: 'home' },
    { name: 'overview', username: 'mswindler07' },
    { name: 'games', username: 'mswindler07' },
    { name: 'game', username: 'mswindler07', id: 'abc' },
    { name: 'game', username: 'mswindler07', id: 'abc', ply: 17 },
    { name: 'puzzles', username: 'mswindler07' },
    { name: 'puzzles', username: 'mswindler07', focus: 'endgame' },
    { name: 'dashboard', username: 'mswindler07' },
    { name: 'openings', username: 'mswindler07' },
    { name: 'openings', username: 'mswindler07', guide: 'e4-responses' },
    { name: 'openings', username: 'mswindler07', guide: 'e4-responses', line: 'scandinavian' },
    { name: 'hanging', username: 'mswindler07' },
    { name: 'endgames', username: 'mswindler07' },
    { name: 'endgames', username: 'mswindler07', lesson: 'lucena' },
    { name: 'endgames', username: 'mswindler07', lesson: 'abc-123:57' },
  ]

  it('round-trips every route through its hash', () => {
    for (const route of routes) expect(parseRoute(routeHref(route))).toEqual(route)
  })

  it('ignores an invalid ply', () => {
    expect(parseRoute('#/u/x/game/abc/zero')).toEqual({ name: 'game', username: 'x', id: 'abc' })
    expect(parseRoute('#/u/x/game/abc/0')).toEqual({ name: 'game', username: 'x', id: 'abc' })
  })
})
