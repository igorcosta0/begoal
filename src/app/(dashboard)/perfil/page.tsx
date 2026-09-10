'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { getMeuPerfilPublico, upsertMeuPerfilPublico } from '@/lib/queries/perfilPublico'
import { User, Globe } from 'lucide-react'

const LIMITE_CAMPO_PUBLICO = 1000

export default function PerfilPage() {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
  })

  const [senhaForm, setSenhaForm] = useState({
    nova_senha: '',
    confirmar_senha: '',
  })

  // "Perfil público" (pedido 10/09/2026) — texto livre que a própria pessoa
  // escreve sobre si mesma e que fica visível pra qualquer colega da mesma
  // empresa (ver tela de Funcionários). Diferente de tudo no Eneagrama, aqui
  // é público de propósito.
  const [perfilPublico, setPerfilPublico] = useState({
    sobre_mim: '',
    habilidades: '',
    sonhos: '',
  })
  const [salvandoPublico, setSalvandoPublico] = useState(false)

  useEffect(() => {
    async function fetchPerfil() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: func } = await supabase
        .from('funcionarios')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle()

      if (func) {
        setForm({ full_name: func.full_name ?? '', email: func.email ?? user.email ?? '' })
      } else {
        setForm({ full_name: '', email: user.email ?? '' })
      }

      const { perfil } = await getMeuPerfilPublico()
      if (perfil) {
        setPerfilPublico({
          sobre_mim: perfil.sobre_mim ?? '',
          habilidades: perfil.habilidades ?? '',
          sonhos: perfil.sonhos ?? '',
        })
      }
      setLoading(false)
    }
    fetchPerfil()
  }, [])

  async function handleSalvarPerfilPublico(e: React.FormEvent) {
    e.preventDefault()
    setSalvandoPublico(true)
    setMensagem(null)
    const { error } = await upsertMeuPerfilPublico(perfilPublico)
    if (error) {
      setMensagem({ tipo: 'erro', texto: error })
    } else {
      setMensagem({ tipo: 'sucesso', texto: 'Perfil público atualizado com sucesso!' })
    }
    setSalvandoPublico(false)
  }

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não encontrado')

      // Achado 10/09/2026: um update direto na tabela funcionarios (como
      // este era antes) nunca funcionava pra quem não é administrador — a
      // policy de escrita da tabela exige permission_level='administrador',
      // e o RLS bloqueia a linha sem lançar erro (o botão "parecia" salvar,
      // mas não mudava nada no banco). Rota corrigida: RPC security-definer
      // que só atualiza full_name da PRÓPRIA linha (migration
      // PENDENTE_20260910030000), sem depender de ser admin.
      const { error } = await supabase.rpc('atualizar_meu_nome', { p_full_name: form.full_name })
      if (error) throw error

      setMensagem({ tipo: 'sucesso', texto: 'Perfil atualizado com sucesso!' })
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao salvar perfil.' })
    } finally {
      setSalvando(false)
    }
  }

  async function handleSalvarSenha(e: React.FormEvent) {
    e.preventDefault()
    if (senhaForm.nova_senha !== senhaForm.confirmar_senha) {
      setMensagem({ tipo: 'erro', texto: 'As senhas não coincidem.' })
      return
    }
    setSalvando(true)
    setMensagem(null)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: senhaForm.nova_senha })
      if (error) throw error
      setSenhaForm({ nova_senha: '', confirmar_senha: '' })
      setMensagem({ tipo: 'sucesso', texto: 'Senha atualizada com sucesso!' })
    } catch {
      setMensagem({ tipo: 'erro', texto: 'Erro ao atualizar senha.' })
    } finally {
      setSalvando(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 rounded bg-secondary" />
        <div className="h-40 rounded-2xl bg-secondary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
          <User className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Perfil</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie suas informações pessoais</p>
        </div>
      </div>

      {mensagem && (
        <div className={`px-4 py-3 rounded-xl text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Dados pessoais */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Dados pessoais</h2>
        <form onSubmit={handleSalvarPerfil} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Nome completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-secondary text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground mt-1">O e-mail não pode ser alterado aqui.</p>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Perfil público — visível pra qualquer colega da mesma empresa (ver
          tela de Funcionários), diferente de tudo mais nesta página. */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <div className="flex items-center gap-2 mb-1">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Perfil público</h2>
        </div>
        <p className="text-xs text-muted-foreground mb-4">
          Visível para qualquer colega da sua empresa na tela de Funcionários — conte um pouco sobre você.
        </p>
        <form onSubmit={handleSalvarPerfilPublico} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Sobre mim</label>
            <textarea
              value={perfilPublico.sobre_mim}
              onChange={(e) => setPerfilPublico({ ...perfilPublico, sobre_mim: e.target.value })}
              maxLength={LIMITE_CAMPO_PUBLICO}
              rows={3}
              placeholder="Quem é você, o que você faz aqui, o que gosta..."
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{perfilPublico.sobre_mim.length}/{LIMITE_CAMPO_PUBLICO}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Minhas habilidades</label>
            <textarea
              value={perfilPublico.habilidades}
              onChange={(e) => setPerfilPublico({ ...perfilPublico, habilidades: e.target.value })}
              maxLength={LIMITE_CAMPO_PUBLICO}
              rows={3}
              placeholder="No que você é bom, o que pode ajudar os colegas..."
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{perfilPublico.habilidades.length}/{LIMITE_CAMPO_PUBLICO}</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Meus sonhos</label>
            <textarea
              value={perfilPublico.sonhos}
              onChange={(e) => setPerfilPublico({ ...perfilPublico, sonhos: e.target.value })}
              maxLength={LIMITE_CAMPO_PUBLICO}
              rows={3}
              placeholder="Onde você quer chegar, o que quer conquistar..."
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-y"
            />
            <p className="text-[11px] text-muted-foreground mt-1 text-right">{perfilPublico.sonhos.length}/{LIMITE_CAMPO_PUBLICO}</p>
          </div>
          <button
            type="submit"
            disabled={salvandoPublico}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {salvandoPublico ? 'Salvando...' : 'Salvar perfil público'}
          </button>
        </form>
      </div>

      {/* Senha */}
      <div className="bg-card border border-border rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Alterar senha</h2>
        <form onSubmit={handleSalvarSenha} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Nova senha</label>
            <input
              type="password"
              value={senhaForm.nova_senha}
              onChange={(e) => setSenhaForm({ ...senhaForm, nova_senha: e.target.value })}
              required
              minLength={6}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Confirmar nova senha</label>
            <input
              type="password"
              value={senhaForm.confirmar_senha}
              onChange={(e) => setSenhaForm({ ...senhaForm, confirmar_senha: e.target.value })}
              required
              minLength={6}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
          >
            {salvando ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}