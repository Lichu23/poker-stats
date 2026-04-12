import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { changePassword, deleteAccount } from '@/app/actions/profile'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function ProfilePage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const isDemo = user.email === process.env.DEMO_USER_EMAIL
  const { error, success } = await searchParams

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8">
      <div className="max-w-sm mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link href="/" className="text-zinc-400 hover:text-white transition">
            ←
          </Link>
          <h1 className="text-xl font-bold text-white">Account</h1>
        </div>

        {/* Email */}
        <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Signed in as</p>
          <p className="text-white font-medium truncate">{user.email}</p>
        </div>

        {/* Feedback banners */}
        {error && (
          <div className="mb-4 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        {success === 'password-updated' && (
          <div className="mb-4 rounded-xl bg-green-500/10 border border-green-500/20 px-4 py-3 text-sm text-green-400">
            Password updated successfully.
          </div>
        )}

        {isDemo ? (
          <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-700 text-center">
            <p className="text-sm text-zinc-400">
              This is a demo account. Sign up to save your own data.
            </p>
          </div>
        ) : (
          <>
            {/* Change password */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-zinc-800 mb-4">
              <h2 className="text-base font-semibold text-white mb-4">Change password</h2>
              <form action={changePassword} className="flex flex-col gap-3">
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
                    New password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Min. 8 characters"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label htmlFor="confirm" className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Confirm new password
                  </label>
                  <input
                    id="confirm"
                    name="confirm"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition cursor-pointer"
                >
                  Update password
                </button>
              </form>
            </div>

            {/* Delete account */}
            <div className="bg-zinc-900 rounded-2xl p-5 border border-red-900/40">
              <h2 className="text-base font-semibold text-white mb-1">Delete account</h2>
              <p className="text-sm text-zinc-400 mb-4">
                This permanently deletes your account and all your data. This cannot be undone.
              </p>
              <form action={deleteAccount}>
                <button
                  type="submit"
                  className="w-full rounded-lg bg-red-600/20 hover:bg-red-600/30 active:bg-red-600/40 border border-red-600/40 px-4 py-3 text-sm font-semibold text-red-400 transition cursor-pointer"
                >
                  Delete my account
                </button>
              </form>
            </div>
          </>
        )}

      </div>
    </div>
  )
}
