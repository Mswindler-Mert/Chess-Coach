import { describe, expect, it } from 'vitest'
import { explainMistake } from './coachExplain'

describe('explainMistake', () => {
  it('explains a missed free piece with what could be won and the opponent reply', () => {
    // White knight on c3 can capture an undefended black knight on d5; White played h3 instead.
    const fen = '4k3/8/8/3n4/8/2N5/7P/4K3 w - - 0 1'
    const coaching = explainMistake({
      fen,
      color: 'white',
      playedUci: 'h2h3',
      bestUci: 'c3d5',
      afterPlayedPv: ['d5c3'],
      motifs: ['missed-free-piece'],
    })
    expect(coaching).not.toBeNull()
    expect(coaching?.best.reason).toEqual({ kind: 'free-capture', gain: 3 })
    expect(coaching?.played.reason).toEqual({
      kind: 'missed-free-piece',
      targetSquare: 'd5',
      targetPiece: 'n',
    })
    expect(coaching?.played.enemyReply?.san).toBe('Nxc3')
    expect(coaching?.tip).toBe('missed-free-piece')
    expect(coaching?.hintSquare).toBe('c3')
  })

  it('explains a hanging piece mistake with the exact enemy capturer', () => {
    // White bishop moves from c4 to d5 where the black queen on d8 takes it for free; O-O was better.
    const fen = 'r1bqkbnr/ppp2ppp/2n5/4p3/2B5/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 5'
    const coaching = explainMistake({
      fen,
      color: 'white',
      playedUci: 'c4d5',
      bestUci: 'e1g1',
      afterPlayedPv: ['d8d5'],
      motifs: ['hanging-piece'],
    })
    expect(coaching?.best.reason).toEqual({ kind: 'castle' })
    expect(coaching?.played.reason).toEqual({
      kind: 'hanging-piece',
      threat: {
        from: 'd8',
        to: 'd5',
        attackerPiece: 'q',
        targetPiece: 'b',
        gain: 3,
      },
    })
    expect(coaching?.played.refutationSteps[0]?.move.san).toBe('Qxd5')
  })

  it('recognises when the best move saves a threatened piece', () => {
    // White rook on a5 is attacked by b6 pawn; Ra4 saves it, while h3 leaves it hanging.
    const fen = '4k3/8/1p6/R7/8/8/7P/4K3 w - - 0 1'
    const coaching = explainMistake({
      fen,
      color: 'white',
      playedUci: 'h2h3',
      bestUci: 'a5a4',
      afterPlayedPv: ['b6a5'],
      motifs: ['hanging-piece'],
    })
    expect(coaching?.best.reason).toEqual({ kind: 'saves-piece', piece: 'r', from: 'a5' })
    expect(coaching?.played.reason).toMatchObject({ kind: 'hanging-piece' })
  })

  it('never labels a defended capture as a free piece — describes removing-the-defender honestly', () => {
    // Black bishop g4 captures White knight f3 (defended by g2 pawn & d1 queen) to remove the
    // defender of White's g5 bishop: 1...Bxf3 2.gxf3 Qxg5.
    const fen = 'r2qk2r/pppn1ppp/1b1p4/3P2B1/4P1b1/2N2N2/PPP2PPP/R2QK2R b KQkq - 0 11'
    const coaching = explainMistake({
      fen,
      color: 'black',
      playedUci: 'f7f6',
      bestUci: 'g4f3',
      bestPv: ['g4f3', 'g2f3', 'd8g5'],
      afterPlayedPv: ['g5h4'],
      motifs: ['missed-free-piece'],
    })
    expect(coaching?.best.reason).toMatchObject({
      kind: 'tactical-capture',
      followUp: expect.objectContaining({ san: 'Qxg5' }),
    })
    expect(coaching?.played.reason).toEqual({ kind: 'missed-tactic' })
  })
})
