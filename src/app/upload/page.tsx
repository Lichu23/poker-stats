import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import UploadZone from '@/components/UploadZone'

export default async function UploadPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Recent uploads
  const { data: uploads } = await supabase
    .from('uploads')
    .select('id, filename, status, hands_parsed, error_message, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(5)

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-zinc-400 hover:text-white transition">
            ←
          </Link>
          <h1 className="text-xl font-bold text-white">Upload hands</h1>
        </div>

        {/* Upload zone */}
        <UploadZone />

        {/* Recent uploads */}
        {uploads && uploads.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xs text-zinc-500 uppercase tracking-wide mb-3">Recent uploads</h2>
            <div className="flex flex-col gap-2">
              {uploads.map(u => (
                <div
                  key={u.id}
                  className="bg-zinc-900 rounded-xl border border-zinc-800 px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-white truncate">{u.filename}</p>
                    {u.status === 'completed' && (
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {u.hands_parsed?.toLocaleString() ?? 0} hands
                      </p>
                    )}
                    {u.status === 'failed' && (
                      <p className="text-xs text-red-400 mt-0.5 truncate">{u.error_message}</p>
                    )}
                  </div>
                  <StatusBadge status={u.status} />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-500/20 text-green-400',
    processing: 'bg-yellow-500/20 text-yellow-400',
    pending:    'bg-zinc-700 text-zinc-400',
    failed:     'bg-red-500/20 text-red-400',
  }
  return (
    <span className={`text-xs px-2 py-1 rounded-full font-medium shrink-0 ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  )
}
