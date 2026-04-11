import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'

type Status = 'good' | 'warn' | 'bad' | 'neutral'

// Canonical display order for positions (best → worst)
const POSITION_ORDER = ['BTN', 'CO', 'HJ', 'MP+1', 'MP', 'UTG+1', 'UTG', 'SB', 'BB']

// Expected BB/100 benchmark ranges per position (6-max cash)
const POSITION_BENCHMARKS: Record<string, { min: number; max: number; label: string }> = {
  BTN: { min: 20,  max: 50,  label: 'Best seat — expect +20 to +50' },
  CO:  { min: 10,  max: 30,  label: 'Strong seat — expect +10 to +30' },
  HJ:  { min: 0,   max: 20,  label: 'Decent seat — expect 0 to +20' },
  'MP+1': { min: -5, max: 15, label: 'Middle — expect -5 to +15' },
  MP:  { min: -5,  max: 15,  label: 'Middle — expect -5 to +15' },
  'UTG+1': { min: -10, max: 10, label: 'Early — expect -10 to +10' },
  UTG: { min: -10, max: 10,  label: 'Hardest seat — expect -10 to +10' },
  SB:  { min: -25, max: -5,  label: 'Always OOP — expect -25 to -5' },
  BB:  { min: -50, max: -20, label: 'Forced blind — expect -50 to -20' },
}

interface PositionStat {
  position: string
  hands: number
  netBb: number
  bbPer100: number
}

function aggregateByPosition(rows: { position: string; result_bb: number }[]): PositionStat[] {
  const map = new Map<string, { hands: number; netBb: number }>()
  for (const row of rows) {
    const pos = row.position
    const cur = map.get(pos) ?? { hands: 0, netBb: 0 }
    map.set(pos, { hands: cur.hands + 1, netBb: cur.netBb + row.result_bb })
  }
  return POSITION_ORDER
    .filter(p => map.has(p))
    .map(p => {
      const { hands, netBb } = map.get(p)!
      return { position: p, hands, netBb, bbPer100: hands > 0 ? (netBb / hands) * 100 : 0 }
    })
}

function vpipStatus(v: number): Status {
  if (v < 15) return 'warn'
  if (v <= 30) return 'good'
  return 'bad'
}
function pfrStatus(pfr: number, vpip: number): Status {
  if (vpip === 0) return 'neutral'
  const r = pfr / vpip
  if (r < 0.4) return 'bad'
  if (r <= 0.85) return 'good'
  return 'warn'
}
function threeBetStatus(v: number): Status {
  if (v < 3) return 'bad'
  if (v <= 8) return 'good'
  return 'warn'
}

function label(status: Status) {
  return status === 'good' ? 'On target' : status === 'warn' ? 'Watch this' : status === 'bad' ? 'Leak' : ''
}

export default async function PreflopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands, vpip, pfr, three_bet_pct, aggression_factor')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  // Positional stats — query all hands and aggregate in JS
  let positionStats: PositionStat[] = []
  if (hasHands) {
    const { data: handRows } = await supabase
      .from('hands')
      .select('position, result_bb')
      .eq('user_id', user!.id)
    if (handRows) {
      positionStats = aggregateByPosition(handRows as { position: string; result_bb: number }[])
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Preflop</h1>
          <p className="text-sm text-zinc-400 mt-0.5">How you play before the flop</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to find your preflop leaks by position." />
        ) : (
          <>
            {/* Primary insight */}
            {(() => {
              const vpip = stats.vpip ?? 0
              const pfr = stats.pfr ?? 0
              const pfrRatio = vpip > 0 ? pfr / vpip : 0
              let insightText = ''
              let insightStatus: Status = 'neutral'

              if (vpip > 30) {
                insightText = 'You play too many hands preflop. Fold more marginal hands, especially out of position.'
                insightStatus = 'bad'
              } else if (pfrRatio < 0.4) {
                insightText = 'You call too much preflop. Convert more calls into raises to take the initiative.'
                insightStatus = 'bad'
              } else if (vpip < 15) {
                insightText = 'You play very tight. Consider expanding your range from the button and cutoff.'
                insightStatus = 'warn'
              } else {
                insightText = 'Preflop fundamentals look solid. Keep an eye on positional balance.'
                insightStatus = 'good'
              }

              return (
                <div className={`rounded-2xl border px-5 py-4 ${
                  insightStatus === 'good' ? 'bg-green-500/10 border-green-500/30' :
                  insightStatus === 'warn' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Main finding</p>
                  <p className="text-sm text-zinc-100 leading-relaxed">{insightText}</p>
                </div>
              )
            })()}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="VPIP"
                value={`${(stats.vpip ?? 0).toFixed(1)}%`}
                sub={label(vpipStatus(stats.vpip ?? 0))}
                status={vpipStatus(stats.vpip ?? 0)}
              />
              <StatCard
                label="PFR"
                value={`${(stats.pfr ?? 0).toFixed(1)}%`}
                sub={label(pfrStatus(stats.pfr ?? 0, stats.vpip ?? 0))}
                status={pfrStatus(stats.pfr ?? 0, stats.vpip ?? 0)}
              />
              <StatCard
                label="3-Bet %"
                value={`${(stats.three_bet_pct ?? 0).toFixed(1)}%`}
                sub={label(threeBetStatus(stats.three_bet_pct ?? 0))}
                status={threeBetStatus(stats.three_bet_pct ?? 0)}
              />
              <StatCard
                label="PFR / VPIP"
                value={`${stats.vpip > 0 ? ((stats.pfr / stats.vpip) * 100).toFixed(0) : 0}%`}
                sub="aggression ratio"
                status={pfrStatus(stats.pfr ?? 0, stats.vpip ?? 0)}
              />
            </div>

            {/* Benchmark guide */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Benchmarks (6-max cash)</p>
              {[
                { label: 'VPIP', range: '20–28%', yours: `${(stats.vpip ?? 0).toFixed(1)}%` },
                { label: 'PFR', range: '15–22%', yours: `${(stats.pfr ?? 0).toFixed(1)}%` },
                { label: '3-Bet', range: '4–8%', yours: `${(stats.three_bet_pct ?? 0).toFixed(1)}%` },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{row.label}</span>
                  <span className="text-zinc-500 text-xs">{row.range}</span>
                  <span className="text-white font-medium">{row.yours}</span>
                </div>
              ))}
            </div>

            {/* Positional win rate */}
            {positionStats.length > 0 && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Win rate by position</p>
                <div className="space-y-2">
                  {positionStats.map(({ position, hands, bbPer100 }) => {
                    const isPos = bbPer100 >= 0
                    const benchmark = POSITION_BENCHMARKS[position]
                    const inRange = benchmark
                      ? bbPer100 >= benchmark.min && bbPer100 <= benchmark.max
                      : isPos

                    // Bar width: scale bbPer100 to a visual width (cap ±60 bb)
                    const barPct = Math.min(Math.abs(bbPer100) / 60, 1) * 100

                    return (
                      <div key={position}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded w-14 text-center">
                              {position}
                            </span>
                            <span className="text-xs text-zinc-500">{hands} hands</span>
                          </div>
                          <span className={`text-sm font-semibold tabular-nums ${
                            isPos ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {isPos ? '+' : ''}{bbPer100.toFixed(1)}
                            <span className="text-xs font-normal text-zinc-500 ml-1">bb/100</span>
                          </span>
                        </div>
                        {/* Mini progress bar */}
                        <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              inRange ? 'bg-green-500' : isPos ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <p className="text-[10px] text-zinc-600 mt-3 leading-relaxed">
                  Green bar = within expected range · Yellow = above expected · Red = below expected
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
