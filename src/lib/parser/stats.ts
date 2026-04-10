import type { ParsedHand } from './models'

export interface UserStats {
  totalHands: number
  vpip: number            // %
  pfr: number             // %
  threeBetPct: number     // %
  aggressionFactor: number
  cbetPct: number         // %
  foldToCbetPct: number   // %
  wtsd: number            // %
  wsd: number             // %
  bbPer100: number
  netResultBb: number
  rakePaidBb: number
}

export function calculateStats(hands: ParsedHand[]): UserStats {
  const zero: UserStats = {
    totalHands: 0, vpip: 0, pfr: 0, threeBetPct: 0,
    aggressionFactor: 0, cbetPct: 0, foldToCbetPct: 0,
    wtsd: 0, wsd: 0, bbPer100: 0, netResultBb: 0, rakePaidBb: 0,
  }
  if (hands.length === 0) return zero

  let vpipCount = 0, pfrCount = 0
  let threeBetCount = 0, threeBetOpps = 0
  let bets = 0, raises = 0, calls = 0
  let cbetCount = 0, cbetOpps = 0
  let foldToCbetCount = 0, foldToCbetOpps = 0
  let wtsdCount = 0, wtsdOpps = 0
  let wsdCount = 0
  let netResultBb = 0, rakePaidBb = 0

  for (const hand of hands) {
    netResultBb += hand.resultBb
    rakePaidBb += hand.rake

    const preflopActions = hand.actions.filter(a => a.street === 'preflop')
    const flopActions = hand.actions.filter(a => a.street === 'flop')

    // VPIP
    if (preflopActions.some(a => ['call', 'raise', 'allin'].includes(a.action))) vpipCount++

    // PFR
    if (hand.preflopAggressor) pfrCount++

    // 3-bet
    if (hand.facedPreflopRaise) {
      threeBetOpps++
      if (hand.madeThreeBet) threeBetCount++
    }

    // Aggression factor raw counts
    for (const a of hand.actions) {
      if (a.action === 'bet') bets++
      else if (a.action === 'raise') raises++
      else if (a.action === 'call') calls++
    }

    // C-bet
    if (hand.preflopAggressor && hand.sawFlop) {
      cbetOpps++
      if (flopActions.some(a => a.action === 'bet')) cbetCount++
    }

    // Fold to c-bet
    if (!hand.preflopAggressor && hand.sawFlop && hand.facedFlopBet) {
      foldToCbetOpps++
      if (flopActions.some(a => a.action === 'fold')) foldToCbetCount++
    }

    // WTSD / W$SD (of hands that reached the flop)
    if (hand.sawFlop) {
      wtsdOpps++
      if (hand.wentToShowdown) {
        wtsdCount++
        if (hand.wonAtShowdown) wsdCount++
      }
    }
  }

  const pct = (n: number, d: number) => d > 0 ? (n / d) * 100 : 0

  return {
    totalHands: hands.length,
    vpip: pct(vpipCount, hands.length),
    pfr: pct(pfrCount, hands.length),
    threeBetPct: pct(threeBetCount, threeBetOpps),
    aggressionFactor: calls > 0 ? (bets + raises) / calls : bets + raises,
    cbetPct: pct(cbetCount, cbetOpps),
    foldToCbetPct: pct(foldToCbetCount, foldToCbetOpps),
    wtsd: pct(wtsdCount, wtsdOpps),
    wsd: pct(wsdCount, wtsdCount),
    bbPer100: (netResultBb / hands.length) * 100,
    netResultBb,
    rakePaidBb,
  }
}

// Merge stats from a new batch with existing stored stats using weighted averages
export function mergeStats(
  existing: { total_hands: number; net_result_bb: number; rake_paid_bb: number;
    vpip: number; pfr: number; three_bet_pct: number; aggression_factor: number;
    cbet_pct: number; fold_to_cbet_pct: number; wtsd: number; wsd: number } | null,
  newStats: UserStats
): Record<string, number | string> {
  if (!existing || existing.total_hands === 0) {
    return {
      total_hands: newStats.totalHands,
      vpip: newStats.vpip,
      pfr: newStats.pfr,
      three_bet_pct: newStats.threeBetPct,
      aggression_factor: newStats.aggressionFactor,
      cbet_pct: newStats.cbetPct,
      fold_to_cbet_pct: newStats.foldToCbetPct,
      wtsd: newStats.wtsd,
      wsd: newStats.wsd,
      bb_per_100: newStats.bbPer100,
      net_result_bb: newStats.netResultBb,
      rake_paid_bb: newStats.rakePaidBb,
      last_calculated_at: new Date().toISOString(),
    }
  }

  const eN = existing.total_hands
  const nN = newStats.totalHands
  const total = eN + nN
  const w = (e: number, n: number) => (e * eN + n * nN) / total

  const mergedNet = existing.net_result_bb + newStats.netResultBb
  const mergedRake = existing.rake_paid_bb + newStats.rakePaidBb

  return {
    total_hands: total,
    vpip: w(existing.vpip, newStats.vpip),
    pfr: w(existing.pfr, newStats.pfr),
    three_bet_pct: w(existing.three_bet_pct, newStats.threeBetPct),
    aggression_factor: w(existing.aggression_factor, newStats.aggressionFactor),
    cbet_pct: w(existing.cbet_pct, newStats.cbetPct),
    fold_to_cbet_pct: w(existing.fold_to_cbet_pct, newStats.foldToCbetPct),
    wtsd: w(existing.wtsd, newStats.wtsd),
    wsd: w(existing.wsd, newStats.wsd),
    bb_per_100: (mergedNet / total) * 100,
    net_result_bb: mergedNet,
    rake_paid_bb: mergedRake,
    last_calculated_at: new Date().toISOString(),
  }
}
