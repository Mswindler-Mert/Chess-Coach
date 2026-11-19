import { describe, expect, it } from 'vitest'
import { t } from './index'

describe('t', () => {
  it('returns the Turkish string for a key', () => {
    expect(t('app.title')).toBe('Satranç Antrenörü')
  })

  it('fills placeholders from params', () => {
    expect(t('footer.license', { name: 'Satranç Antrenörü' })).toBe(
      'Satranç Antrenörü açık kaynaktır (GPL-3.0). Analiz motoru: Stockfish.',
    )
  })

  it('leaves unknown placeholders untouched', () => {
    expect(t('footer.license', {})).toContain('{name}')
  })
})
