'use client'

import { useEffect, useState } from 'react'
import { getObjetivos } from '@/lib/queries/okr'
import { getKrsParaVinculo } from '@/lib/queries/sinais-vitais'

interface CamposVinculoSvProps {
  open: boolean
  clientId?: string
  objetivoId: string
  krId: string
  onChange: (valores: { objetivo_id: string; kr_id: string }) => void
}

const classeSelect =
  'mt-1 w-full px-3 py-2 text-sm rounded-xl border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

// Objetivo e KR do sinal vital. O KR precisa ser do objetivo escolhido:
// escolher um KR acerta o objetivo; trocar o objetivo solta o KR de outro objetivo.
export default function CamposVinculoSv({ open, clientId, objetivoId, krId, onChange }: CamposVinculoSvProps) {
  const [objetivos, setObjetivos] = useState<any[]>([])
  const [krs, setKrs] = useState<any[]>([])

  useEffect(() => {
    if (!open || !clientId) return
    getObjetivos(clientId).then(({ data }) => setObjetivos(data ?? []))
    getKrsParaVinculo(clientId).then(({ data }) => setKrs(data ?? []))
  }, [open, clientId])

  // Objetivo/KR finalizados só aparecem se já forem o vínculo atual.
  const objetivosVisiveis = objetivos.filter((o) => !o.concluido || o.id === objetivoId)
  const krsVisiveis = krs.filter(
    (k) => (!k.concluido || k.id === krId) && (!objetivoId || k.objetivo_id === objetivoId)
  )

  function mudarObjetivo(id: string) {
    const kr = krs.find((k) => k.id === krId)
    onChange({ objetivo_id: id, kr_id: kr && kr.objetivo_id === id ? krId : '' })
  }

  function mudarKr(id: string) {
    const kr = krs.find((k) => k.id === id)
    onChange({ objetivo_id: kr?.objetivo_id ?? objetivoId, kr_id: id })
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="text-xs font-medium text-foreground">Objetivo</label>
        <select value={objetivoId} onChange={(e) => mudarObjetivo(e.target.value)} className={classeSelect}>
          <option value="">Nenhum</option>
          {objetivosVisiveis.map((o) => (
            <option key={o.id} value={o.id}>{o.titulo}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-xs font-medium text-foreground">KR</label>
        <select value={krId} onChange={(e) => mudarKr(e.target.value)} className={classeSelect}>
          <option value="">Nenhum</option>
          {krsVisiveis.map((k) => (
            <option key={k.id} value={k.id}>{k.titulo}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
