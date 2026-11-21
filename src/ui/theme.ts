import { useSyncExternalStore } from 'react'

export type ThemeId = 'carbon' | 'walnut' | 'forest' | 'amber' | 'obsidian'

export interface ThemeMeta {
  id: ThemeId
  /** Two-tone split circle swatch colours (background half + accent half). */
  swatchBg: string
  swatchAccent: string
  /** Browser status bar / PWA theme-color. */
  metaColor: string
  /** Muted, eye-friendly chessboard square colours. */
  boardDark: string
  boardLight: string
}

export const THEMES: readonly ThemeMeta[] = [
  {
    id: 'carbon',
    swatchBg: '#17191e',
    swatchAccent: '#e85d35',
    metaColor: '#0c0d10',
    boardDark: '#5e6a78',
    boardLight: '#cfd6de',
  },
  {
    id: 'walnut',
    swatchBg: '#1e1915',
    swatchAccent: '#cfa057',
    metaColor: '#14110f',
    boardDark: '#9d7250',
    boardLight: '#decab0',
  },
  {
    id: 'forest',
    swatchBg: '#131d16',
    swatchAccent: '#58a86c',
    metaColor: '#0d130f',
    boardDark: '#658058',
    boardLight: '#d3dcc9',
  },
  {
    id: 'amber',
    swatchBg: '#1c1914',
    swatchAccent: '#e0a63b',
    metaColor: '#12100d',
    boardDark: '#94704c',
    boardLight: '#e0cda8',
  },
  {
    id: 'obsidian',
    swatchBg: '#181c24',
    swatchAccent: '#569cd6',
    metaColor: '#111418',
    boardDark: '#5a6c7d',
    boardLight: '#cdd7e0',
  },
]

const THEME_MAP: Record<ThemeId, ThemeMeta> = {
  carbon: THEMES[0]!,
  walnut: THEMES[1]!,
  forest: THEMES[2]!,
  amber: THEMES[3]!,
  obsidian: THEMES[4]!,
}

const STORAGE_KEY = 'chess-coach:theme'
const listeners = new Set<() => void>()

function isThemeId(value: string | null): value is ThemeId {
  return (
    value === 'carbon' ||
    value === 'walnut' ||
    value === 'forest' ||
    value === 'amber' ||
    value === 'obsidian'
  )
}

function readSaved(): ThemeId {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
    return isThemeId(raw) ? raw : 'carbon'
  } catch {
    return 'carbon'
  }
}

let current: ThemeId = readSaved()

export function getTheme(): ThemeId {
  return current
}

export function applyTheme(id: ThemeId = current): void {
  if (typeof document === 'undefined') return
  document.documentElement.dataset.theme = id
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', THEME_MAP[id].metaColor)
}

export function setTheme(next: ThemeId): void {
  if (next === current) return
  current = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next)
  } catch {
    // Storage unavailable; still applies for this session.
  }
  applyTheme(next)
  listeners.forEach((fn) => fn())
}

export function subscribeTheme(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTheme(): ThemeId {
  return useSyncExternalStore(subscribeTheme, getTheme, getTheme)
}

export function useBoardColors(): {
  darkSquareStyle: { backgroundColor: string }
  lightSquareStyle: { backgroundColor: string }
} {
  const id = useTheme()
  const meta = THEME_MAP[id]
  return {
    darkSquareStyle: { backgroundColor: meta.boardDark },
    lightSquareStyle: { backgroundColor: meta.boardLight },
  }
}
