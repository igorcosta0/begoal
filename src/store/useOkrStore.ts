import { create } from 'zustand'

interface OkrFilters {
  objetivoId: string | null
  responsavelId: string | null
  setorId: string | null
}

interface OkrState {
  filters: OkrFilters
  setFiltroObjetivo: (id: string | null) => void
  setFiltroResponsavel: (id: string | null) => void
  setFiltroSetor: (id: string | null) => void
  clearFilters: () => void
}

export const useOkrStore = create<OkrState>((set) => ({
  filters: {
    objetivoId: null,
    responsavelId: null,
    setorId: null,
  },
  setFiltroObjetivo: (id) =>
    set((state) => ({ filters: { ...state.filters, objetivoId: id } })),
  setFiltroResponsavel: (id) =>
    set((state) => ({ filters: { ...state.filters, responsavelId: id } })),
  setFiltroSetor: (id) =>
    set((state) => ({ filters: { ...state.filters, setorId: id } })),
  clearFilters: () =>
    set({ filters: { objetivoId: null, responsavelId: null, setorId: null } }),
}))