'use client'

import DicaValor from '@/components/DicaValor'
import { useState, useEffect } from 'react'
import { createKr, salvarMetasMensaisKr, getSetoresByEmpresa, getFuncionariosByEmpresa } from '@/lib/queries/okr'
import CamposMetasMensais, { metasParaSalvar } from '@/components/okr/CamposMetasMensais'
import { useEmpresaStore } from '@/store/useEmpresaStore'

interface ModalCriarKrProps {
  open: boolean
  objetivoId: string
  objetivoTitulo?: string
  onClose: () => void
  onSuccess: () => void
}

export default function ModalCriarKr({
  open,
  objetivoId,
  objetivoTitulo,
  onClose,
  onSuccess,
}: ModalCriarKrProps) {
  const { empresa } = useEmpresaStore()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setores, setSetores] = useState<any[]>([])
  const [funcionarios, setFuncionarios] = useState<any[]>([])
  const [anoMetas, setAnoMetas] = useState(new Date().getFullYear())
  const [metasMensais, setMetasMensais] = useState<string[]>(Array(12).fill(''))
  // KR já criado, mas as metas mensais falharam: o próximo clique só tenta as metas.
  const [krCriadoId, setKrCriadoId] = useState<string | null>(null)

  // Fechou o modal: a próxima abertura cria um KR novo.
  useEffect(() => {
    if (!open) setKrCriadoId(null)
  }, [open])

  const [form, setForm] = useState({
    titulo: '',
    responsavel_id: '',
    setor_id: '',
    valor_inicial: '0',
    meta: '',
    tipo_valor: '',
    direcao: 'maior',
    apuracao: 'ultimo',
  })

  useEffect(() => {
    if (!open || !empresa) return
    getSetoresByEmpresa(empresa.id).then(({ data }) => setSetores(data ?? []))
    getFuncionariosByEmpresa(empresa.id).then(({ data }) => setFuncionarios(data ?? []))
  }, [open, empresa])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!empresa) return
    setLoading(true)
    setError(null)

    let krId = krCriadoId
    if (!krId) {
      const { data: krCriado, error } = await createKr({
        titulo: form.titulo,
        objetivo_id: objetivoId,
        responsavel_id: form.responsavel_id,
        setor_id: form.setor_id || undefined,
        client_id: empresa.id,
        valor_inicial: parseFloat(form.valor_inicial) || 0,
        meta: parseFloat(form.meta) || 0,
        tipo_valor: form.tipo_valor || undefined,
        direcao: form.direcao,
        apuracao: form.apuracao,
      })

      if (error || !krCriado) {
        setError('Erro ao criar KR. Tente novamente.')
        setLoading(false)
        return
      }
      krId = krCriado.id as string
    }

    if (krId && metasMensais.some((v) => v.trim() !== '')) {
      const { error: erroMetas } = await salvarMetasMensaisKr(krId, anoMetas, metasParaSalvar(metasMensais))
      if (erroMetas) {
        setKrCriadoId(krId)
        onSuccess()
        setError(`KR criado, mas as metas mensais não: ${erroMetas} Tente de novo ou cadastre em "Editar KR".`)
        setLoading(false)
        return
      }
    }

    setKrCriadoId(null)

    setForm({ titulo: '', responsavel_id: '', setor_id: '', valor_inicial: '0', meta: '', tipo_valor: '', direcao: 'maior', apuracao: 'ultimo' })
    setMetasMensais(Array(12).fill(''))
    onSuccess()
    onClose()
    setLoading(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-base font-semibold text-foreground mb-1">Criar Key Result</h2>
        {objetivoTitulo && (
          <p className="text-xs text-muted-foreground mb-4">Objetivo: {objetivoTitulo}</p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-foreground">Título do KR</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              required
              placeholder="Ex: Aumentar NPS para 70"
              className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Responsável</label>
              <select
                value={form.responsavel_id}
                onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                {funcionarios.map((f) => (
                  <option key={f.id} value={f.id}>{f.full_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Setor</label>
              <select
                value={form.setor_id}
                onChange={(e) => setForm({ ...form, setor_id: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Nenhum</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>{s.name ?? s.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Valor inicial</label>
              <input
                type="number"
                step="any"
                value={form.valor_inicial}
                onChange={(e) => setForm({ ...form, valor_inicial: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <DicaValor valor={form.valor_inicial} tipoValor={form.tipo_valor} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Meta</label>
              <input
                type="number"
                step="any"
                value={form.meta}
                onChange={(e) => setForm({ ...form, meta: e.target.value })}
                required
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <DicaValor valor={form.meta} tipoValor={form.tipo_valor} />
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Tipo</label>
              <select
                value={form.tipo_valor}
                onChange={(e) => setForm({ ...form, tipo_valor: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Selecione</option>
                <option value="Numero">Número</option>
                <option value="Percentual">Percentual</option>
                <option value="Moeda">Moeda</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-foreground">Direção</label>
              <select
                value={form.direcao}
                onChange={(e) => setForm({ ...form, direcao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="maior">Quanto maior, melhor</option>
                <option value="menor">Quanto menor, melhor</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-foreground">Apuração</label>
              <select
                value={form.apuracao}
                onChange={(e) => setForm({ ...form, apuracao: e.target.value })}
                className="mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ultimo">Último lançamento</option>
                <option value="soma">Soma dos lançamentos</option>
                <option value="media">Média dos lançamentos</option>
              </select>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-1">
            Soma: a meta é o total do período (ex.: faturamento do ano). Último: cada lançamento é comparado à meta.
          </p>

          <CamposMetasMensais
            ano={anoMetas}
            onAno={setAnoMetas}
            metas={metasMensais}
            onMetas={setMetasMensais}
            meta={form.meta}
            apuracao={form.apuracao}
            tipoValor={form.tipo_valor}
          />

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-border rounded-xl text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 px-4 bg-primary text-primary-foreground rounded-xl text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Salvando...' : krCriadoId ? 'Salvar metas mensais' : 'Criar KR'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}