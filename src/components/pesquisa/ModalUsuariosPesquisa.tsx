'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  AJUDA_PERFIL, definirPerfilPesquisa, listarPerfisPesquisa, ROTULO_PERFIL,
  type PerfilPesquisa, type UsuarioPesquisa,
} from '@/lib/queries/pesquisas'

// Usuários do módulo de Pesquisa (guia do Miro, etapa 5): F01–F03 perfis
// Master, Administrativo e Visualizador; F04 gestão entre os membros da
// empresa; F05 Administrativo não dá nem mexe em Master. O banco confere tudo
// de novo (pesquisa_definir_perfil).

const PERFIS: PerfilPesquisa[] = ['master', 'administrativo', 'visualizador']

const COR_PERFIL: Record<PerfilPesquisa, string> = {
  master: 'bg-primary/10 text-primary',
  administrativo: 'bg-emerald-100 text-emerald-700',
  visualizador: 'bg-secondary text-foreground',
}

interface Props {
  clientId: string
  meuPerfil: PerfilPesquisa
  onClose: () => void
}

export default function ModalUsuariosPesquisa({ clientId, meuPerfil, onClose }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioPesquisa[] | null>(null)
  const [busca, setBusca] = useState('')
  const [salvando, setSalvando] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await listarPerfisPesquisa(clientId)
    if (error) setErro(error)
    setUsuarios(data)
  }, [clientId])

  useEffect(() => { carregar() }, [carregar])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    const lista = usuarios ?? []
    const achados = t ? lista.filter((u) => u.nome.toLowerCase().includes(t) || (u.email ?? '').toLowerCase().includes(t)) : lista
    // Quem tem perfil primeiro; depois quem só responde.
    return [...achados].sort((a, b) => Number(!a.perfil) - Number(!b.perfil) || a.nome.localeCompare(b.nome))
  }, [usuarios, busca])

  const comPerfil = (usuarios ?? []).filter((u) => u.perfil).length

  async function mudar(u: UsuarioPesquisa, perfil: PerfilPesquisa | null) {
    setErro(null)
    setAviso(null)
    setSalvando(u.user_id)
    const { error } = await definirPerfilPesquisa(clientId, u.user_id, perfil)
    setSalvando(null)
    if (error) return setErro(error)
    setAviso(perfil ? `${u.nome} agora é ${ROTULO_PERFIL[perfil]} na Pesquisa.` : `${u.nome} não tem mais perfil na Pesquisa (só responde).`)
    carregar()
  }

  // F05: Administrativo não dá Master nem mexe em quem já é Master.
  const podeMexer = (u: UsuarioPesquisa) => !u.automatico && !(meuPerfil === 'administrativo' && u.perfil === 'master')
  const opcoes = meuPerfil === 'master' ? PERFIS : PERFIS.filter((p) => p !== 'master')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-border space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-foreground">Usuários da Pesquisa</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Os perfis valem só neste módulo. Quem não tem perfil só responde às pesquisas.
              </p>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:bg-secondary" aria-label="Fechar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {PERFIS.map((p) => (
              <li key={p} className="rounded-xl border border-border px-3 py-2">
                <span className={cn('inline-block text-[11px] px-2 py-0.5 rounded-full font-semibold', COR_PERFIL[p])}>{ROTULO_PERFIL[p]}</span>
                <p className="text-[11px] text-muted-foreground mt-1">{AJUDA_PERFIL[p]}</p>
              </li>
            ))}
          </ul>
          <div className="relative">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome ou e-mail"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {erro && <div className="px-3 py-2 rounded-xl text-sm bg-red-50 text-red-700 border border-red-200">{erro}</div>}
          {aviso && <p className="text-xs text-foreground">{aviso}</p>}
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-3">
          {!usuarios ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : (
            <>
              <p className="text-[11px] text-muted-foreground mb-2">{comPerfil} com perfil · {usuarios.length} membros da empresa</p>
              <ul className="divide-y divide-border">
                {filtrados.map((u) => (
                  <li key={u.user_id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground truncate">{u.nome}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{u.email ?? 'sem e-mail'}</p>
                    </div>
                    {podeMexer(u) ? (
                      <select
                        aria-label={`Perfil de ${u.nome}`}
                        value={u.perfil ?? ''}
                        disabled={salvando === u.user_id}
                        onChange={(e) => mudar(u, (e.target.value || null) as PerfilPesquisa | null)}
                        className="shrink-0 px-2.5 py-1.5 text-xs rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
                      >
                        <option value="">Só responde</option>
                        {opcoes.map((p) => <option key={p} value={p}>{ROTULO_PERFIL[p]}</option>)}
                      </select>
                    ) : (
                      <span className="shrink-0 flex items-center gap-1.5" title={u.automatico ? 'Administrador da empresa: Master automático' : 'Só um Master muda o perfil de outro Master'}>
                        <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-semibold', COR_PERFIL[u.perfil ?? 'visualizador'])}>
                          {ROTULO_PERFIL[u.perfil ?? 'visualizador']}
                        </span>
                        {u.automatico && (
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <ShieldCheck className="w-3.5 h-3.5" /> admin da empresa
                          </span>
                        )}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {filtrados.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">Ninguém encontrado.</p>}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
