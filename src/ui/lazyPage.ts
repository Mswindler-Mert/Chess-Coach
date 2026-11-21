import { lazy, type ComponentType } from 'react'

const RELOAD_FLAG = 'chess-coach:chunk-reload'

/**
 * A page loaded on demand. After a new deploy the old chunk files are gone; a tab still running
 * the old version then fails to load a page, so it reloads once to pick up the new version.
 */
export function lazyPage<P extends object>(
  load: () => Promise<ComponentType<P>>,
): ComponentType<P> {
  return lazy(async () => {
    try {
      const component = await load()
      safeSession(() => sessionStorage.removeItem(RELOAD_FLAG))
      return { default: component }
    } catch (error) {
      const reloaded = safeSession(() => sessionStorage.getItem(RELOAD_FLAG)) === '1'
      if (!reloaded) {
        safeSession(() => sessionStorage.setItem(RELOAD_FLAG, '1'))
        window.location.reload()
        // Keep Suspense waiting while the page reloads.
        return new Promise<never>(() => {})
      }
      throw error
    }
  })
}

function safeSession<T>(action: () => T): T | null {
  try {
    return action()
  } catch {
    return null // storage blocked (private mode, settings)
  }
}
