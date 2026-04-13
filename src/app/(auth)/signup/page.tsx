import Link from 'next/link'
import { signup } from '@/app/actions/auth'
import SubmitButton from '@/components/SubmitButton'

interface Props {
  searchParams: Promise<{ error?: string; success?: string }>
}

export default async function SignupPage({ searchParams }: Props) {
  const { error, success } = await searchParams

  if (success === 'check-email') {
    return (
      <div className="bg-zinc-900 rounded-2xl p-8 shadow-xl border border-zinc-800 text-center">
        <div className="text-4xl mb-4">✉️</div>
        <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
        <p className="text-zinc-400 text-sm">
          We sent a confirmation link to your email address. Click it to activate your account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-green-400 hover:text-green-300 font-medium transition"
        >
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900 rounded-2xl p-8 shadow-xl border border-zinc-800">
      <h2 className="text-xl font-semibold text-white mb-6">Create account</h2>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <form action={signup} className="flex flex-col gap-4">
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
            autoComplete="new-password"
            minLength={8}
            className="w-full rounded-lg bg-zinc-800 border border-zinc-700 px-3.5 py-3 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition"
            placeholder="Min. 8 characters"
          />
        </div>

        <SubmitButton
          label="Create account"
          pendingLabel="Creating account…"
          className="mt-2 w-full rounded-lg bg-green-600 hover:bg-green-500 active:bg-green-700 px-4 py-3 text-sm font-semibold text-white transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-zinc-900 cursor-pointer"
        />
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link href="/login" className="text-green-400 hover:text-green-300 font-medium transition">
          Sign in
        </Link>
      </p>
    </div>
  )
}
