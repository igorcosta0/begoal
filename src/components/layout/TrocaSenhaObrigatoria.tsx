'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useEmpresaStore } from '@/store/useEmpresaStore'
import { KeyRound } from 'lucide-react'

const TAMANHO_MINIMO_SENHA = 8

// Pop-up de troca obrigatória (pedido 21/10/2026): aparece para quem entrou
// com a senha padrão (função usando_senha_padrao, chamada no layout) e não
// fecha até a senha ser trocada. Sem botão de fechar nem clique fora; a única
// outra saída é "Sair".
export default function TrocaSenhaObrigatoria() {
  const { clear: clearEmpresa } = useEmpresaStore()
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  async function handleSalvar(e: React.FormEvent) {
    e.preventDefault()
    setErro(null)
    if (novaSenha !== confirmar) {
      setErro('As senhas não coincidem.')
      return
    }
    if (novaSenha.length < TAMANHO_MINIMO_SENHA) {
      setErro(`A nova senha precisa ter pelo menos ${TAMANHO_MINIMO_SENHA} caracteres.`)
      return
    }
    setSalvando(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password: novaSenha })
      if (error) {
        // O Supabase recusa senha igual à atual (que é a padrão).
        setErro(
          error.message.toLowerCase().includes('different')
            ? 'A nova senha não pode ser a senha padrão.'
            : 'Erro ao atualizar a senha. Tente novamente.'
        )
        return
      }
      // Confere no banco: se ainda bater com uma senha padrão, o pop-up fica.
      const { data: aindaPadrao } = await supabase.rpc('usando_senha_padrao')
      if (aindaPadrao) {
        setErro('A nova senha não pode ser a senha padrão.')
        return
      }
      window.location.reload()
    } finally {
      setSalvando(false)
    }
  }

  async function handleSair() {
    await createClient().auth.signOut()
    clearEmpresa()
    window.location.href = '/login'
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" role="dialog" aria-modal="true" aria-labelledby="troca-senha-titulo">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <h2 id="troca-senha-titulo" className="text-base font-semibold text-foreground">
            Troque sua senha para continuar
          </h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">
          Você entrou com a senha padrão. Ela serve só para o primeiro acesso e não pode ser a
          definitiva: crie uma senha nova agora para acessar o sistema.
        </p>
        <form onSubmit={handleSalvar} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-foreground">Nova senha (mínimo {TAMANHO_MINIMO_SENHA} caracteres)</label>
            <input
              type="password"
              autoComplete="new-password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              required
              minLength={TAMANHO_MINIMO_SENHA}
              autoFocus
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-foreground">Confirmar nova senha</label>
            <input
              type="password"
              autoComplete="new-password"
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              required
              minLength={TAMANHO_MINIMO_SENHA}
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {erro && <p className="text-sm text-destructive">{erro}</p>}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              type="button"
              onClick={handleSair}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sair
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-4 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm"
            >
              {salvando ? 'Salvando...' : 'Salvar nova senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
