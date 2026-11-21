import { describe, expect, it } from 'vitest'
import { en } from './en'
import {
  formatPercent,
  getLanguage,
  hasMessage,
  locale,
  setLanguage,
  t,
  type MessageKey,
} from './index'
import { tr } from './tr'
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

describe('languages', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

  it('uses the same placeholders in Turkish and English', () => {
    const mismatches = (Object.keys(tr) as MessageKey[]).filter(
      (key) => placeholders(tr[key]).join() !== placeholders(en[key]).join(),
    )
    expect(mismatches).toEqual([])
  })

  it('has no empty English strings', () => {
    expect(Object.entries(en).filter(([, text]) => text.trim() === '')).toEqual([])
  })

  it('switches language and formats numbers for it', () => {
    expect(getLanguage()).toBe('tr')
    expect(formatPercent(0.45)).toMatch(/^%\s?45$/)
    setLanguage('en')
    try {
      expect(t('app.title')).toBe('Chess Coach')
      expect(t('games.title', { username: 'x' })).toBe('x’s games')
      expect(formatPercent(0.45)).toBe('45%')
      expect(locale()).toBe('en-GB')
    } finally {
      setLanguage('tr')
    }
    expect(t('app.title')).toBe('Satranç Antrenörü')
  })
})
