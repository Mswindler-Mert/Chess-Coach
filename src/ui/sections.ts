import type { Route } from './router'

export type Section =
  'overview' | 'games' | 'puzzles' | 'hanging' | 'openings' | 'endgames' | 'dashboard'

export interface SectionStyle {
  /** Subtle ambient background tint for the active page. */
  pageGlow: string
  /** Accent classes for sidebar icon box, active item, and mobile highlight. */
  iconBg: string
  iconText: string
  activeBg: string
  activeBorder: string
  badgeBg: string
  mobileText: string
}

export const SECTION_STYLES: Record<Section, SectionStyle> = {
  overview: {
    pageGlow: 'rgba(234, 179, 8, 0.11)',
    iconBg: 'bg-amber-500/15',
    iconText: 'text-amber-400',
    activeBg: 'bg-amber-500/18 text-amber-100',
    activeBorder: 'border-l-amber-400',
    badgeBg: 'bg-amber-500 text-slate-950',
    mobileText: 'text-amber-400',
  },
  games: {
    pageGlow: 'rgba(56, 189, 248, 0.10)',
    iconBg: 'bg-sky-500/15',
    iconText: 'text-sky-400',
    activeBg: 'bg-sky-500/18 text-sky-100',
    activeBorder: 'border-l-sky-400',
    badgeBg: 'bg-sky-500 text-slate-950',
    mobileText: 'text-sky-400',
  },
  puzzles: {
    pageGlow: 'rgba(249, 115, 22, 0.11)',
    iconBg: 'bg-orange-500/15',
    iconText: 'text-orange-400',
    activeBg: 'bg-orange-500/18 text-orange-100',
    activeBorder: 'border-l-orange-400',
    badgeBg: 'bg-orange-500 text-white',
    mobileText: 'text-orange-400',
  },
  hanging: {
    pageGlow: 'rgba(244, 63, 94, 0.11)',
    iconBg: 'bg-rose-500/15',
    iconText: 'text-rose-400',
    activeBg: 'bg-rose-500/18 text-rose-100',
    activeBorder: 'border-l-rose-400',
    badgeBg: 'bg-rose-500 text-white',
    mobileText: 'text-rose-400',
  },
  openings: {
    pageGlow: 'rgba(16, 185, 129, 0.11)',
    iconBg: 'bg-teal-500/15',
    iconText: 'text-teal-400',
    activeBg: 'bg-teal-500/18 text-teal-100',
    activeBorder: 'border-l-teal-400',
    badgeBg: 'bg-teal-500/25 text-teal-200',
    mobileText: 'text-teal-400',
  },
  endgames: {
    pageGlow: 'rgba(168, 85, 247, 0.11)',
    iconBg: 'bg-violet-500/15',
    iconText: 'text-violet-400',
    activeBg: 'bg-violet-500/18 text-violet-100',
    activeBorder: 'border-l-violet-400',
    badgeBg: 'bg-violet-500 text-white',
    mobileText: 'text-violet-400',
  },
  dashboard: {
    pageGlow: 'rgba(6, 182, 212, 0.10)',
    iconBg: 'bg-cyan-500/15',
    iconText: 'text-cyan-400',
    activeBg: 'bg-cyan-500/18 text-cyan-100',
    activeBorder: 'border-l-cyan-400',
    badgeBg: 'bg-cyan-500 text-slate-950',
    mobileText: 'text-cyan-400',
  },
}

export function activeSection(route: Route): Section | null {
  if (route.name === 'home') return null
  if (route.name === 'game') return 'games'
  return route.name
}
