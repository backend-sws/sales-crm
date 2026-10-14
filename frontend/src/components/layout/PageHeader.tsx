import React from 'react';

export interface Breadcrumb {
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export interface PageHeaderProps {
  icon?: React.ElementType;
  title?: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: React.ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, breadcrumbs, actions }: PageHeaderProps) {
  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 pt-4 mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/80 dark:border-zinc-800/80 shadow-sm">
        <div className="flex items-center gap-3.5 min-w-0 flex-1">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/25 shrink-0">
              <Icon className="w-6 h-6" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {title && (
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight truncate">
                  {title}
                </h1>
              )}
              {breadcrumbs && breadcrumbs.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest pl-2 border-l border-slate-200 dark:border-zinc-800">
                  {breadcrumbs.map((bc, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span>›</span>}
                      <span
                        className={`${bc.onClick ? 'hover:text-primary-600 dark:hover:text-primary-400 cursor-pointer transition-colors' : ''} ${bc.active ? 'text-primary-600 dark:text-primary-400' : ''}`}
                        onClick={bc.onClick}
                      >
                        {bc.label}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
            {subtitle && (
              <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed truncate">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
