import { logout } from '@/app/actions/auth'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">PokerStats</h1>
        <p className="text-zinc-400 text-sm mb-1">Signed in as</p>
        <p className="text-green-400 text-sm font-medium mb-8">{user?.email}</p>
        <form action={logout}>
          <button
            type="submit"
            className="rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 px-5 py-2.5 text-sm font-medium text-white transition"
          >
            Sign out
          </button>
        </form>
      </div>
    </div>
  )
}
