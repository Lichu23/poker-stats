import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/EmptyState'

export default async function HandsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  const { data: hands } = hasHands ? await supabase
    .from('hands')
    .select('id, hand_id, position, stakes, hole_cards, result_bb, went_to_showdown, won_at_showdown, is_all_in, played_at')
    .eq('user_id', user!.id)
    .order('played_at', { ascending: false })
    .limit(50)
    : { data: null }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Hands</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your last {hands?.length ?? 0} hands</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to browse your hands." />
        ) : (
          <div className="space-y-2">
            {hands?.map(hand => {
              const result = hand.result_bb as number
              const displayed = result.toFixed(1)
              const isWin = displayed !== '0.0' && result > 0
              const isLoss = displayed !== '0.0' && result < 0

              return (
                <div
                  key={hand.id}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded">
                        {hand.position}
                      </span>
                      {hand.hole_cards && (
                        <span className="text-xs text-zinc-400 font-mono">{hand.hole_cards}</span>
                      )}
                      {hand.is_all_in && (
                        <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded">ALL-IN</span>
                      )}
                      {hand.went_to_showdown && (
                        <span className="text-[10px] text-blue-400 bg-blue-500/10 px-1.5 py-0.5 rounded">
                          {hand.won_at_showdown ? 'Won SD' : 'Lost SD'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-500 mt-1">
                      {hand.stakes} · #{hand.hand_id}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-sm font-semibold ${
                      isWin ? 'text-green-400' : isLoss ? 'text-red-400' : 'text-zinc-400'
                    }`}>
                      {isWin ? '+' : ''}{displayed} BB
                    </p>
                  </div>
                </div>
              )
            })}

            {(stats.total_hands ?? 0) > 50 && (
              <p className="text-center text-xs text-zinc-500 py-3">
                Showing 50 of {(stats.total_hands as number).toLocaleString()} hands
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
