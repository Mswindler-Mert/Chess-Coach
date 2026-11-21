import { describe, expect, it } from 'vitest'
import { keyMoments } from './review'
import type { MoveAnalysis, MoveClass } from './types'

const move = (ply: number, color: 'white' | 'black', loss: number, moveClass: MoveClass) =>
  ({
    ply,
    color,
    uci: 'a2a3',
    san: 'a3',
    winBefore: 50,
    winAfter: 50 - loss,
    loss,
    moveClass,
    phase: 'middlegame',
  }) satisfies MoveAnalysis

describe('keyMoments', () => {
  const moves = [
    move(1, 'white', 12, 'inaccuracy'),
    move(2, 'black', 60, 'blunder'),
    move(3, 'white', 35, 'blunder'),
    move(5, 'white', 22, 'mistake'),
    move(7, 'white', 4, 'good'),
    move(9, 'white', 40, 'blunder'),
  ]

  it('picks the biggest losses of one side, in game order', () => {
    expect(keyMoments(moves, 'white').map((m) => m.ply)).toEqual([3, 5, 9])
  })

  it('ignores good moves and the other side', () => {
    expect(keyMoments(moves, 'black').map((m) => m.ply)).toEqual([2])
    expect(keyMoments([move(1, 'white', 3, 'good')], 'white')).toEqual([])
  })

  it('respects the limit', () => {
    expect(keyMoments(moves, 'white', 1).map((m) => m.ply)).toEqual([9])
  })
})
