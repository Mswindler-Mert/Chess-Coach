import { describe, expect, it } from 'vitest'
import {
  buildOpeningSteps,
  guideIdForOpeningFamily,
  OPENING_GUIDES,
  openingLineKey,
} from './guides'

describe('OPENING_GUIDES', () => {
  it('has only legal chess moves and complete bilingual text in every line', () => {
    const ids = new Set<string>()
    for (const guide of OPENING_GUIDES) {
      expect(ids.has(guide.id)).toBe(false)
      ids.add(guide.id)
      expect(guide.name.tr.trim()).not.toBe('')
      expect(guide.name.en.trim()).not.toBe('')
      expect(guide.idea.tr.trim()).not.toBe('')
      expect(guide.idea.en.trim()).not.toBe('')
      expect(guide.pros.length).toBeGreaterThan(0)
      expect(guide.cons.length).toBeGreaterThan(0)
      expect(guide.lines.length).toBeGreaterThan(0)

      const lineIds = new Set<string>()
      for (const line of guide.lines) {
        expect(lineIds.has(line.id)).toBe(false)
        lineIds.add(line.id)
        const steps = buildOpeningSteps(guide, line.id)
        expect(steps.length).toBe(line.moves.length)
        expect(steps.some((s) => s.isUserMove)).toBe(true)
        for (const step of steps) {
          expect(step.note.tr.trim()).not.toBe('')
          expect(step.note.en.trim()).not.toBe('')
          expect(step.uci.length).toBeGreaterThanOrEqual(4)
        }
      }
    }
  })

  it('builds valid step progression for the Italian Giuoco Piano line', () => {
    const italian = OPENING_GUIDES.find((g) => g.id === 'italian')!
    const steps = buildOpeningSteps(italian, 'giuoco-piano')
    expect(steps.map((s) => s.san)).toEqual([
      'e4',
      'e5',
      'Nf3',
      'Nc6',
      'Bc4',
      'Bc5',
      'c3',
      'Nf6',
      'd4',
      'exd4',
      'cxd4',
    ])
    expect(steps[0]?.isUserMove).toBe(true)
    expect(steps[1]?.isUserMove).toBe(false)
    expect(openingLineKey('italian', 'giuoco-piano')).toBe('italian:giuoco-piano')
  })

  it('returns an empty list for an unknown line id', () => {
    const italian = OPENING_GUIDES[0]!
    expect(buildOpeningSteps(italian, 'no-such-line')).toEqual([])
  })

  it('maps common opening family names to interactive guides', () => {
    expect(guideIdForOpeningFamily('Italian Game')).toBe('italian')
    expect(guideIdForOpeningFamily('Caro Kann Defense')).toBe('caro-kann')
    expect(guideIdForOpeningFamily('London System')).toBe('london')
    expect(guideIdForOpeningFamily('Queens Gambit Declined')).toBe('qgd')
    expect(guideIdForOpeningFamily('Alekhines Defense')).toBeNull()
  })
})
