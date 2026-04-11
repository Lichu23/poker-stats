import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/EmptyState'

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Use uploads as a proxy for sessions until session detection is implemented
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, filename, status, hands_parsed, created_at')
    .eq('user_id', user!.id)
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(20)

  const { data: stats } = await supabase
    .from('user_stats')
    .select('total_hands')
    .eq('user_id', user!.id)
    .single()

  const hasHands = stats && (stats.total_hands ?? 0) > 0

  return (
    <div className="min-h-screen bg-zinc-950 px-4 pt-8">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Sessions</h1>
          <p className="text-sm text-zinc-400 mt-0.5">Your upload history</p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to see your session history." />
        ) : (
          <>
            {uploads && uploads.length > 0 ? (
              <div className="space-y-3">
                {uploads.map(u => {
                  const date = new Date(u.created_at as string)
                  const dateStr = date.toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                  })
                  const timeStr = date.toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })

                  return (
                    <div
                      key={u.id}
                      className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.filename}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{dateStr} · {timeStr}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-sm font-semibold text-green-400">
                            {(u.hands_parsed as number).toLocaleString()}
                          </p>
                          <p className="text-xs text-zinc-500">hands</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-sm">No completed uploads yet.</div>
            )}

            <div className="bg-zinc-800/50 rounded-2xl border border-zinc-800 p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-2">Coming in a future update</p>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Automatic session detection (grouping hands by time gaps), per-session win rate, and duration tracking.
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
