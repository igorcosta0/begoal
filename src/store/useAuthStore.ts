import { create } from 'zustand'

interface User {
  id: string
  email: string
  full_name?: string
  avatar_url?: string
}

interface AuthState {
  user: User | null
  role: string | null
  setUser: (user: User | null) => void
  setRole: (role: string | null) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  role: null,
  setUser: (user) => set({ user }),
  setRole: (role) => set({ role }),
  clear: () => set({ user: null, role: null }),
}))