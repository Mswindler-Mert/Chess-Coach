export type SoundKind = 'move' | 'capture' | 'check' | 'correct' | 'wrong'

const STORAGE_KEY = 'chess-coach:sound'
const listeners = new Set<() => void>()

function readSaved(): boolean {
  try {
    return globalThis.localStorage?.getItem(STORAGE_KEY) !== 'off'
  } catch {
    return true
  }
}

let enabled = readSaved()
let ctx: AudioContext | null = null

export function isSoundEnabled(): boolean {
  return enabled
}

export function setSoundEnabled(next: boolean): void {
  enabled = next
  try {
    globalThis.localStorage?.setItem(STORAGE_KEY, next ? 'on' : 'off')
  } catch {
    // Storage unavailable; still applies for this session.
  }
  listeners.forEach((fn) => fn())
}

export function subscribeSound(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function tone(
  audio: AudioContext,
  startFreq: number,
  endFreq: number,
  duration: number,
  gainPeak: number,
  offset = 0,
  type: OscillatorType = 'triangle',
): void {
  const now = audio.currentTime + offset
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(startFreq, now)
  if (endFreq !== startFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration)
  gain.gain.setValueAtTime(0.0001, now)
  gain.gain.linearRampToValueAtTime(gainPeak, now + 0.008)
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration)
  osc.connect(gain)
  gain.connect(audio.destination)
  osc.start(now)
  osc.stop(now + duration + 0.01)
}

/** Plays a subtle synthesised chess/feedback sound if sound is enabled. */
export function playSound(kind: SoundKind): void {
  if (!enabled) return
  try {
    const audio = getAudioContext()
    if (!audio) return
    switch (kind) {
      case 'move':
        tone(audio, 280, 140, 0.045, 0.14, 0, 'triangle')
        break
      case 'capture':
        tone(audio, 210, 85, 0.065, 0.22, 0, 'triangle')
        tone(audio, 340, 160, 0.035, 0.09, 0.015, 'sine')
        break
      case 'check':
        tone(audio, 540, 480, 0.07, 0.14, 0, 'sine')
        tone(audio, 720, 680, 0.09, 0.12, 0.055, 'sine')
        break
      case 'correct':
        tone(audio, 523.25, 523.25, 0.09, 0.12, 0, 'sine')
        tone(audio, 659.25, 659.25, 0.1, 0.12, 0.07, 'sine')
        tone(audio, 783.99, 783.99, 0.16, 0.14, 0.14, 'sine')
        break
      case 'wrong':
        tone(audio, 250, 210, 0.11, 0.14, 0, 'triangle')
        tone(audio, 195, 165, 0.16, 0.14, 0.09, 'triangle')
        break
    }
  } catch {
    // Audio playback blocked or unavailable; ignore quietly.
  }
}

/** Chooses the right board sound from a SAN string (e.g. "Nxf7+", "Qh5#", "e4"). */
export function playMoveSan(san: string): void {
  if (san.includes('+') || san.includes('#')) playSound('check')
  else if (san.includes('x')) playSound('capture')
  else playSound('move')
}
