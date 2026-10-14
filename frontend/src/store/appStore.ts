import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  appName: string;
  appLogo: string | null;
  appFavicon: string | null;
  setSettings: (settings: { appName?: string; appLogo?: string; appFavicon?: string }) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      appName: 'BillKaro ERP',
      appLogo: null,
      appFavicon: null,
      setSettings: (settings) => set((state) => ({ ...state, ...settings })),
    }),
    {
      name: 'app-storage',
    }
  )
);
