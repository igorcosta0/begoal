'use client'

import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Pente fino (itens "Baixo"): vários pontos excluíam no primeiro clique, sem
// confirmação. Primeiro clique arma o botão ("Excluir?"), o segundo exclui;
// volta ao normal sozinho depois de 4s.
export default function BotaoExcluirConfirmando({
  onConfirmar,
  disabled,
  className,
  iconClassName = 'w-3.5 h-3.5',
  title = 'Excluir',
}: {
  onConfirmar: () => void | Promise<void>
  disabled?: boolean
  className?: string
  iconClassName?: string
  title?: string
}) {
  const [armado, setArmado] = useState(false)

  useEffect(() => {
    if (!armado) return
    const t = setTimeout(() => setArmado(false), 4000)
    return () => clearTimeout(t)
  }, [armado])

  return (
    <button
      type="button"
      disabled={disabled}
      title={armado ? 'Clique de novo para confirmar' : title}
      onClick={(e) => {
        e.stopPropagation()
        if (!armado) {
          setArmado(true)
          return
        }
        setArmado(false)
        onConfirmar()
      }}
      className={cn(
        'inline-flex items-center gap-1 rounded-lg p-1.5 transition-colors disabled:opacity-50',
        armado
          ? 'bg-destructive/10 text-destructive text-[11px] font-semibold px-2'
          : 'text-muted-foreground hover:bg-accent hover:text-destructive',
        className
      )}
    >
      <Trash2 className={iconClassName} />
      {armado && 'Excluir?'}
    </button>
  )
}
