'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { cn, isEmpresaCTZ, souPilotoAutoconhecimento } from '@/lib/utils'
import Avatar from '@/components/Avatar'
import {
  Target, Heart, Zap, Activity, Users, Settings,
  User, LogOut, Building2, Home, ArrowLeftRight, Upload, Map, ClipboardList,
  Library, Compass, Sparkles, Briefcase, ChevronDown,
} from 'lucide-react'

interface NavLink {
  href: string
  label: string
  icon: typeof Home
  hidden?: boolean
}

interface NavGroup {
  key: string
  label: string
  icon: typeof Home
  links: NavLink[]
}

interface TopbarProps {
  permissionLevel?: string
  userEmail?: string | null
  fotoUrl?: string | null
}

export default function Topbar({ permissionLevel, userEmail, fotoUrl }: TopbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { empresa, clear: clearEmpresa } = useEmpresaStore()

  const isAdmin = permissionLevel === 'administrador'
  const ctz = isEmpresaCTZ(empresa?.company_name)
  const podeVerCargos = ctz && (isAdmin || souPilotoAutoconhecimento(userEmail))

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

  const groups: NavGroup[] = [
    {
      key: 'estrategia', label: 'Estratégia', icon: Map,
      links: [
        { href: '/objetivo', label: 'Nosso jeito de ser', icon: Heart },
        { href: '/okr', label: 'OKRs', icon: Target },
        { href: '/taticas', label: 'Táticas', icon: Zap },
        { href: '/estrategia', label: 'Estratégia', icon: Map },
      ],
    },
    {
      key: 'pessoas', label: 'Pessoas', icon: Users,
      links: [
        { href: '/funcionarios', label: 'Funcionários', icon: Users },
        { href: '/cargos', label: 'Cargos', icon: Briefcase, hidden: !podeVerCargos },
        { href: '/avaliacao', label: 'Avaliação', icon: ClipboardList, hidden: !ctz },
        { href: '/autoconhecimento', label: 'Autoconhecimento', icon: Sparkles, hidden: !ctz },
      ],
    },
    {
      key: 'recursos', label: 'Recursos', icon: Library,
      links: [
        { href: '/biblioteca', label: 'Biblioteca', icon: Library },
        { href: '/guia', label: 'Guia de Uso', icon: Compass },
        { href: '/importar-lancamentos', label: 'Importar', icon: Upload, hidden: !isAdmin },
        { href: '/admin', label: 'Administração', icon: Settings, hidden: !isAdmin },
      ],
    },
  ]

  const isGroupActive = (group: NavGroup) => group.links.some((l) => !l.hidden && pathname.startsWith(l.href))

  return (
    <header className="sticky top-4 z-40 mt-4 md:mt-6 max-w-[1440px] mx-auto px-4 md:px-6">
      <div className="flex items-center gap-2 md:gap-3 bg-card border border-border shadow-glass rounded-full pl-3.5 pr-2 py-2">

        {/* Marca */}
        <Link href="/inicio" className="flex items-center gap-2 shrink-0 pr-1">
          <span className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Target className="w-4 h-4 text-primary-foreground" />
          </span>
          <span className="hidden sm:inline font-display text-[15px] font-bold text-foreground tracking-tight">Begoal</span>
        </Link>

        {/* Navegação agrupada */}
        <nav data-tour="tour-nav" className="flex items-center gap-0.5 bg-secondary rounded-full p-1 overflow-x-auto min-w-0">
          <Link
            href="/inicio"
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors',
              pathname === '/inicio' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Home className="w-3.5 h-3.5" /> Central
          </Link>

          {groups.map((group) => {
            const visibleLinks = group.links.filter((l) => !l.hidden)
            if (visibleLinks.length === 0) return null
            const active = isGroupActive(group)
            return (
              <DropdownMenu.Root key={group.key}>
                <DropdownMenu.Trigger asChild>
                  <button
                    className={cn(
                      'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors outline-none',
                      active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    <group.icon className="w-3.5 h-3.5" /> {group.label} <ChevronDown className="w-3 h-3 opacity-60" />
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="start"
                    sideOffset={10}
                    className="z-50 min-w-[210px] bg-card border border-border shadow-glass-lg rounded-2xl p-1.5 outline-none"
                  >
                    {visibleLinks.map((link) => {
                      const linkActive = pathname.startsWith(link.href)
                      return (
                        <DropdownMenu.Item key={link.href} asChild className="outline-none">
                          <Link
                            href={link.href}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors cursor-pointer',
                              linkActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-secondary'
                            )}
                          >
                            <link.icon className="w-4 h-4 shrink-0" /> {link.label}
                          </Link>
                        </DropdownMenu.Item>
                      )
                    })}
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            )
          })}

          <Link
            href="/sinais-vitais"
            className={cn(
              'flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-colors',
              pathname.startsWith('/sinais-vitais') ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Activity className="w-3.5 h-3.5" /> Sinais Vitais
          </Link>
        </nav>

        {/* Empresa + usuário */}
        <div className="flex items-center gap-2 ml-auto pl-1 shrink-0">
          {empresa && (
            <div className="hidden lg:flex items-center gap-1.5 text-xs font-medium text-muted-foreground bg-secondary rounded-full px-3 py-1.5 max-w-[180px]">
              <Building2 className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{empresa.company_name}</span>
            </div>
          )}

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="rounded-full outline-none hover:opacity-90 transition-opacity shrink-0">
                <Avatar
                  nome={userEmail ?? 'U'}
                  fotoUrl={fotoUrl}
                  sizeClassName="w-9 h-9 text-xs font-display"
                  corClassName="bg-chrome text-chrome-foreground"
                />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={10}
                className="z-50 min-w-[200px] bg-card border border-border shadow-glass-lg rounded-2xl p-1.5 outline-none"
              >
                {isAdmin && (
                  <DropdownMenu.Item
                    onSelect={handleMudarEmpresa}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer outline-none"
                  >
                    <ArrowLeftRight className="w-4 h-4 shrink-0" /> Mudar Empresa
                  </DropdownMenu.Item>
                )}
                <DropdownMenu.Item asChild className="outline-none">
                  <Link href="/perfil" className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-foreground hover:bg-secondary transition-colors cursor-pointer">
                    <User className="w-4 h-4 shrink-0" /> Perfil
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="h-px bg-border my-1.5" />
                <DropdownMenu.Item
                  onSelect={handleLogout}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer outline-none"
                >
                  <LogOut className="w-4 h-4 shrink-0" /> Sair
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </div>
    </header>
  )
}
