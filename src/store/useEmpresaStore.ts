import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface Empresa {
  id: string
  company_name: string
  logo_url?: string
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