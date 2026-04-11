import Link from 'next/link'

interface EmptyStateProps {
  message: string
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center mb-4">
        <span className="text-zinc-500 text-xl">—</span>
      </div>
      <p className="text-lg font-semibold text-zinc-200 mb-2">No data yet</p>
      <p className="text-sm text-zinc-400 mb-6 leading-relaxed">{message}</p>
      <Link
        href="/"
        className="bg-green-500 hover:bg-green-400 text-black font-semibold text-sm px-5 py-3 rounded-xl min-h-[44px] flex items-center transition"
      >
        Upload file
      </Link>
    </div>
  )
}
