import type { EngineTransport } from './engine'

/** Stockfish lite (single-threaded WASM), copied into public/ by scripts/copy-engine.mjs. */
export const STOCKFISH_URL = `${import.meta.env.BASE_URL}stockfish/stockfish.js`

/** Runs Stockfish in a Web Worker, never on the main thread. */
export function createWorkerTransport(url: string = STOCKFISH_URL): EngineTransport {
  const worker = new Worker(url)
  return {
    send: (command) => worker.postMessage(command),
    onLine: (listener) => {
      worker.addEventListener('message', (event: MessageEvent) => {
        if (typeof event.data === 'string') listener(event.data)
      })
    },
    onError: (listener) => {
      worker.addEventListener('error', (event) => {
        listener(new Error(event.message || 'Stockfish worker failed'))
      })
    },
    terminate: () => worker.terminate(),
  }
}
