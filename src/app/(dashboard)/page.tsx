import { createClient } from '@/lib/supabase/server'
import UploadZone from '@/components/UploadZone'
import StatCard from '@/components/StatCard'
import ProfitChart from '@/components/ProfitChart'

// ── Stat interpretation ──────────────────────────────────────────────────────

type Status = 'good' | 'warn' | 'bad' | 'neutral'

function vpipStatus(v: number): Status {
  if (v < 15) return 'warn'
  if (v <= 30) return 'good'
  return 'bad'
}

function pfrStatus(pfr: number, vpip: number): Status {
  if (vpip === 0) return 'neutral'
  const ratio = pfr / vpip
  if (ratio < 0.4) return 'bad'   // too passive
  if (ratio <= 0.85) return 'good'
  return 'warn'
}

function afStatus(af: number): Status {
  if (af < 1.5) return 'bad'
  if (af <= 3.5) return 'good'
  return 'warn'
}

function cbetStatus(v: number): Status {
  if (v < 40) return 'bad'
  if (v <= 75) return 'good'
  return 'warn'
}

function foldToCbetStatus(v: number): Status {
  if (v > 60) return 'bad'
  if (v >= 30) return 'good'
  return 'warn'
}

function bbStatus(v: number): Status {
  if (v >= 5) return 'good'
  if (v >= 0) return 'warn'
  return 'bad'
}

// ── Insight generator ────────────────────────────────────────────────────────

interface Insight { text: string; status: Status }

