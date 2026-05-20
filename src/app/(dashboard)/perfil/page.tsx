'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

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
      setLoading(false)
    }
    fetchPerfil()
  }, [])

  async function handleSalvarPerfil(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setMensagem(null)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não encontrado')

      await supabase
        .from('funcionarios')
        .update({ full_name: form.full_name })
        .eq('user_id', user.id)

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
        <div className="h-40 rounded-lg bg-secondary" />
      </div>
    )
  }

  return (
    <div className="max-w-lg space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">Gerencie suas informações pessoais</p>
      </div>

      {mensagem && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${mensagem.tipo === 'sucesso' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {mensagem.texto}
        </div>
      )}

      {/* Dados pessoais */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Dados pessoais</h2>
        <form onSubmit={handleSalvarPerfil} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Nome completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">E-mail</label>
            <input
              type="email"
              value={form.email}
              disabled
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-secondary text-muted-foreground cursor-not-allowed"
            />
            <p className="text-[11px] text-muted-foreground mt-1">O e-mail não pode ser alterado aqui.</p>
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Senha */}
      <div className="bg-card border border-border rounded-lg p-6">
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
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            type="submit"
            disabled={salvando}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {salvando ? 'Atualizando...' : 'Atualizar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}