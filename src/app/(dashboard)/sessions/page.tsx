import { createClient } from '@/lib/supabase/server'
import EmptyState from '@/components/EmptyState'

// ── Session detection ─────────────────────────────────────────────────────────

const SESSION_GAP_MS = 30 * 60 * 1000 // 30 minutes

interface HandRow {
  played_at: string
  result_bb: number
  stakes: string
}

interface DetectedSession {
  startedAt: Date
  endedAt: Date
  durationMin: number
  hands: number
  netBb: number
  bbPer100: number
  stakes: string
}

function detectSessions(rows: HandRow[]): DetectedSession[] {
  if (rows.length === 0) return []

  // Sort ascending by time
  const sorted = [...rows].sort(
    (a, b) => new Date(a.played_at).getTime() - new Date(b.played_at).getTime()
  )

  const sessions: DetectedSession[] = []
  let batch: HandRow[] = [sorted[0]]

  for (let i = 1; i < sorted.length; i++) {
    const prevMs = new Date(sorted[i - 1].played_at).getTime()
    const currMs = new Date(sorted[i].played_at).getTime()
    if (currMs - prevMs > SESSION_GAP_MS) {
      sessions.push(buildSession(batch))
      batch = []
    }
    batch.push(sorted[i])
  }
  if (batch.length > 0) sessions.push(buildSession(batch))

  return sessions.reverse() // Most recent first
}

function buildSession(hands: HandRow[]): DetectedSession {
  const startedAt = new Date(hands[0].played_at)
  const endedAt = new Date(hands[hands.length - 1].played_at)
  const durationMin = Math.round((endedAt.getTime() - startedAt.getTime()) / 60000)
  const netBb = hands.reduce((s, h) => s + h.result_bb, 0)
  // Majority stakes
  const stakeCount = new Map<string, number>()
  for (const h of hands) stakeCount.set(h.stakes, (stakeCount.get(h.stakes) ?? 0) + 1)
  const stakes = [...stakeCount.entries()].sort((a, b) => b[1] - a[1])[0][0]
  return {
    startedAt,
    endedAt,
    durationMin,
    hands: hands.length,
    netBb,
    bbPer100: (netBb / hands.length) * 100,
    stakes,
  }
}

function formatDuration(minutes: number): string {
  if (minutes < 1) return '< 1 min'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SessionsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: statsRow } = await supabase
    .from('user_stats')
    .select('total_hands, net_result_bb, bb_per_100')
    .eq('user_id', user!.id)
    .single()

  const hasHands = statsRow && (statsRow.total_hands ?? 0) > 0

  let sessions: DetectedSession[] = []
  if (hasHands) {
    const { data: handRows } = await supabase
      .from('hands')
      .select('played_at, result_bb, stakes')
      .eq('user_id', user!.id)
      .order('played_at', { ascending: true })
    if (handRows) {
      sessions = detectSessions(handRows as HandRow[])
    }
  }

  const bestSession = sessions.length > 0
    ? sessions.reduce((best, s) => s.netBb > best.netBb ? s : best)
    : null
  const worstSession = sessions.length > 0
    ? sessions.reduce((worst, s) => s.netBb < worst.netBb ? s : worst)
    : null

  return (
    <div className="px-4">
      <div className="max-w-sm mx-auto space-y-4">

        <div className="mb-2">
          <h1 className="text-xl font-bold text-white">Sessions</h1>
          <p className="text-sm text-zinc-400 mt-0.5">
            {sessions.length > 0
              ? `${sessions.length} session${sessions.length !== 1 ? 's' : ''} detected`
              : 'Your play sessions'}
          </p>
        </div>

        {!hasHands ? (
          <EmptyState message="Upload your hand history to see your session breakdown." />
        ) : (
          <>
            {/* Summary strip */}
            {sessions.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-3 py-3 text-center">
                  <p className="text-lg font-bold text-white">{sessions.length}</p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Sessions</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-3 py-3 text-center">
                  <p className={`text-lg font-bold ${
                    (statsRow.net_result_bb ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(statsRow.net_result_bb ?? 0) >= 0 ? '+' : ''}
                    {(statsRow.net_result_bb ?? 0).toFixed(0)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">Total BB</p>
                </div>
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-3 py-3 text-center">
                  <p className={`text-lg font-bold ${
                    (statsRow.bb_per_100 ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {(statsRow.bb_per_100 ?? 0) >= 0 ? '+' : ''}
                    {(statsRow.bb_per_100 ?? 0).toFixed(1)}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5">BB/100</p>
                </div>
              </div>
            )}

            {/* Best / Worst session */}
            {bestSession && worstSession && sessions.length > 1 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Best session</p>
                  <p className="text-base font-bold text-green-400">
                    +{bestSession.netBb.toFixed(1)} BB
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {bestSession.startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className={`rounded-2xl px-4 py-3 ${
                  worstSession.netBb < 0
                    ? 'bg-red-500/10 border border-red-500/20'
                    : 'bg-zinc-900 border border-zinc-800'
                }`}>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wide mb-1">Worst session</p>
                  <p className={`text-base font-bold ${worstSession.netBb >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {worstSession.netBb >= 0 ? '+' : ''}{worstSession.netBb.toFixed(1)} BB
                  </p>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    {worstSession.startedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
            )}

            {/* Session list */}
            {sessions.length > 0 ? (
              <div className="space-y-3">
                {sessions.map((session, i) => {
                  const isWin = session.netBb > 0
                  const dateStr = session.startedAt.toLocaleDateString('en-US', {
                    weekday: 'short', month: 'short', day: 'numeric',
                  })
                  const timeStr = session.startedAt.toLocaleTimeString('en-US', {
                    hour: '2-digit', minute: '2-digit',
                  })

                  return (
                    <div
                      key={i}
                      className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white">{dateStr}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{timeStr}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-zinc-500">
                              {session.hands} hands
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className="text-xs text-zinc-500">
                              {formatDuration(session.durationMin)}
                            </span>
                            <span className="text-zinc-700">·</span>
                            <span className="text-xs text-zinc-500">{session.stakes}</span>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className={`text-base font-bold ${isWin ? 'text-green-400' : 'text-red-400'}`}>
                            {isWin ? '+' : ''}{session.netBb.toFixed(1)}
                            <span className="text-xs font-normal text-zinc-500 ml-1">BB</span>
                          </p>
                          <p className={`text-xs mt-0.5 ${isWin ? 'text-green-400/70' : 'text-red-400/70'}`}>
                            {isWin ? '+' : ''}{session.bbPer100.toFixed(1)} bb/100
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-zinc-500 text-sm">
                No sessions found.
              </div>
            )}

            <p className="text-center text-[10px] text-zinc-700 pb-2">
              Sessions split by 30-minute inactivity gap
            </p>
          </>
        )}
      </div>
    </div>
  )
}
