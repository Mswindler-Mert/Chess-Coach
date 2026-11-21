import { describe, expect, it } from 'vitest'
import { explainMistake } from '../core/analysis/coachExplain'
import { describeMove } from '../core/analysis/explainMove'
import {
  formatBestReason,
  formatMoveAction,
  formatPlayedReason,
  formatPlayedSentence,
  trAtSquare,
  trToSquare,
} from './moveText'

describe('moveText', () => {
  it('applies Turkish square suffixes naturally', () => {
    expect(trAtSquare('a2')).toBe('a2’deki')
    expect(trAtSquare('d5')).toBe('d5’teki')
    expect(trAtSquare('f6')).toBe('f6’daki')
    expect(trToSquare('f6')).toBe('f6’ya')
    expect(trToSquare('e4')).toBe('e4’e')
    expect(trToSquare('a2')).toBe('a2’ye')
  })

  it('turns castling and captures into plain Turkish and English', () => {
    const castleFen = 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4'
    const castle = describeMove(castleFen, 'e1g1')!
    expect(formatMoveAction(castle, 'tr')).toBe('kısa rok yapmak (O-O)')
    expect(formatMoveAction(castle, 'en')).toBe('castle kingside (O-O)')

    const capFen = '3qk3/8/8/3n4/4B3/8/8/4K3 w - - 0 1'
    const cap = describeMove(capFen, 'Bxd5')!
    expect(formatPlayedSentence(cap, 'tr')).toBe('Filinle d5’teki atı aldın (Bxd5).')
    expect(formatPlayedSentence(cap, 'en')).toBe(
      'You took the knight on d5 with your bishop (Bxd5).',
    )
  })

  it('produces concrete Turkish coaching sentences for a hanging piece', () => {
    const fen = 'r1bqkbnr/ppp2ppp/2n5/4p3/2B5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5'
    const coaching = explainMistake({
      fen,
      color: 'white',
      playedUci: 'c4d5',
      bestUci: 'e1g1',
      afterPlayedPv: ['d8d5'],
      motifs: ['hanging-piece'],
    })!
    expect(formatBestReason(coaching.best.move, coaching.best.reason, 'tr')).toContain('Kısa rok')
    const played = formatPlayedReason(coaching, 'tr')
    expect(played).toContain('d5’teki')
    expect(played).toContain('veziri')
  })
})
