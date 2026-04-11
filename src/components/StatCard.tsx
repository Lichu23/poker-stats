type Status = 'good' | 'warn' | 'bad' | 'neutral'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  status?: Status
}

const statusDot: Record<Status, string> = {
  good:    'bg-green-400',
  warn:    'bg-yellow-400',
  bad:     'bg-red-400',
  neutral: 'bg-zinc-500',
}

export default function StatCard({ label, value, sub, status }: StatCardProps) {
  return (
    <div className="bg-zinc-900 rounded-2xl border border-zinc-800 px-4 py-3">
      <div className="flex items-center gap-2 mb-1">
        {status && (
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[status]}`} />
        )}
        <p className="text-[11px] text-zinc-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="text-xs text-zinc-400 mt-0.5">{sub}</p>}
    </div>
  )
}
