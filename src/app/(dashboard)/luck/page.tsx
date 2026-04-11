import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/EmptyState'

export default async function LuckPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands, net_result_bb, rake_paid_bb, bb_per_100, wtsd, wsd')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Luck vs Skill</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Separate variance from your actual skill edge</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to separate luck from skill." />
        ) : (
          <>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4 space-y-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide">Your numbers</p>

              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Net result</span>
                <span className={`font-semibold text-sm ${
                  (stats.net_result_bb ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {(stats.net_result_bb ?? 0) >= 0 ? '+' : ''}{(stats.net_result_bb ?? 0).toFixed(1)} BB
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Rake paid</span>
                <span className="font-semibold text-sm text-red-400">
                  -{(stats.rake_paid_bb ?? 0).toFixed(1)} BB
                </span>
              </div>

              <div className="flex justify-between items-center py-2 border-b border-zinc-800">
                <span className="text-sm text-zinc-400">Result before rake</span>
                <span className={`font-semibold text-sm ${
                  ((stats.net_result_bb ?? 0) + (stats.rake_paid_bb ?? 0)) >= 0 ? 'text-green-400' : 'text-red-400'
                }`}>
                  {((stats.net_result_bb ?? 0) + (stats.rake_paid_bb ?? 0)) >= 0 ? '+' : ''}
                  {((stats.net_result_bb ?? 0) + (stats.rake_paid_bb ?? 0)).toFixed(1)} BB
                </span>
              </div>

              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-zinc-400">Showdown win rate</span>
                <span className="font-semibold text-sm text-white">
                  {(stats.wsd ?? 0).toFixed(1)}%
                </span>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-3">What this means</p>
              <p className="text-sm text-zinc-300 leading-relaxed">
                {(stats.wsd ?? 0) < 48
                  ? 'Winning less than 50% at showdown suggests you may be going to showdown with weak hands — tighten your calling range on the river.'
                  : (stats.wsd ?? 0) > 58
                  ? 'Winning over 58% at showdown is very strong — your hand selection at showdown is excellent.'
                  : 'Showdown stats look healthy. Any losses are more likely due to variance or rake than fundamental errors.'
                }
              </p>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Coming in a future update</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                All-in EV vs actual results, bad beat detection, and suckout tracking will be added once session data is collected.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
