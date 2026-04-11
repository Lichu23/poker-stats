import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'

type Status = 'good' | 'warn' | 'bad' | 'neutral'

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
          </>
        )}
      </div>
    </div>
  )
}
