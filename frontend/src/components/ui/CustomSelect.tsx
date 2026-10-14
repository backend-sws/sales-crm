import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value?: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  label?: string;
  className?: string;
  disabled?: boolean;
  id?: string;
  menuPlacement?: 'top' | 'bottom';
  menuPosition?: 'absolute' | 'fixed';
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select option',
  label,
  className,
  disabled = false,
  id,
  menuPlacement = 'bottom',
  menuPosition = 'absolute',
}: CustomSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement>(null);

  const selected = options.find(o => o.value === value);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        ref.current && 
        !ref.current.contains(e.target as Node) &&
        (!portalRef.current || !portalRef.current.contains(e.target as Node))
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && menuPosition === 'fixed' && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      if (menuPlacement === 'top') {
        setDropdownStyle({
          position: 'fixed',
          bottom: window.innerHeight - rect.top + 6,
          left: rect.left,
          width: rect.width,
        });
      } else {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 6,
          left: rect.left,
          width: rect.width,
        });
      }
    } else if (open) {
      setDropdownStyle({});
    }
    setOpen(prev => !prev);
  };

  return (
    <div className={cn('relative', className)} ref={ref} id={id}>
      {label && (
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-1.5">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between gap-2 h-9 px-3 rounded-xl text-sm font-medium',
          'bg-white dark:bg-white/[0.04]',
          'border transition-all duration-200',
          'text-left select-none',
          open
            ? 'border-primary-400 dark:border-primary-500 ring-2 ring-primary-500/20 shadow-sm'
            : 'border-slate-200 dark:border-white/10 hover:border-primary-300 dark:hover:border-primary-500/40',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn(
          'truncate',
          selected ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-600'
        )}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn(
          'w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200',
          open && 'rotate-180 text-primary-500'
        )} />
      </button>

      {/* Dropdown panel — no scrollbar, max-h with overflow hidden */}
      {open && (
        menuPosition === 'fixed' 
          ? createPortal(
              <div 
                ref={portalRef}
                style={dropdownStyle}
                className={cn(
                'z-[9999]',
                'bg-white dark:bg-[#111118]',
                'border border-slate-200 dark:border-white/10',
                'rounded-xl shadow-2xl shadow-black/20',
                'overflow-hidden',
                'animate-in fade-in zoom-in-95 duration-150',
              )}>
                {options.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
                    No options available
                  </div>
                ) : (
                  <div className="py-1 max-h-60 overflow-y-auto hide-scrollbar">
                    {options.map(opt => {
                      const isSelected = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => { onChange(opt.value); setOpen(false); }}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition-all duration-150',
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                            opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                          )}
                        >
                          <div className="min-w-0">
                            <p className={cn('font-semibold truncate text-xs', isSelected && 'font-bold')}>
                              {opt.label}
                            </p>
                            {opt.description && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{opt.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>,
              document.body
            )
          : (
              <div 
                style={dropdownStyle}
                className={cn(
                'absolute left-0 right-0',
                menuPlacement === 'top' ? 'bottom-full mb-1.5 origin-bottom' : 'mt-1.5 origin-top',
                'z-[9999]',
                'bg-white dark:bg-[#111118]',
                'border border-slate-200 dark:border-white/10',
                'rounded-xl shadow-2xl shadow-black/20',
                'overflow-hidden',
                'animate-in fade-in zoom-in-95 duration-150',
              )}>
                {options.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-slate-400 dark:text-slate-600">
                    No options available
                  </div>
                ) : (
                  <div className="py-1 max-h-60 overflow-y-auto hide-scrollbar">
                    {options.map(opt => {
                      const isSelected = opt.value === value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          disabled={opt.disabled}
                          onClick={() => { onChange(opt.value); setOpen(false); }}
                          className={cn(
                            'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-left transition-all duration-150',
                            isSelected
                              ? 'bg-primary-50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/[0.04]',
                            opt.disabled && 'opacity-40 cursor-not-allowed pointer-events-none',
                          )}
                        >
                          <div className="min-w-0">
                            <p className={cn('font-semibold truncate text-xs', isSelected && 'font-bold')}>
                              {opt.label}
                            </p>
                            {opt.description && (
                              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{opt.description}</p>
                            )}
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )
      )}
    </div>
  );
}
