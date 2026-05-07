'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Target } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }

    window.location.href = '/selecao-empresa'
  }

  return (
    <div className="min-h-screen flex">

      {/* Lado esquerdo — visual */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 50%, #1a4a7a 100%)' }}>

        {/* Padrão de fundo */}
        <div className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '40px 40px'
          }} />
        <div className="absolute top-20 right-20 w-80 h-80 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #60a5fa, transparent)' }} />
        <div className="absolute bottom-20 left-10 w-60 h-60 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />

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
            <div className="w-12 h-0.5 bg-blue-400/50 rounded-full mb-6" />
            <h1 className="text-4xl font-bold text-white leading-tight mb-4">
              Gestão de OKRs<br />
              <span className="text-blue-300">simples e eficaz</span>
            </h1>
            <p className="text-white/60 text-base leading-relaxed max-w-sm">
              Acompanhe objetivos, KRs e sinais vitais da sua empresa em um só lugar.
            </p>

            {/* Features */}
            <div className="mt-10 space-y-4">
              {[
                { icon: '🎯', text: 'Objetivos e Key Results' },
                { icon: '📊', text: 'Sinais Vitais e KPIs' },
                { icon: '⚡', text: 'Táticas e execução' },
                { icon: '👥', text: 'Multi-empresa e times' },
              ].map((f) => (
                <div key={f.text} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-sm shrink-0">
                    {f.icon}
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
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Target className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg text-foreground">Begoal</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Bem-vindo de volta</h2>
            <p className="text-sm text-muted-foreground">Entre com suas credenciais para continuar</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-foreground uppercase tracking-wider">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seu@email.com"
                className="mt-1.5 w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Senha</label>
                <a href="/reset-senha" className="text-xs text-primary hover:underline">
                  Esqueceu a senha?
                </a>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full px-4 py-3 text-sm rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5986 100%)', color: 'white' }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-8">
            Plataforma de gestão estratégica · Begoal
          </p>
        </div>
      </div>
    </div>
  )
}