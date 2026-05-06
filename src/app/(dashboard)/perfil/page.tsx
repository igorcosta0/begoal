'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'

export default function PerfilPage() {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [funcionario, setFuncionario] = useState<any | null>(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    cargo: '',
  })

  const [senhaForm, setSenhaForm] = useState({
    novaSenha: '',
    confirmarSenha: '',
  })
  const [salvandoSenha, setSalvandoSenha] = useState(false)
  const [erroSenha, setErroSenha] = useState<string | null>(null)
  const [sucessoSenha, setSucessoSenha] = useState(false)

  useEffect(() => {
    async function fetchPerfil() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !empresa) return

      const { data } = await supabase
        .from('funcionarios')
        .select('id, full_name, email, cargo, setor_id, status, profile')
        .eq('user_id', user.id)
        .eq('client_id', empresa.id)
        .single()

      if (data) {
        setFuncionario(data)
        setForm({
          full_name: data.full_name ?? '',
          email: data.email ?? user.email ?? '',
          cargo: data.cargo ?? '',
        })
      } else {
        setForm({
          full_name: user.email ?? '',
          email: user.email ?? '',
          cargo: '',
        })
      }
      setLoading(false)
    }
    fetchPerfil()
  }, [empresa])

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setSalvando(true)
    setErro(null)
    setSucesso(false)

    const supabase = createClient()

    if (funcionario) {
      const { error } = await supabase
        .from('funcionarios')
        .update({
          full_name: form.full_name,
          cargo: form.cargo || undefined,
        })
        .eq('id', funcionario.id)

      if (error) {
        setErro('Erro ao salvar perfil. Tente novamente.')
        setSalvando(false)
        return
      }
    }

    setSucesso(true)
    setSalvando(false)
    setTimeout(() => setSucesso(false), 3000)
  }

  async function handleAlterarSenha(e: React.FormEvent) {
    e.preventDefault()
    setErroSenha(null)
    setSucessoSenha(false)

    if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
      setErroSenha('As senhas não coincidem.')
      return
    }

    if (senhaForm.novaSenha.length < 6) {
      setErroSenha('A senha deve ter pelo menos 6 caracteres.')
      return
    }

    setSalvandoSenha(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password: senhaForm.novaSenha,
    })

    if (error) {
      setErroSenha('Erro ao alterar senha. Tente novamente.')
      setSalvandoSenha(false)
      return
    }

    setSenhaForm({ novaSenha: '', confirmarSenha: '' })
    setSucessoSenha(true)
    setSalvandoSenha(false)
    setTimeout(() => setSucessoSenha(false), 3000)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-secondary rounded animate-pulse" />
        <div className="h-48 bg-secondary rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie suas informações pessoais
        </p>
      </div>

      {/* Dados pessoais */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Dados pessoais</h2>
        <form onSubmit={handleSalvar} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Nome completo</label>
            <input
              type="text"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              required
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
            <p className="text-xs text-muted-foreground mt-1">O e-mail não pode ser alterado.</p>
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Cargo</label>
            <input
              type="text"
              value={form.cargo}
              onChange={(e) => setForm({ ...form, cargo: e.target.value })}
              placeholder="Ex: Gerente de Projetos"
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {erro && <p className="text-xs text-destructive">{erro}</p>}
          {sucesso && <p className="text-xs text-green-600">Perfil salvo com sucesso!</p>}

          <button
            type="submit"
            disabled={salvando}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {salvando ? 'Salvando...' : 'Salvar alterações'}
          </button>
        </form>
      </div>

      {/* Alterar senha */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h2 className="text-sm font-semibold text-foreground mb-4">Alterar senha</h2>
        <form onSubmit={handleAlterarSenha} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Nova senha</label>
            <input
              type="password"
              value={senhaForm.novaSenha}
              onChange={(e) => setSenhaForm({ ...senhaForm, novaSenha: e.target.value })}
              required
              placeholder="Mínimo 6 caracteres"
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Confirmar nova senha</label>
            <input
              type="password"
              value={senhaForm.confirmarSenha}
              onChange={(e) => setSenhaForm({ ...senhaForm, confirmarSenha: e.target.value })}
              required
              placeholder="Repita a nova senha"
              className="mt-1 w-full px-3 py-2 text-sm rounded-md border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {erroSenha && <p className="text-xs text-destructive">{erroSenha}</p>}
          {sucessoSenha && <p className="text-xs text-green-600">Senha alterada com sucesso!</p>}

          <button
            type="submit"
            disabled={salvandoSenha}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {salvandoSenha ? 'Alterando...' : 'Alterar senha'}
          </button>
        </form>
      </div>
    </div>
  )
}