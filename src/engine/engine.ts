import type { PositionRequest } from '../core/analysis/analyzeGame'
import type { PositionEval } from '../core/analysis/types'
import { parseBestMove, parseInfoLine, positionCommand, type InfoLine } from './uci'

/** A UCI engine process: a Web Worker in the browser, the npm module in tests. */
export interface EngineTransport {
  send(command: string): void
  onLine(listener: (line: string) => void): void
  onError?(listener: (error: Error) => void): void
  terminate(): void
}

export interface SearchOptions {
  depth: number
}

type Waiter = {
  onLine: (line: string) => boolean
  reject: (error: Error) => void
}

/**
 * Talks UCI to one engine. Commands are queued, so callers may fire evaluations at will
 * and each one waits for the previous search to finish.
 */
export class UciEngine {
  private waiter: Waiter | null = null
  private queue: Promise<unknown> = Promise.resolve()
  private failure: Error | null = null
  private readonly transport: EngineTransport

  constructor(transport: EngineTransport) {
    this.transport = transport
    transport.onLine((line) => {
      if (this.waiter?.onLine(line)) this.waiter = null
    })
    transport.onError?.((error) => {
      this.failure = error
      this.waiter?.reject(error)
      this.waiter = null
    })
  }

  /** Starts UCI mode and waits until the engine is ready. */
  init(options: Record<string, string | number> = {}): Promise<void> {
    return this.enqueue(async () => {
      await this.request('uci', (line) => line === 'uciok')
      for (const [name, value] of Object.entries(options)) {
        this.transport.send(`setoption name ${name} value ${value}`)
      }
      await this.request('isready', (line) => line === 'readyok')
    })
  }

  /** Tells the engine a new game starts, so old hash entries do not leak in. */
  newGame(): Promise<void> {
    return this.enqueue(async () => {
      this.transport.send('ucinewgame')
      await this.request('isready', (line) => line === 'readyok')
    })
  }

  /** Searches one position to a fixed depth. The score is for the side to move. */
  evaluate(position: PositionRequest, { depth }: SearchOptions): Promise<PositionEval> {
    return this.enqueue(async () => {
      this.transport.send(positionCommand(position.startFen, position.moves))
      let last: InfoLine | null = null
      let bestMove: string | null = null
      await this.request(`go depth ${depth}`, (line) => {
        const info = parseInfoLine(line)
        if (info && info.multipv === 1 && !info.bound) last = info
        const best = parseBestMove(line)
        if (best) bestMove = best.bestMove
        return best !== null
      })
      const final = last as InfoLine | null
      if (!final) throw new Error(`Engine gave no score for ${position.fen}`)
      return { score: final.score, bestMove, pv: final.pv, depth: final.depth }
    })
  }

  terminate(): void {
    this.transport.terminate()
    const error = new Error('Engine terminated')
    this.failure = error
    this.waiter?.reject(error)
    this.waiter = null
  }

  private enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = this.queue.then(task)
    this.queue = run.catch(() => undefined)
    return run
  }

  /** Sends `command` and resolves on the first line for which `done` returns true. */
  private request(command: string, done: (line: string) => boolean): Promise<void> {
    if (this.failure) return Promise.reject(this.failure)
    return new Promise<void>((resolve, reject) => {
      this.waiter = {
        onLine: (line) => {
          if (!done(line)) return false
          resolve()
          return true
        },
        reject,
      }
      this.transport.send(command)
    })
  }
}
