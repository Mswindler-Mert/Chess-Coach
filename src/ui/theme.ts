import { useSyncExternalStore } from 'react'

export type ThemeId = 'walnut' | 'forest' | 'obsidian'

export interface ThemeMeta {
  id: ThemeId
  /** Swatch colours shown in the theme picker (background + accent). */
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
    id: 'walnut',
    swatchBg: '#1c1714',
    swatchAccent: '#cfa057',
    metaColor: '#14110f',
    boardDark: '#9d7250',
    boardLight: '#decab0',
  },
  {
    id: 'forest',
    swatchBg: '#131b16',
    swatchAccent: '#6fa477',
    metaColor: '#0f1511',
    boardDark: '#658058',
    boardLight: '#d3dcc9',
  },
  {
    id: 'obsidian',
    swatchBg: '#181a1f',
    swatchAccent: '#c48a62',
    metaColor: '#131519',
    boardDark: '#626f7d',
    boardLight: '#cbd2d9',
  },
]

const THEME_MAP: Record<ThemeId, ThemeMeta> = {
  walnut: THEMES[0]!,
  forest: THEMES[1]!,
  obsidian: THEMES[2]!,
}

const STORAGE_KEY = 'chess-coach:theme'
const listeners = new Set<() => void>()

function isThemeId(value: string | null): value is ThemeId {
  return value === 'walnut' || value === 'forest' || value === 'obsidian'
}

function readSaved(): ThemeId {
  try {
    const raw = globalThis.localStorage?.getItem(STORAGE_KEY) ?? null
    return isThemeId(raw) ? raw : 'walnut'
  } catch {
    return 'walnut'
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
