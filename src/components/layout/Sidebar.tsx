'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { cn } from '@/lib/utils'
import {
  Target, Flag, Zap, Activity, Users, Settings,
  User, LogOut, ChevronLeft, ChevronRight, Building2, Home, ArrowLeftRight,
} from 'lucide-react'

const navItems = [
  { href: '/inicio', label: 'Início', icon: Home },
  { href: '/okr', label: 'OKRs', icon: Target },
  { href: '/objetivo', label: 'Objetivos', icon: Flag },
  { href: '/taticas', label: 'Táticas', icon: Zap },
  { href: '/sinais-vitais', label: 'Sinais Vitais', icon: Activity },
  { href: '/funcionarios', label: 'Funcionários', icon: Users },
  { href: '/admin', label: 'Administração', icon: Settings },
]

interface SidebarProps {
  permissionLevel?: string
}

export default function Sidebar({ permissionLevel }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const { empresa, clear: clearEmpresa } = useEmpresaStore()

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    clearEmpresa()
    window.location.href = '/login'
  }

  function handleMudarEmpresa() {
    clearEmpresa()
    router.push('/selecao-empresa')
  }

  return (
    <aside className={cn(
      'flex flex-col h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300',
      collapsed ? 'w-16' : 'w-60'
    )}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-bold text-sidebar-foreground">Begoal</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1 rounded-md hover:bg-sidebar-accent transition-colors text-sidebar-foreground ml-auto"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Empresa selecionada */}
      {empresa && !collapsed && (
        <div className="px-4 py-3 border-b border-sidebar-border">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sidebar-foreground opacity-60 shrink-0" />
            <span className="text-xs text-sidebar-foreground opacity-60 truncate">
              {empresa.company_name}
            </span>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.href === '/admin' && permissionLevel !== 'administrador') return null
          const isActive = pathname.startsWith(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                collapsed ? 'justify-center' : '',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
              )}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {/* Mudar Empresa — apenas admins */}
        {permissionLevel === 'administrador' && (
          <button
            onClick={handleMudarEmpresa}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50',
              collapsed ? 'justify-center' : ''
            )}
            title={collapsed ? 'Mudar Empresa' : undefined}
          >
            <ArrowLeftRight className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Mudar Empresa</span>}
          </button>
        )}

        <Link
          href="/perfil"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Perfil' : undefined}
        >
          <User className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Perfil</span>}
        </Link>

        <button
          onClick={handleLogout}
          className={cn(
            'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-sidebar-foreground hover:bg-sidebar-accent/50',
            collapsed ? 'justify-center' : ''
          )}
          title={collapsed ? 'Sair' : undefined}
        >
          <LogOut className="w-4 h-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}