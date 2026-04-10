export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-white tracking-tight">PokerStats</h1>
          <p className="text-zinc-400 text-sm mt-1">Know your leaks. Fix your game.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
