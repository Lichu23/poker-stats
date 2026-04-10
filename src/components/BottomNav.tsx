'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',          label: 'Summary',  icon: '⬡' },
  { href: '/preflop',   label: 'Preflop',  icon: '◈' },
  { href: '/postflop',  label: 'Postflop', icon: '◉' },
  { href: '/luck',      label: 'Luck',     icon: '◇' },
  { href: '/sessions',  label: 'Sessions', icon: '▤' },
  { href: '/hands',     label: 'Hands',    icon: '◻' },
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-zinc-900 border-t border-zinc-800 z-50">
      <div className="flex items-center justify-around max-w-sm mx-auto">
        {tabs.map(tab => {
          const active = tab.href === '/'
            ? pathname === '/'
            : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center justify-center py-3 flex-1 min-h-[56px] transition-colors ${
                active ? 'text-green-400' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="text-[10px] mt-1 font-medium tracking-wide">{tab.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
