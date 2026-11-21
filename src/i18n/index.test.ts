import { describe, expect, it } from 'vitest'
import { hasMessage, t } from './index'
import { CURRICULUM } from '../core/endgames/curriculum'

describe('t', () => {
  it('returns the Turkish string for a key', () => {
    expect(t('app.title')).toBe('Satranç Antrenörü')
  })

  it('fills placeholders from params', () => {
    expect(t('footer.license', { name: 'Satranç Antrenörü' })).toBe(
      'Satranç Antrenörü açık kaynaktır (GPL-3.0). Analiz motoru: Stockfish.',
    )
  })

  it('knows which keys exist', () => {
    expect(hasMessage('endReason.checkmated')).toBe(true)
    expect(hasMessage('endReason.kingofthehill')).toBe(false)
    expect(hasMessage('toString')).toBe(false)
  })

  it('leaves unknown placeholders untouched', () => {
    expect(t('footer.license', {})).toContain('{name}')
  })
})

describe('dynamic endgame keys', () => {
  it('has a title, description and hint for every lesson', () => {
    for (const { id } of CURRICULUM) {
      for (const kind of ['lesson', 'desc', 'hint']) {
        expect(hasMessage(`endgame.${kind}.${id}`), `endgame.${kind}.${id}`).toBe(true)
      }
    }
  })

  it('has a message for every result', () => {
    const success = ['mate', 'forced-mate', 'promoted', 'held', 'rules-draw']
    const fail = ['mated', 'rules-draw', 'advantage-lost', 'lost', 'limit']
    for (const reason of success) expect(hasMessage(`endgame.result.success.${reason}`)).toBe(true)
    for (const reason of fail) expect(hasMessage(`endgame.result.fail.${reason}`)).toBe(true)
  })
})
