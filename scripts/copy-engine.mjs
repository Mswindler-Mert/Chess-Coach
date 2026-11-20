// Copies the Stockfish engine (lite, single-threaded WASM) from node_modules into public/,
// so Vite serves it as a static file in dev and ships it in the build. The engine runs in a
// Web Worker and loads its .wasm file from the same folder.
import { copyFileSync, mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = join(root, 'node_modules', 'stockfish')
const target = join(root, 'public', 'stockfish')

const files = [
  ['bin/stockfish-19-lite-single.js', 'stockfish.js'],
  ['bin/stockfish-19-lite-single.wasm', 'stockfish.wasm'],
  ['Copying.txt', 'Copying.txt'],
]

mkdirSync(target, { recursive: true })
for (const [from, to] of files) copyFileSync(join(source, from), join(target, to))
console.log(`Stockfish copied to ${target}`)
