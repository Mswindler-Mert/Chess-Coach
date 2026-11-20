import { hasMessage, t } from '../i18n'
import type { Outcome, TimeClass } from '../core/games/model'
import { formatTimeControl } from '../core/games/timeControl'

const dateFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const dateTimeFormat = new Intl.DateTimeFormat('tr-TR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

export const formatDate = (ms: number) => dateFormat.format(ms)
export const formatDateTime = (ms: number) => dateTimeFormat.format(ms)

export const timeClassLabel = (tc: TimeClass) => t(`timeClass.${tc}`)

export const timeControlLabel = (value: string) =>
  formatTimeControl(value, { minutes: t('units.minutes'), days: t('units.days') })

export function endReasonLabel(code: string): string | null {
  const key = `endReason.${code}`
  return hasMessage(key) ? t(key) : null
}

export const outcomeStyles: Record<Outcome, string> = {
  win: 'bg-emerald-600 text-white',
  loss: 'bg-rose-600 text-white',
  draw: 'bg-slate-500 text-white',
}
