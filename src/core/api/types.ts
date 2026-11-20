// Shapes returned by the Chess.com Public API (only the fields we use).

export type RawTimeClass = 'bullet' | 'blitz' | 'rapid' | 'daily'

export interface RawPlayer {
  username: string
  rating: number
  /** e.g. win, checkmated, timeout, resigned, stalemate, agreed, repetition, abandoned … */
  result: string
}

export interface RawGame {
  uuid: string
  url: string
  pgn: string
  tcn?: string
  time_class: RawTimeClass
  time_control: string
  end_time: number
  rated: boolean
  /** chess, chess960, oddschess, … */
  rules: string
  initial_setup?: string
  eco?: string
  white: RawPlayer
  black: RawPlayer
}

export interface ArchivesResponse {
  archives: string[]
}

export interface MonthResponse {
  games: RawGame[]
}
