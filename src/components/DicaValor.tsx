'use client'

import { formatValor } from '@/lib/utils'

// Pente fino (M11): percentual é guardado como fração (0,8 = 80%), mas os
// campos não diziam isso — quem digitava 80 via "8.000%". Mostra como o valor
// digitado vai aparecer no sistema.
export default function DicaValor({ valor, tipoValor }: { valor: string; tipoValor?: string | null }) {
  if (tipoValor !== 'Percentual') return null
  const numero = parseFloat(valor)
  return (
    <p className="mt-1 text-[11px] text-muted-foreground">
      Percentual em fração: digite 0,8 para 80%.
      {valor !== '' && !Number.isNaN(numero) && (
        <> Vai aparecer como <span className="font-semibold text-foreground">{formatValor(numero, 'Percentual')}</span>.</>
      )}
    </p>
  )
}
