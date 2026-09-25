'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEmpresaStore } from '@/store/useEmpresaStore'

// Pente fino (A1): sem empresa selecionada (dispositivo novo, navegador limpo,
// ou empresa da qual a pessoa perdeu acesso) as páginas ficavam no esqueleto
// de carregamento para sempre. Aqui, depois de ler o localStorage, manda para
// a seleção de empresa.
export default function EmpresaGuard({
  empresasPermitidas,
  children,
}: {
  empresasPermitidas: string[]
  children: React.ReactNode
}) {
  const router = useRouter()
  const { empresa, clear } = useEmpresaStore()
  // Começa sempre em false (igual ao HTML do servidor) e só depois do
  // primeiro efeito olha o localStorage — evita diferença de hidratação.
  const [hidratado, setHidratado] = useState(false)

  useEffect(() => {
    if (useEmpresaStore.persist.hasHydrated()) {
      setHidratado(true)
      return
    }
    return useEmpresaStore.persist.onFinishHydration(() => setHidratado(true))
  }, [])

  const semAcesso = !!empresa && !empresasPermitidas.includes(empresa.id)
  const precisaEscolher = hidratado && (!empresa || semAcesso)

  useEffect(() => {
    if (!precisaEscolher) return
    if (semAcesso) clear()
    router.replace('/selecao-empresa')
  }, [precisaEscolher, semAcesso, clear, router])

  if (!hidratado || precisaEscolher) {
    return (
      <div className="py-24 text-center text-sm text-muted-foreground">Carregando...</div>
    )
  }

  return <>{children}</>
}
