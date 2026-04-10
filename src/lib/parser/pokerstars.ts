import type { GameType, LimitType, Street, ParsedAction, ParsedHand, ParseResult } from './models'

// Position names ordered from SB → BTN for each table size
const POSITIONS: Record<number, string[]> = {
  2: ['BB', 'BTN'],
  3: ['SB', 'BB', 'BTN'],
  4: ['SB', 'BB', 'UTG', 'BTN'],
  5: ['SB', 'BB', 'UTG', 'CO', 'BTN'],
  6: ['SB', 'BB', 'UTG', 'HJ', 'CO', 'BTN'],
  7: ['SB', 'BB', 'UTG', 'UTG+1', 'HJ', 'CO', 'BTN'],
  8: ['SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN'],
  9: ['SB', 'BB', 'UTG', 'UTG+1', 'MP', 'MP+1', 'HJ', 'CO', 'BTN'],
}

function getPosition(heroSeat: number, buttonSeat: number, allSeats: number[]): string {
  const n = Math.min(allSeats.length, 9)
  if (n < 2) return 'BTN'

  const sorted = [...allSeats].sort((a, b) => a - b)
  const btnIdx = sorted.indexOf(buttonSeat)
  if (btnIdx === -1) return 'UTG'

  // Rotate so position 0 = SB (first after button), last = BTN
  const ordered = [...sorted.slice(btnIdx + 1), ...sorted.slice(0, btnIdx + 1)]
  const heroIdx = ordered.indexOf(heroSeat)
  if (heroIdx === -1) return 'UTG'

  const names = POSITIONS[n] ?? POSITIONS[9]
  return names[Math.min(heroIdx, names.length - 1)]
}

