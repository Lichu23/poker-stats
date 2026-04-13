import Link from 'next/link'
import { login, loginAsDemo } from '@/app/actions/auth'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: Props) {
  const { error } = await searchParams

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 shadow-xl border border-zinc-800">
      <h2 className="text-xl font-semibold text-white mb-6">Sign in</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form action={login} className="flex flex-col gap-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-300 mb-1.5">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            placeholder="••••••••"
          />
        </div>

        <SubmitButton
          label="Sign in"
          pendingLabel="Signing in…"
          className="mt-2 w-full rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer"
        />
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        No account?{' '}
        <Link href="/signup" className="text-green-400 hover:text-green-300 font-medium transition">
          Create one
        </Link>
      </p>

      {process.env.DEMO_USER_EMAIL && (
        <>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-zinc-800" />
            <span className="text-xs text-zinc-600">or</span>
            <div className="flex-1 h-px bg-zinc-800" />
          </div>

          <form action={loginAsDemo} className="mt-4">
            <SubmitButton
              label="Try Demo — no sign up needed"
              pendingLabel="Loading demo…"
              className="w-full rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 hover:bg-zinc-800 px-4 py-3 text-sm font-medium text-zinc-200 transition focus:outline-none focus:ring-2 focus:ring-zinc-500 cursor-pointer"
            />
            <p className="mt-2 text-center text-xs text-zinc-600">
              Pre-loaded with example hand history data
            </p>
          </form>
        </>
      )}
    </div>
  )
}
