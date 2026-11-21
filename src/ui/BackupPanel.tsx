import { useRef, useState, type ChangeEvent } from 'react'
import { readBackup } from '../core/backup/backup'
import { dayKey } from '../core/training/daily'
import { exportBackup, importBackup } from '../db/backup'
import { t } from '../i18n'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy' }
  | { kind: 'exported'; analyses: number }
  | { kind: 'imported'; analyses: number; progress: number }
  | { kind: 'error'; message: string }

/** Download all analyses and progress as a file, or load one from another device. */
export function BackupPanel({ onImported }: { onImported: () => void }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileInput = useRef<HTMLInputElement>(null)

  async function onExport() {
    setStatus({ kind: 'busy' })
    try {
      const backup = await exportBackup(Date.now())
      const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `chess-coach-backup-${dayKey(new Date())}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
      setStatus({ kind: 'exported', analyses: backup.analyses.length })
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = '' // the same file can be picked again
    if (!file) return
    setStatus({ kind: 'busy' })
    const checked = readBackup(await file.text())
    if (!checked.ok) {
      setStatus({ kind: 'error', message: t(`backup.error.${checked.error}`) })
      return
    }
    try {
      const result = await importBackup(checked.backup)
      setStatus({ kind: 'imported', analyses: result.analyses, progress: result.puzzleProgress })
      onImported()
    } catch (error) {
      setStatus({ kind: 'error', message: error instanceof Error ? error.message : String(error) })
    }
  }

  return (
    <details className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm">
      <summary className="cursor-pointer font-semibold select-none">{t('backup.title')}</summary>
      <div className="mt-3 flex flex-col gap-3">
        <p className="text-slate-400">{t('backup.intro')}</p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={status.kind === 'busy'}
            onClick={() => void onExport()}
            className="min-h-10 rounded-lg bg-emerald-600 px-4 font-semibold text-white hover:bg-emerald-500 disabled:opacity-40"
          >
            {t('backup.export')}
          </button>
          <button
            type="button"
            disabled={status.kind === 'busy'}
            onClick={() => fileInput.current?.click()}
            className="min-h-10 rounded-lg border border-slate-600 px-4 font-medium hover:border-slate-400 disabled:opacity-40"
          >
            {t('backup.import')}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => void onFile(e)}
          />
        </div>
        {status.kind === 'exported' && (
          <p className="text-emerald-300" role="status">
            {t('backup.exported', { count: status.analyses })}
          </p>
        )}
        {status.kind === 'imported' && (
          <p className="text-emerald-300" role="status">
            {t('backup.imported', { analyses: status.analyses, progress: status.progress })}
          </p>
        )}
        {status.kind === 'error' && (
          <p className="text-rose-400" role="alert">
            {status.message}
          </p>
        )}
      </div>
    </details>
  )
}