function getInsights(stats: Record<string, number>): Insight[] {
  const insights: Insight[] = []

  const vpip = stats.vpip ?? 0
  const pfr = stats.pfr ?? 0
  const af = stats.aggression_factor ?? 0
  const cbet = stats.cbet_pct ?? 0
  const foldCbet = stats.fold_to_cbet_pct ?? 0
  const wtsd = stats.wtsd ?? 0
  const bb = stats.bb_per_100 ?? 0

  if (vpip > 30) {
    insights.push({ status: 'bad', text: `VPIP of ${vpip.toFixed(0)}% — you're playing too many hands preflop. Tighten your range.` })
  } else if (vpip < 15) {
    insights.push({ status: 'warn', text: `VPIP of ${vpip.toFixed(0)}% — you're very tight. Consider opening more hands in position.` })
  } else {
    insights.push({ status: 'good', text: `VPIP of ${vpip.toFixed(0)}% is in a healthy range.` })
  }

  if (pfr > 0 && vpip > 0 && pfr / vpip < 0.4) {
    insights.push({ status: 'bad', text: `PFR/VPIP ratio of ${(pfr / vpip * 100).toFixed(0)}% — you're calling too much preflop. Raise more.` })
  } else if (foldCbet > 60) {
    insights.push({ status: 'bad', text: `You fold to c-bets ${foldCbet.toFixed(0)}% of the time — opponents can easily bluff you on the flop.` })
  } else if (af < 1.5) {
    insights.push({ status: 'bad', text: `Aggression Factor of ${af.toFixed(2)} — you're too passive postflop. Bet and raise more.` })
  } else if (cbet < 40) {
    insights.push({ status: 'warn', text: `C-bet of ${cbet.toFixed(0)}% is low. Consider following up your preflop raises more often.` })
  } else {
    insights.push({ status: 'good', text: `Postflop aggression looks solid (AF ${af.toFixed(2)}, C-bet ${cbet.toFixed(0)}%).` })
  }

  if (wtsd > 35) {
    insights.push({ status: 'bad', text: `Going to showdown ${wtsd.toFixed(0)}% — too often. You may be calling too light on later streets.` })
  } else if (bb >= 5) {
    insights.push({ status: 'good', text: `Win rate of ${bb >= 0 ? '+' : ''}${bb.toFixed(1)} bb/100 puts you ahead of most players at this stake.` })
  } else if (bb < 0) {
    insights.push({ status: 'bad', text: `Losing at ${bb.toFixed(1)} bb/100. Focus on the leaks above to turn it around.` })
  } else {
    insights.push({ status: 'warn', text: `Breaking even at ${bb.toFixed(1)} bb/100 — there's room to grow.` })
  }

  return insights.slice(0, 3)
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function SummaryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const isDemo = user?.email === process.env.DEMO_USER_EMAIL

  const { data: stats } = await supabase
    .from('user_stats')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  // Chart data (aggregate hands grouped by date)
  let chartData: { date: string; cumulative: number }[] = []
  if (hasHands) {
    const { data: handsForChart } = await supabase
      .from('hands')
      .select('played_at, result_bb')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: true })

    if (handsForChart && handsForChart.length > 0) {
      const byDate = new Map<string, number>()
      for (const h of handsForChart) {
        const date = (h.played_at as string).slice(0, 10)
        byDate.set(date, (byDate.get(date) ?? 0) + (h.result_bb as number))
      }
      let cum = 0
      chartData = [...byDate.entries()].map(([date, daily]) => {
        cum += daily
        return { date, cumulative: Math.round(cum * 10) / 10 }
      })
    }
  }

  return (
    <div className="px-4 pb-4">
      <div className="max-w-sm mx-auto space-y-4">

        {!hasHands ? (
          /* ── Empty state / onboarding ── */
          <>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-5 py-6 text-center">
              <p className="text-lg font-semibold text-white mb-1">Find your leaks</p>
              <p className="text-sm text-zinc-400 leading-relaxed mb-2">
                Upload your PokerStars hand history to see where you win and lose.
              </p>
              <div className="flex flex-col gap-2 text-xs text-zinc-500 mt-3">
                <p>1. Open PokerStars → More → Hand History → Export</p>
                <p>2. Save the .txt file</p>
                <p>3. Upload below</p>
              </div>
            </div>
            <UploadZone />
          </>
        ) : (
          /* ── Dashboard ── */
          <>
            {/* Winning / Losing status */}
            {(() => {
              const bb = stats.bb_per_100 ?? 0
              const isWinning = bb >= 0
              return (
                <div className={`rounded-2xl border px-5 py-4 ${
                  isWinning
                    ? 'bg-green-500/10 border-green-500/30'
                    : 'bg-red-500/10 border-red-500/30'
                }`}>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Overall</p>
                  <p className={`text-2xl font-bold ${isWinning ? 'text-green-400' : 'text-red-400'}`}>
                    {isWinning ? 'Winning' : 'Losing'}
                  </p>
                  <p className={`text-sm mt-1 ${isWinning ? 'text-green-300/70' : 'text-red-300/70'}`}>
                    {bb >= 0 ? '+' : ''}{bb.toFixed(1)} bb/100 &middot; {(stats.total_hands as number).toLocaleString()} hands
                  </p>
                </div>
              )
            })()}

            {/* Key stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="BB / 100"
                value={`${(stats.bb_per_100 ?? 0) >= 0 ? '+' : ''}${(stats.bb_per_100 ?? 0).toFixed(1)}`}
                sub="win rate"
                status={bbStatus(stats.bb_per_100 ?? 0)}
              />
              <StatCard
                label="VPIP"
                value={`${(stats.vpip ?? 0).toFixed(1)}%`}
                sub="hands played"
                status={vpipStatus(stats.vpip ?? 0)}
              />
              <StatCard
                label="PFR"
                value={`${(stats.pfr ?? 0).toFixed(1)}%`}
                sub="preflop raises"
                status={pfrStatus(stats.pfr ?? 0, stats.vpip ?? 0)}
              />
              <StatCard
                label="Aggression"
                value={(stats.aggression_factor ?? 0).toFixed(2)}
                sub="postflop AF"
                status={afStatus(stats.aggression_factor ?? 0)}
              />
            </div>

            {/* Profit chart */}
            {chartData.length > 1 && (
              <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 pt-4 pb-2">
                <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Profit (BB)</p>
                <ProfitChart data={chartData} />
              </div>
            )}

            {/* Key insights */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-3">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Key insights</p>
              {getInsights(stats as Record<string, number>).map((insight, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    insight.status === 'good' ? 'bg-green-400' :
                    insight.status === 'warn' ? 'bg-yellow-400' : 'bg-red-400'
                  }`} />
                  <p className="text-sm text-zinc-200 leading-relaxed">{insight.text}</p>
                </div>
              ))}
            </div>

            {/* Upload more */}
            {!isDemo && (
              <div className="pb-4">
                <UploadZone compact />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
