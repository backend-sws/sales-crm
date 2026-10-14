import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Business } from '@/types/business';
import api from '@/lib/api';

interface TenantState {
  businesses: Business[];
  activeBusiness: Business | null;
  isLoading: boolean;
  hasFetched: boolean;
  
  fetchBusinesses: () => Promise<void>;
  setActiveBusiness: (business: Business | null) => void;
  clearActiveBusiness: () => void;
  addBusiness: (business: Business) => void;
  updateBusiness: (business: Business) => void;
  reset: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set, get) => ({
      businesses: [],
      activeBusiness: null,
      isLoading: false,
      hasFetched: false,

      fetchBusinesses: async () => {
        set({ isLoading: true });
        try {
          const res = await api.get('/businesses');
          const businesses = res.data.data ?? [];
          
          let active = get().activeBusiness;
          if (businesses.length === 0) {
            active = null;
          } else if (active) {
            const currentActive = active;
            const freshActive = businesses.find((b: Business) => b.id === currentActive.id);
            if (freshActive) {
              active = freshActive;
            } else {
              active = businesses[0];
            }
          } else {
            active = businesses[0];
          }

          set({ businesses, activeBusiness: active, isLoading: false, hasFetched: true });
        } catch (error) {
          console.error("Failed to fetch businesses", error);
          set({ isLoading: false, hasFetched: true });
        }
      },

      setActiveBusiness: (business) => set({ activeBusiness: business }),
      clearActiveBusiness: () => set({ activeBusiness: null }),
      
      addBusiness: (business) => set((state) => ({ 
        businesses: [...state.businesses, business],
        activeBusiness: business // Automatically switch to newly created business
      })),

      updateBusiness: (updatedBusiness) => set((state) => ({
        businesses: state.businesses.map(b => b.id === updatedBusiness.id ? updatedBusiness : b),
        activeBusiness: state.activeBusiness?.id === updatedBusiness.id ? updatedBusiness : state.activeBusiness
      })),

      reset: () => set({ businesses: [], activeBusiness: null, isLoading: false, hasFetched: false }),
    }),
    {
      name: 'tenant-storage',
      partialize: (state) => ({ activeBusiness: state.activeBusiness }),
    }
  )
);
