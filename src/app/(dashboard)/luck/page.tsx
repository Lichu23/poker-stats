import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/EmptyState'
import {
  parseCards,
  getHandStrength,
  estimateEquity,
  getAllInStreet,
  boardAtStreet,
  classifyHand,
  type NotableType,
} from '@/lib/poker/evaluate'

// ── Types ─────────────────────────────────────────────────────────────────────

type ParsedAction = { street: string; action: string; amount: number }

interface AllInHandRow {
  position: string
  hole_cards: string | null
  board: string | null
  actions: ParsedAction[]
  result_bb: number
  went_to_showdown: boolean
  won_at_showdown: boolean
}

interface AnalyzedAllIn {
  position: string
  holeCards: string
  board: string | null
  allInStreet: string
  equity: number          // 0.0–1.0
  resultBb: number
  wentToShowdown: boolean
  wonAtShowdown: boolean
  finalHandName: string | null
  notableType: NotableType | null
}

// ── Analysis ──────────────────────────────────────────────────────────────────

function analyzeAllIns(rows: AllInHandRow[]): AnalyzedAllIn[] {
  return rows
    .filter(r => r.hole_cards)
    .map(r => {
      const holeCards = r.hole_cards!
      const holeArr  = parseCards(holeCards)
      const allInStreet = getAllInStreet(r.actions)
      const knownBoard  = boardAtStreet(r.board, allInStreet)
      const equity      = estimateEquity(holeArr, knownBoard)

      // Final hand (for showdown hands) using all community cards
      let finalHandName: string | null = null
      let finalHandRank = 0
      if (r.went_to_showdown && r.board) {
        const allCards = [...holeArr, ...parseCards(r.board)]
        const result   = getHandStrength(allCards)
        if (result) { finalHandName = result.name; finalHandRank = result.rank }
      }

      const notableType = r.went_to_showdown
        ? classifyHand(equity, r.won_at_showdown, finalHandRank)
        : null

      return {
        position: r.position,
        holeCards,
        board: r.board,
        allInStreet,
        equity,
        resultBb: r.result_bb,
        wentToShowdown: r.went_to_showdown,
        wonAtShowdown: r.won_at_showdown,
        finalHandName,
        notableType,
      }
    })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOTABLE_LABELS: Record<NotableType, { label: string; color: string; bg: string }> = {
  bad_beat: { label: 'Bad beat',  color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20' },
  cooler:   { label: 'Cooler',    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20' },
  suckout:  { label: 'Suckout',   color: 'text-green-400',  bg: 'bg-green-500/10 border-green-500/20' },
}

function Street({ s }: { s: string }) {
  const labels: Record<string, string> = {
    preflop: 'PF', flop: 'Flop', turn: 'Turn', river: 'River',
  }
  return <span className="text-[10px] text-zinc-600 uppercase">{labels[s] ?? s}</span>
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function LuckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands, net_result_bb, rake_paid_bb, bb_per_100, wtsd, wsd')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  // All-in hands — fetch with full detail for analysis
  let analyzed: AnalyzedAllIn[] = []
  if (hasHands) {
    const { data: allInRows } = await supabase
      .from('hands')
      .select('position, hole_cards, board, actions, result_bb, went_to_showdown, won_at_showdown')
      .eq('user_id', user!.id)
      .eq('is_all_in', true)

    if (allInRows && allInRows.length > 0) {
      analyzed = analyzeAllIns(allInRows as AllInHandRow[])
    }
  }

  // Aggregate all-in stats
  const totalAllIns = analyzed.length
  const netBbAllIns = analyzed.reduce((s, h) => s + h.resultBb, 0)
  const showdownAllIns = analyzed.filter(h => h.wentToShowdown)
  const allInWinRate  = showdownAllIns.length > 0
    ? (showdownAllIns.filter(h => h.wonAtShowdown).length / showdownAllIns.length) * 100
    : null

  // EV luck: sum of (equity - 0.5) per hand that went to showdown
  // Positive = got money in good overall, negative = got money in bad
  const avgEquity = showdownAllIns.length > 0
    ? showdownAllIns.reduce((s, h) => s + h.equity, 0) / showdownAllIns.length
    : null

  const notableHands = analyzed.filter(h => h.notableType !== null)

  return (
    <div className="px-4">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Luck vs Skill</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Separate variance from your actual edge</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to separate luck from skill." />
        ) : (
          <>
            {/* ── Overall results ──────────────────────────────────────────── */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Overall results</p>

              {[
                {
                  label: 'Net result',
                  value: `${(stats.net_result_bb ?? 0) >= 0 ? '+' : ''}${(stats.net_result_bb ?? 0).toFixed(1)} BB`,
                  color: (stats.net_result_bb ?? 0) >= 0 ? 'text-green-400' : 'text-red-400',
                },
                {
                  label: 'Rake paid',
                  value: `-${(stats.rake_paid_bb ?? 0).toFixed(1)} BB`,
                  color: 'text-red-400',
                },
                {
                  label: 'Result before rake',
                  value: (() => {
                    const v = (stats.net_result_bb ?? 0) + (stats.rake_paid_bb ?? 0)
                    return `${v >= 0 ? '+' : ''}${v.toFixed(1)} BB`
                  })(),
                  color: ((stats.net_result_bb ?? 0) + (stats.rake_paid_bb ?? 0)) >= 0
                    ? 'text-green-400' : 'text-red-400',
                },
                {
                  label: 'Showdown win rate',
                  value: `${(stats.wsd ?? 0).toFixed(1)}%`,
                  color: (stats.wsd ?? 0) >= 50 ? 'text-green-400' : 'text-red-400',
                },
              ].map((row, i, arr) => (
                <div key={row.label}
                  className={`flex justify-between items-center py-2 ${i < arr.length - 1 ? 'border-b border-zinc-800' : ''}`}
                >
                  <span className="text-sm text-zinc-400">{row.label}</span>
                  <span className={`font-semibold text-sm ${row.color}`}>{row.value}</span>
                </div>
              ))}
            </div>

            {/* ── All-in situations ────────────────────────────────────────── */}
            {totalAllIns > 0 ? (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">All-in situations</p>

                {/* Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-zinc-800 rounded-xl px-3 py-3 text-center">
                    <p className="text-xl font-bold text-white">{totalAllIns}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">All-ins</p>
                  </div>
                  <div className="bg-zinc-800 rounded-xl px-3 py-3 text-center">
                    <p className={`text-xl font-bold ${netBbAllIns >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {netBbAllIns >= 0 ? '+' : ''}{netBbAllIns.toFixed(1)}
                    </p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Net BB</p>
                  </div>
                </div>

                {/* Win rate bar */}
                {allInWinRate !== null && (
                  <div>
                    <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
                      <span>Win rate at showdown</span>
                      <span className={`font-semibold ${allInWinRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                        {allInWinRate.toFixed(0)}%
                        <span className="text-zinc-600 font-normal ml-1">({showdownAllIns.length})</span>
                      </span>
                    </div>
                    <div className="h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                      <div className="absolute top-0 bottom-0 left-1/2 w-px bg-zinc-600 z-10" />
                      <div
                        className={`h-full rounded-full ${allInWinRate >= 50 ? 'bg-green-500' : 'bg-red-500'}`}
                        style={{ width: `${allInWinRate}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-zinc-600 mt-1">
                      <span>0%</span><span>50% neutral</span><span>100%</span>
                    </div>
                  </div>
                )}

                {/* Avg equity */}
                {avgEquity !== null && (
                  <div className={`rounded-xl px-3 py-3 ${
                    avgEquity >= 0.52
                      ? 'bg-green-500/10 border border-green-500/20'
                      : avgEquity <= 0.48
                      ? 'bg-red-500/10 border border-red-500/20'
                      : 'bg-zinc-800 border border-zinc-700'
                  }`}>
                    <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Average equity at all-in</p>
                    <p className={`text-2xl font-bold ${
                      avgEquity >= 0.52 ? 'text-green-400' : avgEquity <= 0.48 ? 'text-red-400' : 'text-white'
                    }`}>
                      {(avgEquity * 100).toFixed(0)}%
                    </p>
                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {avgEquity >= 0.55
                        ? 'Getting money in as a significant favorite — solid all-in decisions.'
                        : avgEquity >= 0.52
                        ? 'Getting money in as a slight favorite — good all-in spots.'
                        : avgEquity >= 0.48
                        ? 'Getting money in roughly neutral — close all-in decisions.'
                        : avgEquity >= 0.45
                        ? 'Getting money in as a slight underdog — review your all-in spots.'
                        : 'Getting money in as a significant underdog — avoid these spots.'}
                    </p>
                  </div>
                )}

                {/* Per-hand breakdown */}
                {showdownAllIns.length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-600 uppercase tracking-wide mb-2">Hand breakdown</p>
                    <div className="space-y-2">
                      {analyzed.map((h, i) => (
                        <div key={i} className="bg-zinc-800 rounded-xl px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="text-[10px] font-mono text-zinc-300 bg-zinc-700 px-1.5 py-0.5 rounded shrink-0">
                                {h.position}
                              </span>
                              <span className="text-xs font-mono text-zinc-400 truncate">{h.holeCards}</span>
                              <Street s={h.allInStreet} />
                            </div>
                            <span className={`text-xs font-semibold shrink-0 ${
                              h.resultBb > 0 ? 'text-green-400' : h.resultBb < 0 ? 'text-red-400' : 'text-zinc-400'
                            }`}>
                              {h.resultBb > 0 ? '+' : ''}{h.resultBb.toFixed(1)} BB
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1.5">
                            <div className="flex items-center gap-2">
                              {/* Equity bar */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-16 h-1 bg-zinc-700 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${h.equity >= 0.5 ? 'bg-green-500' : 'bg-red-500'}`}
                                    style={{ width: `${h.equity * 100}%` }}
                                  />
                                </div>
                                <span className={`text-[10px] font-medium ${
                                  h.equity >= 0.5 ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  {(h.equity * 100).toFixed(0)}% eq
                                </span>
                              </div>
                              {h.finalHandName && (
                                <span className="text-[10px] text-zinc-600">{h.finalHandName}</span>
                              )}
                            </div>
                            {h.notableType && (
                              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                                h.notableType === 'bad_beat'
                                  ? 'text-red-400 bg-red-500/10'
                                  : h.notableType === 'cooler'
                                  ? 'text-orange-400 bg-orange-500/10'
                                  : 'text-green-400 bg-green-500/10'
                              }`}>
                                {NOTABLE_LABELS[h.notableType].label}
                              </span>
                            )}
                            {!h.wentToShowdown && (
                              <span className="text-[10px] text-zinc-600">No showdown</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-zinc-700 mt-2">
                      Equity estimated via Monte Carlo simulation vs random opponent range
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">All-in situations</p>
                <p className="text-sm text-zinc-400">No all-in hands recorded yet.</p>
              </div>
            )}

            {/* ── Notable hands ─────────────────────────────────────────────── */}
            {notableHands.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
                <p className="text-xs text-zinc-500 uppercase tracking-wide">Notable hands</p>
                {notableHands.map((h, i) => {
                  const meta = NOTABLE_LABELS[h.notableType!]
                  return (
                    <div key={i} className={`rounded-xl border px-3 py-3 ${meta.bg}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                        <span className={`text-sm font-bold ${
                          h.resultBb > 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          {h.resultBb > 0 ? '+' : ''}{h.resultBb.toFixed(1)} BB
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300">
                        <span className="font-mono bg-zinc-800/80 px-1 py-0.5 rounded mr-1">{h.position}</span>
                        {h.holeCards}
                        {h.finalHandName && ` → ${h.finalHandName}`}
                        {' '}· equity {(h.equity * 100).toFixed(0)}%
                        {' '}· {h.wonAtShowdown ? 'won' : 'lost'}
                      </p>
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Showdown health ───────────────────────────────────────────── */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Showdown health</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {(stats.wsd ?? 0) < 48
                  ? 'Winning less than 50% at showdown — you may be calling too lightly on the river. Tighten your showdown range.'
                  : (stats.wsd ?? 0) > 58
                  ? 'Winning over 58% at showdown — excellent hand selection. You only go to showdown with strong holdings.'
                  : 'Showdown stats look healthy. Any variance is likely short-term and should even out over time.'
                }
              </p>
              {(stats.wtsd ?? 0) > 35 && (
                <p className="text-sm text-zinc-300 leading-relaxed mt-2">
                  Going to showdown {(stats.wtsd ?? 0).toFixed(0)}% of flops — this is high. Consider folding more on the turn and river.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
