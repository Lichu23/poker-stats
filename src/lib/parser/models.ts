export type GameType = 'HOLDEM' | 'OMAHA'
export type LimitType = 'NL' | 'PL' | 'FL'
export type Street = 'preflop' | 'flop' | 'turn' | 'river'
export type ActionType = 'fold' | 'check' | 'call' | 'bet' | 'raise' | 'allin'

export interface ParsedAction {
  street: Street
  action: ActionType
  amount: number  // in big blinds
}

export interface ParsedHand {
  // Stored in DB
  handId: string
  gameType: GameType
  limitType: LimitType
  stakes: string
  tableSize: number
  position: string
  holeCards: string | null
  board: string | null
  actions: ParsedAction[]
  resultBb: number
  rake: number          // in big blinds
  isAllIn: boolean
  wentToShowdown: boolean
  wonAtShowdown: boolean
  playedAt: Date

  // Computed during parsing — used for stats aggregation only
  preflopAggressor: boolean   // hero raised preflop
  sawFlop: boolean            // hero was in the hand when flop came
  facedFlopBet: boolean       // opponent bet on flop while hero was still in
  facedPreflopRaise: boolean  // someone raised before hero had a chance to 3-bet
  madeThreeBet: boolean       // hero re-raised preflop
}

export interface ParseResult {
  hands: ParsedHand[]
  errors: string[]
  skipped: number
}
