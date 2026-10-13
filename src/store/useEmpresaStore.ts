import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Empresa {
  id: string
  company_name: string
  logo_url?: string
  /** Grupo com vários negócios (ex.: BMG). Cada negócio é uma empresa própria em `clients`. */
  grupo?: string | null
  negocio?: string | null
  negocio_ordem?: number | null
}

interface EmpresaState {
  empresa: Empresa | null
  setEmpresa: (empresa: Empresa | null) => void
  clear: () => void
}

export const useEmpresaStore = create<EmpresaState>()(
  persist(
    (set) => ({
      empresa: null,
      setEmpresa: (empresa) => set({ empresa }),
      clear: () => set({ empresa: null }),
    }),
    {
      name: 'begoal-empresa',
    }
  )
)