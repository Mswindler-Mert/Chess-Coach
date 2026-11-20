import { UciEngine } from './engine'
import { createWorkerTransport } from './worker'

const ENGINE_OPTIONS = { Hash: 32 }

let shared: Promise<UciEngine> | null = null

/**
 * The one Stockfish worker the app uses, for background analysis and puzzle checks alike.
 * Its command queue interleaves requests, so a puzzle check waits at most one position.
 */
export function getSharedEngine(): Promise<UciEngine> {
  if (!shared) {
    const engine = new UciEngine(createWorkerTransport())
    const ready = engine.init(ENGINE_OPTIONS).then(() => engine)
    // A failed start is not cached, so the next call tries again.
    ready.catch(() => {
      if (shared === ready) shared = null
    })
    shared = ready
  }
  return shared
}

/** Stops the worker after an error; the next call starts a fresh one. */
export function resetSharedEngine(): void {
  const current = shared
  shared = null
  void current?.then((engine) => engine.terminate()).catch(() => undefined)
}
