import { Hand } from 'pokersolver'

// ── Deck ─────────────────────────────────────────────────────────────────────

const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A']
const SUITS = ['h','d','c','s']
const FULL_DECK: string[] = RANKS.flatMap(r => SUITS.map(s => r + s))

export function parseCards(str: string): string[] {
  return str.trim().split(/\s+/).filter(Boolean)
}

function buildDeck(exclude: string[]): string[] {
  const known = new Set(exclude)
  return FULL_DECK.filter(c => !known.has(c))
}

function shuffle(deck: string[]): string[] {
  const arr = [...deck]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ── Hand evaluation ───────────────────────────────────────────────────────────

// pokersolver hand ranks:
//   1 = High Card, 2 = Pair, 3 = Two Pair, 4 = Three of a Kind,
//   5 = Straight, 6 = Flush, 7 = Full House, 8 = Four of a Kind,
//   9 = Straight Flush, 10 = Royal Flush

export function getHandStrength(cards: string[]): { name: string; rank: number } | null {
  if (cards.length < 5) return null
  try {
    const hand = Hand.solve(cards)
    return { name: hand.name, rank: hand.rank }
  } catch {
    return null
  }
}

// ── Equity via Monte Carlo ────────────────────────────────────────────────────

// heroHole: ['Ah', 'Kd']
// boardAtAllIn: community cards that were known when hero went all-in (0–5)
// Returns hero's equity as a fraction 0.0–1.0
export function estimateEquity(
  heroHole: string[],
  boardAtAllIn: string[],
  samples = 600
): number {
  const knownCards = [...heroHole, ...boardAtAllIn]
  const deck = buildDeck(knownCards)
  const cardsNeeded = 5 - boardAtAllIn.length  // remaining community cards

  let wins = 0, ties = 0, total = 0

  for (let i = 0; i < samples; i++) {
    const s = shuffle(deck)
    const runoutBoard = [...boardAtAllIn, ...s.slice(0, cardsNeeded)]
    const oppHole = s.slice(cardsNeeded, cardsNeeded + 2)
    if (oppHole.length < 2) continue

    try {
      const heroHand = Hand.solve([...heroHole, ...runoutBoard])
      const oppHand  = Hand.solve([...oppHole,  ...runoutBoard])
      const winners  = Hand.winners([heroHand, oppHand])

      if (winners.length === 2) {
        ties++
      } else if (winners[0] === heroHand) {
        wins++
      }
      total++
    } catch {
      // Skip invalid combos (e.g. duplicate cards from bad data)
    }
  }

  return total > 0 ? (wins + ties * 0.5) / total : 0.5
}

// ── All-in street detection ───────────────────────────────────────────────────

type ParsedAction = { street: string; action: string; amount: number }

export function getAllInStreet(actions: ParsedAction[]): string {
  // Explicit 'allin' action wins
  const explicit = actions.find(a => a.action === 'allin')
  if (explicit) return explicit.street
  // Otherwise: last non-fold action's street
  const last = [...actions].reverse().find(a => a.action !== 'fold')
  return last?.street ?? 'preflop'
}

// Returns board cards that were visible when the all-in happened
export function boardAtStreet(board: string | null, street: string): string[] {
  if (!board) return []
  const cards = parseCards(board)
  if (street === 'preflop') return []
  if (street === 'flop')    return cards.slice(0, 3)
  if (street === 'turn')    return cards.slice(0, 4)
  return cards.slice(0, 5)  // river
}

// ── Notable hand classification ───────────────────────────────────────────────

export type NotableType = 'bad_beat' | 'cooler' | 'suckout'

// equity: hero's equity at all-in moment (0.0–1.0)
// wonAtShowdown: whether hero won
// finalHandRank: pokersolver rank of hero's best hand at showdown
export function classifyHand(
  equity: number,
  wonAtShowdown: boolean,
  finalHandRank: number
): NotableType | null {
  if (!wonAtShowdown) {
    if (equity >= 0.70) return 'bad_beat'  // was 70%+ fav and lost
    if (finalHandRank >= 6) return 'cooler' // flush+ and still lost (both had monsters)
  } else {
    if (equity <= 0.30) return 'suckout'   // was 30%- underdog and won
  }
  return null
}
