'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { Student } from '@/lib/types'
import LanguageToggle from '@/components/LanguageToggle'
import { useLang } from '@/lib/LangContext'

const Icon = ({ name, className = '' }: { name: string; className?: string }) => (
  <span className={`material-symbols-outlined ${className}`}>{name}</span>
)

interface Props {
  student: Student
  onLogout: () => void
  active?: 'home' | 'units' | 'leaderboard'
  children: ReactNode
}

export default function StudentShell({ student, onLogout, active = 'home', children }: Props) {
  const { t } = useLang()
  const level = Math.floor(student.total_xp / 100) + 1
  const xpInLevel = student.total_xp % 100

  const nav = [
    { key: 'home', label: 'Home', icon: 'home', href: '/' },
    { key: 'units', label: t('Unidades', 'Units'), icon: 'extension', href: '/#units' },
    { key: 'leaderboard', label: 'Ranking', icon: 'leaderboard', href: '/#leaderboard' },
  ]

  return (
    <div className="min-h-screen text-on-surface">
      {/* Topbar */}
      <header className="fixed top-0 w-full z-50 flex justify-between items-center px-4 md:px-margin-edge h-20 bg-surface/80 backdrop-blur-xl border-b border-white/10">
        <div className="flex items-center gap-4 md:gap-8">
          <h1 className="font-display-lg text-xl md:text-headline-md font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">BEST Academy</h1>
          {/* Student chip */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-secondary bg-gradient-to-br from-primary-container to-secondary flex items-center justify-center font-bold text-on-primary">
              {student.name.charAt(0)}
            </div>
            <div>
              <p className="font-button-text text-button-text leading-tight">{student.name.split(' ')[0]}</p>
              <div className="flex items-center gap-1 bg-tertiary/20 px-2 py-0.5 rounded-full w-fit">
                <Icon name="military_tech" className="text-[14px] filled-icon text-tertiary" />
                <span className="font-stat-label text-[10px] text-tertiary">LVL {level}</span>
              </div>
            </div>
          </div>
          {/* XP bar */}
          <div className="hidden lg:flex flex-col gap-1 w-48">
            <div className="flex justify-between text-[10px] font-stat-label">
              <span className="text-on-surface-variant">XP</span>
              <span className="text-secondary">{xpInLevel}/100</span>
            </div>
            <div className="h-2 w-full bg-surface-container rounded-full xp-sweep">
              <div className="h-full bg-gradient-to-r from-tertiary to-secondary rounded-full" style={{ width: `${xpInLevel}%` }} />
            </div>
          </div>
          {/* Streak */}
          <div className="flex items-center gap-2 bg-error-container/20 px-3 py-1.5 rounded-xl border border-error/20">
            <Icon name="local_fire_department" className="text-error filled-icon" />
            <span className="font-button-text text-button-text text-error">{student.current_streak}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <LanguageToggle className="!bg-white/10" />
          <button onClick={onLogout} title={t('Salir', 'Exit')}
            className="flex items-center gap-1 text-on-surface-variant hover:text-secondary transition-colors">
            <Icon name="logout" />
            <span className="hidden md:inline font-button-text text-sm">{t('Salir', 'Exit')}</span>
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full z-40 hidden lg:flex flex-col pt-24 pb-8 bg-surface-container/60 backdrop-blur-2xl border-r border-white/5 w-64 rounded-r-3xl">
        <nav className="flex-1 px-4 space-y-2">
          {nav.map((n) => (
            <Link key={n.key} href={n.href}
              className={`flex items-center gap-4 px-6 py-4 rounded-r-xl transition-all active:scale-[0.98] ${
                active === n.key
                  ? 'bg-gradient-to-r from-primary/20 to-transparent text-secondary border-l-4 border-secondary'
                  : 'text-on-surface-variant hover:bg-white/5 hover:text-primary'
              }`}>
              <Icon name={n.icon} />
              <span className="font-button-text text-button-text">{n.label}</span>
            </Link>
          ))}
        </nav>
        <div className="px-4 space-y-2 mt-auto">
          <Link href="/dashboard" className="flex items-center gap-4 px-6 py-4 text-on-surface-variant hover:bg-white/5 hover:text-primary transition-colors">
            <Icon name="school" />
            <span className="font-button-text text-button-text">{t('Profesor', 'Teacher')}</span>
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="lg:ml-64 pt-24 px-4 md:px-margin-edge pb-12">{children}</main>

      {/* Background blobs */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-secondary/10 blur-[120px] rounded-full" />
      </div>
    </div>
  )
}
