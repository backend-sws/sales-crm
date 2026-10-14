import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type LayoutTheme = 'light' | 'dark' | 'semi-dark';
export type PrimaryColor = 'orange' | 'blue' | 'green' | 'purple' | 'rose' | 'slate' | 'teal' | 'red';
export type FontFamily = 'inter' | 'roboto' | 'poppins' | 'jakarta' | 'dmsans' | 'nunito' | 'lato' | 'rubik' | 'cinzel' | 'montserrat';

interface ThemeState {
  theme: LayoutTheme;
  primaryColor: PrimaryColor;
  fontFamily: FontFamily;
  setTheme: (theme: LayoutTheme) => void;
  toggleTheme: () => void;
  setPrimaryColor: (color: PrimaryColor) => void;
  setFontFamily: (font: FontFamily) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      primaryColor: 'teal',
      fontFamily: 'inter',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((state) => ({ theme: (state.theme === 'dark' || state.theme === 'semi-dark') ? 'light' : 'dark' })),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setFontFamily: (font) => set({ fontFamily: font }),
    }),
    {
      name: 'theme-storage-v2',
    }
  )
);
