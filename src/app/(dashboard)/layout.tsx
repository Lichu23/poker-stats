import Link from 'next/link'
import BottomNav from '@/components/BottomNav'
import { logout } from '@/app/actions/auth'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="pb-16 min-h-screen bg-zinc-950">
        {/* Global header */}
        <div className="px-4 pt-4 pb-0 border-b border-zinc-800">
          <div className="max-w-sm mx-auto flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold text-white">PokerStats</h1>
            <div className="flex items-center gap-3">
              <Link href="/profile" className="text-zinc-400 hover:text-white text-sm transition">
                Account
              </Link>
              <form action={logout} className="flex items-center">
                <button type="submit" className="text-zinc-400 hover:text-white text-sm transition">
                  Sign out
                </button>
              </form>
            </div>
          </div>
        </div>

        <div className="py-4">{children}</div>
      </div>
      <BottomNav />
    </>
  )
}
