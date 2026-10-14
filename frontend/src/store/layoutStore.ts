import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface LayoutState {
  isSidebarCollapsed: boolean;
  isMobileSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
}

export const useLayoutStore = create<LayoutState>()(
  persist(
    (set) => ({
      isSidebarCollapsed: false,
      isMobileSidebarOpen: false,
      toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
      setSidebarCollapsed: (collapsed) => set({ isSidebarCollapsed: collapsed }),
      toggleMobileSidebar: () => set((state) => ({ isMobileSidebarOpen: !state.isMobileSidebarOpen })),
      setMobileSidebarOpen: (open) => set({ isMobileSidebarOpen: open }),
    }),
    {
      name: 'layout-storage',
      partialize: (state) => ({ isSidebarCollapsed: state.isSidebarCollapsed }),
    }
  )
);

