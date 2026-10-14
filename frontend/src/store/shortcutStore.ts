import { create } from 'zustand';

interface ShortcutState {
  isAddItemOpen: boolean;
  isAddCustomerOpen: boolean;
  isLegendOpen: boolean;
  openAddItem: () => void;
  closeAddItem: () => void;
  openAddCustomer: () => void;
  closeAddCustomer: () => void;
  openLegend: () => void;
  closeLegend: () => void;
  toggleLegend: () => void;
}

export const useShortcutStore = create<ShortcutState>((set) => ({
  isAddItemOpen: false,
  isAddCustomerOpen: false,
  isLegendOpen: false,
  openAddItem: () => set({ isAddItemOpen: true }),
  closeAddItem: () => set({ isAddItemOpen: false }),
  openAddCustomer: () => set({ isAddCustomerOpen: true }),
  closeAddCustomer: () => set({ isAddCustomerOpen: false }),
  openLegend: () => set({ isLegendOpen: true }),
  closeLegend: () => set({ isLegendOpen: false }),
  toggleLegend: () => set((state) => ({ isLegendOpen: !state.isLegendOpen })),
}));
