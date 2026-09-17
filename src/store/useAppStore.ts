import { create } from 'zustand'
import type { User } from '@/types'

interface AppStore {
  // Пользователь (хранится в localStorage)
  user: User | null
  isReady: boolean  // флаг готовности — true после проверки токена

  // UI состояние
  isLoginModalOpen: boolean
  selectedMonth: string
  selectedCarId: string | null

  // Действия
  setUser: (user: User | null) => void
  setReady: (ready: boolean) => void
  setUserAndReady: (user: User | null, ready: boolean) => void
  openLoginModal: () => void
  closeLoginModal: () => void
  setSelectedMonth: (month: string) => void
  setSelectedCarId: (id: string | null) => void
}

export const useAppStore = create<AppStore>((set) => ({
  user: null,
  isReady: false,
  isLoginModalOpen: false,
  selectedMonth: new Date().toISOString().slice(0, 7),
  selectedCarId: null,

  setUser: (user) => set({ user }),
  setReady: (ready) => set({ isReady: ready }),
  setUserAndReady: (user: User | null, ready: boolean) => set({ user, isReady: ready }),
  openLoginModal: () => set({ isLoginModalOpen: true }),
  closeLoginModal: () => set({ isLoginModalOpen: false }),
  setSelectedMonth: (month) => set({ selectedMonth: month }),
  setSelectedCarId: (id) => set({ selectedCarId: id }),
}))
