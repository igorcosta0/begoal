'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { Target, Activity, Zap, Users } from 'lucide-react'

interface RoleRow {
  permission_level: string
  clients: { id: string; company_name: string; logo_url?: string } | null
}

export default function LoginPage() {
  const router = useRouter()
  const { setEmpresa } = useEmpresaStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError || !authData.user) {
      // "Invalid login credentials" é a mensagem que o Supabase devolve pra
      // e-mail/senha errados — qualquer outro erro (rede, servidor fora do
      // ar) é algo diferente, não faz sentido dizer "senha incorreta".
      setError(
        authError?.message?.toLowerCase().includes('invalid')
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar agora. Tente novamente em instantes.'
      )
      setLoading(false)
      return
    }

    // Busca as empresas e o nível de permissão do usuário
    const { data: rolesData } = await supabase
      .from('user_company_roles')
      .select('permission_level, clients(*)')
      .eq('user_id', authData.user.id)
      .returns<RoleRow[]>()

    const roles = rolesData ?? []
    const empresas = roles.map((item) => item.clients).filter((c) => c !== null)
    const isAdministrador = roles.some((item) => item.permission_level === 'administrador')

    // Administradores acompanham múltiplas empresas: sempre passam pela seleção,
    // mesmo que hoje só tenham acesso a uma.
    if (!isAdministrador && empresas.length === 1) {
      // Usuário comum com apenas uma empresa: pula a seleção e vai direto para a página inicial
      setEmpresa(empresas[0])
      router.push('/inicio')
      return
    }

    if (empresas.length >= 1) {
      router.push('/selecao-empresa')
      return
    }

    setError('Nenhuma empresa vinculada a este usuário.')
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">

      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary to-[hsl(231_76%_32%)]">

        {/* Padrão de fundo */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        <div className="absolute top-20 right-20 w-80 h-80 rounded-full opacity-10 blur-3xl bg-[hsl(231_90%_78%)]" />
        <div className="absolute bottom-20 left-10 w-60 h-60 rounded-full opacity-10 blur-3xl bg-[hsl(231_90%_78%)]" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Begoal</span>
          </div>

          {/* Conteúdo central */}
          <div>
            <div className="w-12 h-0.5 bg-[hsl(231_90%_78%)]/60 rounded-full mb-6" />
            <h1 className="font-display text-4xl font-bold text-white leading-tight mb-4">
              Gestão de OKRs<br />
              <span className="text-[hsl(231_90%_78%)]">simples e eficaz</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Acompanhe objetivos, KRs e sinais vitais da sua empresa em um só lugar.
            </p>

            {/* Features */}
            <div className="mt-10 space-y-4">
              {[
                { Icon: Target, text: 'Objetivos e Key Results' },
                { Icon: Activity, text: 'Sinais Vitais e KPIs' },
                { Icon: Zap, text: 'Táticas e execução' },
                { Icon: Users, text: 'Multi-empresa e times' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                    <f.Icon className="w-4 h-4 text-white/80" />
                  </div>
                  <span className="text-white/70 text-sm">{f.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé */}
          <p className="text-white/30 text-xs">
            © {new Date().getFullYear()} Begoal · Todos os direitos reservados
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex-1 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-sm">

          {/* Logo mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Begoal</span>
          </div>

          <div className="glass-elevated rounded-2xl p-8">
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold text-foreground mb-1">Bem-vindo de volta</h2>
              <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="email" className="text-xs font-semibold text-foreground uppercase tracking-wider">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                  className="mt-1.5 w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="text-xs font-semibold text-foreground uppercase tracking-wider">Senha</label>
                  <Link href="/reset-senha" className="text-xs text-primary hover:underline">
                    Esqueceu a senha?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                />
              </div>

              {error && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl px-4 py-3">
                  <p className="text-xs text-destructive font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold bg-primary text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Plataforma de gestão estratégica · Begoal
          </p>
        </div>
      </div>
    </div>
  )
}