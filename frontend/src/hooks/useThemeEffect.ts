import { useEffect } from "react";
import { useThemeStore, type PrimaryColor } from "@/store/themeStore";

const COLOR_PALETTES: Record<PrimaryColor, Record<string, string>> = {
  teal: {
    "--primary-50": "#f0fdfa",
    "--primary-100": "#ccfbf1",
    "--primary-200": "#99f6e4",
    "--primary-300": "#5eead4",
    "--primary-400": "#2dd4bf",
    "--primary-500": "#14b8a6",
    "--primary-600": "#0d9488",
    "--primary-700": "#0f766e",
    "--primary-800": "#115e59",
    "--primary-900": "#134e4a",
    "--primary-950": "#042f2e",
  },
  blue: {
    "--primary-50": "#eff6ff",
    "--primary-100": "#dbeafe",
    "--primary-200": "#bfdbfe",
    "--primary-300": "#93c5fd",
    "--primary-400": "#60a5fa",
    "--primary-500": "#3b82f6",
    "--primary-600": "#2563eb",
    "--primary-700": "#1d4ed8",
    "--primary-800": "#1e40af",
    "--primary-900": "#1e3a8a",
    "--primary-950": "#172554",
  },
  purple: {
    "--primary-50": "#faf5ff",
    "--primary-100": "#f3e8ff",
    "--primary-200": "#e9d5ff",
    "--primary-300": "#d8b4fe",
    "--primary-400": "#c084fc",
    "--primary-500": "#a855f7",
    "--primary-600": "#9333ea",
    "--primary-700": "#7e22ce",
    "--primary-800": "#6b21a8",
    "--primary-900": "#581c87",
    "--primary-950": "#3b0764",
  },
  orange: {
    "--primary-50": "#fff7ed",
    "--primary-100": "#ffedd5",
    "--primary-200": "#fed7aa",
    "--primary-300": "#fdba74",
    "--primary-400": "#fb923c",
    "--primary-500": "#f97316",
    "--primary-600": "#ea580c",
    "--primary-700": "#c2410c",
    "--primary-800": "#9a3412",
    "--primary-900": "#7c2d12",
    "--primary-950": "#431407",
  },
  green: {
    "--primary-50": "#f0fdf4",
    "--primary-100": "#dcfce7",
    "--primary-200": "#bbf7d0",
    "--primary-300": "#86efac",
    "--primary-400": "#4ade80",
    "--primary-500": "#22c55e",
    "--primary-600": "#16a34a",
    "--primary-700": "#15803d",
    "--primary-800": "#166534",
    "--primary-900": "#14532d",
    "--primary-950": "#052e16",
  },
  rose: {
    "--primary-50": "#fff1f2",
    "--primary-100": "#ffe4e6",
    "--primary-200": "#fecdd3",
    "--primary-300": "#fda4af",
    "--primary-400": "#fb7185",
    "--primary-500": "#f43f5e",
    "--primary-600": "#e11d48",
    "--primary-700": "#be123c",
    "--primary-800": "#9f1239",
    "--primary-900": "#881337",
    "--primary-950": "#4c0519",
  },
  red: {
    "--primary-50": "#fef2f2",
    "--primary-100": "#fee2e2",
    "--primary-200": "#fecaca",
    "--primary-300": "#fca5a5",
    "--primary-400": "#f87171",
    "--primary-500": "#ef4444",
    "--primary-600": "#dc2626",
    "--primary-700": "#b91c1c",
    "--primary-800": "#991b1b",
    "--primary-900": "#7f1d1d",
    "--primary-950": "#450a0a",
  },
  slate: {
    "--primary-50": "#f8fafc",
    "--primary-100": "#f1f5f9",
    "--primary-200": "#e2e8f0",
    "--primary-300": "#cbd5e1",
    "--primary-400": "#94a3b8",
    "--primary-500": "#64748b",
    "--primary-600": "#475569",
    "--primary-700": "#334155",
    "--primary-800": "#1e293b",
    "--primary-900": "#0f172a",
    "--primary-950": "#020617",
  },
};

export function useThemeEffect() {
  const { theme, primaryColor, fontFamily } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;

    // Toggle dark class
    if (theme === "dark" || theme === "semi-dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply color palette CSS variables
    const palette = COLOR_PALETTES[primaryColor] || COLOR_PALETTES.teal;
    Object.entries(palette).forEach(([varName, val]) => {
      root.style.setProperty(varName, val);
    });

    // Apply font family
    root.style.setProperty("--font-primary", fontFamily);
  }, [theme, primaryColor, fontFamily]);
}