function extractSummaryName(summaryLine: string): string {
  // "Seat N: PlayerName (position label) action"
  // Extract name before the first " ("
  const m = summaryLine.match(/^Seat \d+:\s+(.+?)\s+\(/)
  return m ? m[1] : ''
}

function parseHand(block: string): ParsedHand | null {
  const lines = block.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 6) return null

  // ── Header ──────────────────────────────────────────────────────────────────
  const headerMatch = lines[0].match(
    /^PokerStars Hand #(\d+):\s+(?:Tournament .+? )?(.+?)\s+\((\$[\d.]+)\/(\$[\d.]+)/
  )
  if (!headerMatch) return null

  const [, handId, gameStr, sbStr, bbStr] = headerMatch
  const bigBlind = parseFloat(bbStr.replace('$', ''))
  if (!bigBlind) return null

  const stakes = `${sbStr}/${bbStr}`
  const gameType: GameType = gameStr.includes('Omaha') ? 'OMAHA' : 'HOLDEM'
  const limitType: LimitType = gameStr.includes('No Limit') ? 'NL' : gameStr.includes('Pot Limit') ? 'PL' : 'FL'

  const dateMatch = lines[0].match(/(\d{4}\/\d{2}\/\d{2}\s+\d{2}:\d{2}:\d{2})/)
  const playedAt = dateMatch
    ? new Date(dateMatch[1].replace(/\//g, '-').replace(' ', 'T'))
    : new Date()

  // ── Table ────────────────────────────────────────────────────────────────────
  let tableSize = 6
  let buttonSeat = 0
  for (const line of lines) {
    const m = line.match(/^Table '.+?'\s+(\d+)-max\s+Seat #(\d+) is the button/)
    if (m) { tableSize = parseInt(m[1]); buttonSeat = parseInt(m[2]); break }
  }

  // ── Seats ────────────────────────────────────────────────────────────────────
  const seats = new Map<number, string>()
  for (const line of lines) {
    if (line.startsWith('*** HOLE CARDS')) break
    const m = line.match(/^Seat (\d+):\s+(.+?)\s+\(\$?[\d.]+ in chips\)/)
    if (m) seats.set(parseInt(m[1]), m[2])
  }
  if (seats.size === 0) return null

  // ── Hero ─────────────────────────────────────────────────────────────────────
  let heroName: string | null = null
  let holeCards: string | null = null
  for (const line of lines) {
    const m = line.match(/^Dealt to (.+) \[(.+)\]/)
    if (m) { heroName = m[1]; holeCards = m[2]; break }
  }
  if (!heroName) return null

  let heroSeat: number | null = null
  for (const [seat, name] of seats) {
    if (name === heroName) { heroSeat = seat; break }
  }
  if (heroSeat === null) return null

  const position = getPosition(heroSeat, buttonSeat, [...seats.keys()])

  // ── State machine ─────────────────────────────────────────────────────────────
  let currentStreet: Street = 'preflop'
  const heroActions: ParsedAction[] = []
  const streetInvestment: Record<Street, number> = { preflop: 0, flop: 0, turn: 0, river: 0 }
  let heroCollected = 0
  let rake = 0
  let board = ''
  let isAllIn = false
  let wentToShowdown = false
  let wonAtShowdown = false
  let heroFoldedPreflop = false
  let flopDealt = false

  // Stats flags
  let preflopAggressor = false
  let facedFlopBet = false
  let facedPreflopRaise = false
  let madeThreeBet = false
  let preflopRaisesSeen = 0  // by anyone, before hero's preflop action resolved

  let inSummary = false

  for (const line of lines) {
    // ── Section markers ──────────────────────────────────────────────────────
    if (line === '*** HOLE CARDS ***') { currentStreet = 'preflop'; continue }
    if (line.startsWith('*** SHOW DOWN ***')) { wentToShowdown = true; continue }
    if (line.startsWith('*** SUMMARY ***')) { inSummary = true; continue }

    // ── Board from street headers ────────────────────────────────────────────
    if (!inSummary) {
      const flopM = line.match(/^\*\*\* FLOP \*\*\* \[(.+?)\]/)
      if (flopM) { currentStreet = 'flop'; board = flopM[1]; flopDealt = true; continue }

      const turnM = line.match(/^\*\*\* TURN \*\*\* \[.+?\] \[(.+?)\]/)
      if (turnM) { currentStreet = 'turn'; board += ' ' + turnM[1]; continue }

      const riverM = line.match(/^\*\*\* RIVER \*\*\* \[.+?\] \[(.+?)\]/)
      if (riverM) { currentStreet = 'river'; board += ' ' + riverM[1]; continue }
    }

    // ── Summary section ──────────────────────────────────────────────────────
    if (inSummary) {
      // Rake
      const rakeM = line.match(/Total pot \$?[\d.]+.*Rake \$?([\d.]+)/)
      if (rakeM) { rake = parseFloat(rakeM[1]) / bigBlind; continue }

      // Board (for preflop all-ins)
      const boardM = line.match(/^Board \[(.+?)\]/)
      if (boardM && !board) { board = boardM[1]; continue }

      // Hero collected
      if (line.includes('collected')) {
        const collM = line.match(/collected \(\$?([\d.]+)\)/)
        if (collM) {
          const name = extractSummaryName(line)
          if (name === heroName) heroCollected += parseFloat(collM[1])
        }
      }

      // Won at showdown
      if (line.includes('showed') && line.includes('and won')) {
        const name = extractSummaryName(line)
        if (name === heroName) wonAtShowdown = true
      }
      continue
    }

    // ── Blind posts ──────────────────────────────────────────────────────────
    const blindM = line.match(/^(.+): posts (?:small|big) blind \$?([\d.]+)/)
    if (blindM) {
      if (blindM[1] === heroName) {
        streetInvestment.preflop += parseFloat(blindM[2])
      }
      continue
    }

    // ── Skip non-action lines ────────────────────────────────────────────────
    if (line.startsWith('***') || line.startsWith('Dealt to') || line.startsWith('Seat ')) continue

    const colonIdx = line.indexOf(': ')
    if (colonIdx === -1) continue

    const actor = line.substring(0, colonIdx)
    const actionStr = line.substring(colonIdx + 2)
    const isHero = actor === heroName

    if (isHero) {
      // ── Hero action ──────────────────────────────────────────────────────
      if (actionStr.startsWith('folds')) {
        heroActions.push({ street: currentStreet, action: 'fold', amount: 0 })
        if (currentStreet === 'preflop') heroFoldedPreflop = true

      } else if (actionStr.startsWith('checks')) {
        heroActions.push({ street: currentStreet, action: 'check', amount: 0 })

      } else if (actionStr.startsWith('calls')) {
        const m = actionStr.match(/calls \$?([\d.]+)/)
        const amt = m ? parseFloat(m[1]) : 0
        heroActions.push({ street: currentStreet, action: 'call', amount: amt / bigBlind })
        streetInvestment[currentStreet] += amt
        if (actionStr.includes('all-in')) isAllIn = true

      } else if (actionStr.startsWith('bets')) {
        const m = actionStr.match(/bets \$?([\d.]+)/)
        const amt = m ? parseFloat(m[1]) : 0
        heroActions.push({ street: currentStreet, action: 'bet', amount: amt / bigBlind })
        streetInvestment[currentStreet] += amt
        if (actionStr.includes('all-in')) isAllIn = true

      } else if (actionStr.startsWith('raises')) {
        // "raises $X to $Y" — $Y is total investment this street
        const m = actionStr.match(/raises \$?[\d.]+ to \$?([\d.]+)/)
        const toAmt = m ? parseFloat(m[1]) : 0
        streetInvestment[currentStreet] = Math.max(streetInvestment[currentStreet], toAmt)
        heroActions.push({ street: currentStreet, action: 'raise', amount: toAmt / bigBlind })
        if (currentStreet === 'preflop') {
          preflopAggressor = true
          if (preflopRaisesSeen >= 1) madeThreeBet = true
        }
        if (actionStr.includes('all-in')) isAllIn = true

      } else if (actionStr.startsWith('is all-in')) {
        heroActions.push({ street: currentStreet, action: 'allin', amount: 0 })
        isAllIn = true
      }

    } else {
      // ── Opponent action ──────────────────────────────────────────────────
      if (currentStreet === 'preflop' && actionStr.startsWith('raises')) {
        preflopRaisesSeen++
        facedPreflopRaise = true
      }
      if (currentStreet === 'flop' &&
          (actionStr.startsWith('bets') || actionStr.startsWith('raises'))) {
        facedFlopBet = true
      }
    }
  }

  const sawFlop = flopDealt && !heroFoldedPreflop
  const totalInvested = streetInvestment.preflop + streetInvestment.flop +
                        streetInvestment.turn + streetInvestment.river
  const resultBb = (heroCollected - totalInvested) / bigBlind

  return {
    handId,
    gameType,
    limitType,
    stakes,
    tableSize,
    position,
    holeCards,
    board: board.trim() || null,
    actions: heroActions,
    resultBb,
    rake,
    isAllIn,
    wentToShowdown: wentToShowdown || wonAtShowdown,
    wonAtShowdown,
    playedAt,
    preflopAggressor,
    sawFlop,
    facedFlopBet,
    facedPreflopRaise,
    madeThreeBet,
  }
}

export function parseFile(content: string): ParseResult {
  const blocks = content
    .split(/(?=PokerStars Hand #)/g)
    .map(b => b.trim())
    .filter(b => b.startsWith('PokerStars Hand #'))

  const hands: ParsedHand[] = []
  const errors: string[] = []
  let skipped = 0

  for (const block of blocks) {
    try {
      const hand = parseHand(block)
      if (hand) {
        hands.push(hand)
      } else {
        skipped++
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err))
      skipped++
    }
  }

  return { hands, errors, skipped }
}
