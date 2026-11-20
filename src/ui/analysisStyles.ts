import { useSyncExternalStore } from 'react'
import type { MoveClass } from '../core/analysis/types'
import { analysisRunner, type RunnerState } from '../engine/runner'

export function useAnalysisRunner(): RunnerState {
  return useSyncExternalStore(analysisRunner.subscribe, analysisRunner.getState)
}

/** Annotation symbols as in chess books; good and best moves get none. */
export const MOVE_SYMBOLS: Partial<Record<MoveClass, string>> = {
  inaccuracy: '?!',
  mistake: '?',
  blunder: '??',
}

export const MOVE_CLASS_TEXT: Record<MoveClass, string> = {
  best: 'text-emerald-400',
  good: 'text-slate-300',
  inaccuracy: 'text-yellow-300',
  mistake: 'text-orange-400',
  blunder: 'text-rose-400',
}
