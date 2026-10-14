import React from "react";

export function CustomKpiCard({ title, value, subtitle, icon, glowColor, onClick }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  glowColor: 'blue' | 'emerald' | 'indigo' | 'purple' | 'amber' | 'rose' | 'cyan' | 'primary';
  onClick?: () => void;
}) {
  const colorMap: Record<string, { bg: string; ring: string; iconBg: string; shape1: string; shape2: string; glow: string }> = {
    primary: {
      bg: "bg-gradient-to-br from-primary-500 via-primary-600 to-primary-700",
      ring: "ring-primary-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-primary-500/40",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-500 via-blue-600 to-blue-700",
      ring: "ring-blue-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-blue-500/40",
    },
    emerald: {
      bg: "bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600",
      ring: "ring-emerald-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-emerald-500/40",
    },
    indigo: {
      bg: "bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700",
      ring: "ring-indigo-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-indigo-500/40",
    },
    purple: {
      bg: "bg-gradient-to-br from-purple-500 via-purple-600 to-fuchsia-700",
      ring: "ring-purple-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-purple-500/40",
    },
    amber: {
      bg: "bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600",
      ring: "ring-amber-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-amber-500/40",
    },
    rose: {
      bg: "bg-gradient-to-br from-rose-400 via-rose-500 to-pink-600",
      ring: "ring-rose-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-rose-500/40",
    },
    cyan: {
      bg: "bg-gradient-to-br from-cyan-400 via-cyan-500 to-sky-600",
      ring: "ring-cyan-400/30",
      iconBg: "bg-white/25",
      shape1: "bg-white/12",
      shape2: "bg-white/6",
      glow: "shadow-cyan-500/40",
    },
  };

  const colors = colorMap[glowColor] ?? colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden group ${onClick ? 'cursor-pointer' : 'cursor-default'}
        rounded-2xl ring-1 ${colors.ring}
        shadow-lg ${colors.glow} hover:shadow-2xl
        hover:-translate-y-1 hover:scale-[1.015]
        transition-all duration-300 ease-out
        p-4 flex flex-col justify-between
        min-h-[88px] w-full
        ${colors.bg}
      `}
    >
      {/* Gloss overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-white/15 via-transparent to-transparent rounded-2xl pointer-events-none" />

      {/* Shape 1 — large circle top-right */}
      <div
        className={`absolute -right-6 -top-6 w-28 h-28 rounded-full ${colors.shape1} blur-[1px] group-hover:scale-125 group-hover:rotate-12 transition-all duration-500`}
      />
      {/* Shape 2 — small rounded square bottom-left */}
      <div
        className={`absolute -left-4 -bottom-4 w-20 h-20 rounded-2xl rotate-12 ${colors.shape2} group-hover:-translate-y-1 group-hover:scale-110 transition-all duration-700`}
      />
      {/* Shape 3 — tiny dot top-left */}
      <div className="absolute top-3 left-3 w-1.5 h-1.5 rounded-full bg-white/30 group-hover:scale-150 transition-all duration-300" />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-2 min-w-0">
        {/* Top row: label + icon */}
        <div className="flex items-start justify-between gap-2">
          <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-[0.18em] text-white select-none drop-shadow-sm leading-snug break-words">
            {title}
          </span>
          <div
            className={`
              p-1.5 rounded-lg flex-shrink-0
              ${colors.iconBg} backdrop-blur-sm
              shadow-sm border border-white/10
              group-hover:scale-110 group-hover:rotate-[12deg]
              transition-all duration-300
            `}
          >
            {React.isValidElement(icon)
              ? React.cloneElement(icon as React.ReactElement<any>, { className: "w-3.5 h-3.5 text-white" })
              : icon}
          </div>
        </div>

        {/* Value */}
        <span
          className="text-lg sm:text-xl xl:text-2xl font-black text-white tracking-tight font-display drop-shadow-md leading-none mt-1"
          title={value.toString()}
        >
          {value}
        </span>

        {/* Subtitle */}
        {subtitle && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-white/90 border-t border-white/20 pt-1.5 mt-0.5 leading-snug break-words">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
