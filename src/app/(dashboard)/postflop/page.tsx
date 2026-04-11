import { createClient } from '@/lib/supabase/server'
import StatCard from '@/components/StatCard'
import EmptyState from '@/components/EmptyState'

type Status = 'good' | 'warn' | 'bad' | 'neutral'

function afStatus(v: number): Status {
  if (v < 1.5) return 'bad'
  if (v <= 3.5) return 'good'
  return 'warn'
}
function cbetStatus(v: number): Status {
  if (v < 40) return 'bad'
  if (v <= 75) return 'good'
  return 'warn'
}
function foldCbetStatus(v: number): Status {
  if (v > 60) return 'bad'
  if (v >= 30) return 'good'
  return 'warn'
}
function wtsdStatus(v: number): Status {
  if (v < 20) return 'warn'
  if (v <= 32) return 'good'
  return 'bad'
}
function wsdStatus(v: number): Status {
  if (v < 48) return 'bad'
  if (v <= 58) return 'good'
  return 'warn'
}

function label(status: Status) {
  return status === 'good' ? 'On target' : status === 'warn' ? 'Watch this' : status === 'bad' ? 'Leak' : ''
}

export default async function PostflopPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands, aggression_factor, cbet_pct, fold_to_cbet_pct, wtsd, wsd')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Postflop</h1>
          <p className="text-sm text-zinc-400 mt-0.5">How you play after the flop</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to analyze your postflop tendencies." />
        ) : (
          <>
            {/* Primary insight */}
            {(() => {
              const af = stats.aggression_factor ?? 0
              const foldCbet = stats.fold_to_cbet_pct ?? 0
              const cbet = stats.cbet_pct ?? 0

              let insightText = ''
              let insightStatus: Status = 'neutral'

              if (foldCbet > 60) {
                insightText = `Folding to c-bets ${foldCbet.toFixed(0)}% of the time — opponents can exploit you with frequent bluffs on the flop.`
                insightStatus = 'bad'
              } else if (af < 1.5) {
                insightText = `Aggression Factor of ${af.toFixed(2)} is very low. You're calling too much postflop — bet and raise to take initiative.`
                insightStatus = 'bad'
              } else if (cbet < 40) {
                insightText = `C-bet of ${cbet.toFixed(0)}% is low. Follow up your preflop raises more often to maintain pressure.`
                insightStatus = 'warn'
              } else {
                insightText = 'Postflop play looks balanced. Keep maintaining pressure and defending appropriately.'
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
                label="Aggression (AF)"
                value={(stats.aggression_factor ?? 0).toFixed(2)}
                sub={label(afStatus(stats.aggression_factor ?? 0))}
                status={afStatus(stats.aggression_factor ?? 0)}
              />
              <StatCard
                label="C-Bet %"
                value={`${(stats.cbet_pct ?? 0).toFixed(1)}%`}
                sub={label(cbetStatus(stats.cbet_pct ?? 0))}
                status={cbetStatus(stats.cbet_pct ?? 0)}
              />
              <StatCard
                label="Fold to C-Bet"
                value={`${(stats.fold_to_cbet_pct ?? 0).toFixed(1)}%`}
                sub={label(foldCbetStatus(stats.fold_to_cbet_pct ?? 0))}
                status={foldCbetStatus(stats.fold_to_cbet_pct ?? 0)}
              />
              <StatCard
                label="WTSD"
                value={`${(stats.wtsd ?? 0).toFixed(1)}%`}
                sub={label(wtsdStatus(stats.wtsd ?? 0))}
                status={wtsdStatus(stats.wtsd ?? 0)}
              />
              <StatCard
                label="W$SD"
                value={`${(stats.wsd ?? 0).toFixed(1)}%`}
                sub={label(wsdStatus(stats.wsd ?? 0))}
                status={wsdStatus(stats.wsd ?? 0)}
              />
            </div>

            {/* Benchmark guide */}
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-2">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Benchmarks (6-max cash)</p>
              {[
                { label: 'AF', range: '2–3.5', yours: (stats.aggression_factor ?? 0).toFixed(2) },
                { label: 'C-Bet', range: '50–70%', yours: `${(stats.cbet_pct ?? 0).toFixed(1)}%` },
                { label: 'Fold to C-Bet', range: '35–55%', yours: `${(stats.fold_to_cbet_pct ?? 0).toFixed(1)}%` },
                { label: 'WTSD', range: '23–29%', yours: `${(stats.wtsd ?? 0).toFixed(1)}%` },
                { label: 'W$SD', range: '50–56%', yours: `${(stats.wsd ?? 0).toFixed(1)}%` },
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
