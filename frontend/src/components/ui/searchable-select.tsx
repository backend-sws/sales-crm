import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, X, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SearchableSelectOption {
  value: string | number;
  label: string;
  description?: string;
  searchString?: string;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value: string | number;
  onChange: (value: string | number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
  creatable?: boolean;
  onCreate?: (inputValue: string) => void | Promise<void>;
  controlSize?: 'default' | 'sm';
  dropdownPlacement?: 'top' | 'bottom';
  menuPosition?: 'absolute' | 'fixed';
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Select option...",
  className,
  disabled = false,
  error,
  creatable = false,
  onCreate,
  controlSize = 'default',
  dropdownPlacement = 'bottom',
  menuPosition = 'absolute',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => String(opt.value).toLowerCase() === String(value).toLowerCase());

  const filteredOptions = options.filter((opt) => {
    const term = search.toLowerCase();
    const labelStr = opt.label ? String(opt.label).toLowerCase() : '';
    const descStr = opt.description ? String(opt.description).toLowerCase() : '';
    const searchStr = opt.searchString ? String(opt.searchString).toLowerCase() : '';
    return (
      labelStr.includes(term) ||
      descStr.includes(term) ||
      searchStr.includes(term)
    );
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        // Also check if clicking inside the portal
        const portalEl = document.getElementById('searchable-select-portal');
        if (portalEl && portalEl.contains(event.target as Node)) {
          return;
        }
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Reset search term when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearch("");
    }
  }, [isOpen]);

  const handleSelect = (val: string | number) => {
    onChange(val);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && menuPosition === 'fixed' && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      if (dropdownPlacement === 'top') {
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
    } else if (isOpen) {
      setDropdownStyle({});
    }
    setIsOpen(!isOpen);
  };

  // Update position on scroll if fixed
  useEffect(() => {
    if (isOpen && menuPosition === 'fixed') {
      const handleScroll = () => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          if (dropdownPlacement === 'top') {
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
        }
      };
      window.addEventListener('scroll', handleScroll, true); // true for capturing phase to catch scroll in all containers
      return () => window.removeEventListener('scroll', handleScroll, true);
    }
  }, [isOpen, menuPosition, dropdownPlacement]);

  const handleCreate = async () => {
    if (!onCreate || !search) return;
    try {
      setIsCreating(true);
      await onCreate(search);
      setSearch('');
      setIsOpen(false);
    } finally {
      setIsCreating(false);
    }
  };

  const menuContent = (
    <div 
      className={cn(
        "absolute z-50 w-full min-w-[140px] rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#111115] shadow-2xl p-2 animate-in fade-in duration-200",
        menuPosition === 'fixed' ? '' : (dropdownPlacement === 'top' ? "bottom-full mb-2 slide-in-from-bottom-2" : "mt-2 slide-in-from-top-2")
      )}
      style={menuPosition === 'fixed' ? dropdownStyle : undefined}
    >
      <div className="relative flex items-center mb-1.5 bg-slate-50 dark:bg-black/20 rounded-lg px-3 py-2 border border-slate-100 dark:border-white/5">
        <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
        <input
          type="text"
          autoFocus
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (creatable && search && !options.some(opt => opt.label.toLowerCase() === search.toLowerCase())) {
                if (onCreate) {
                  handleCreate();
                } else {
                  handleSelect(search);
                  setSearch('');
                  setIsOpen(false);
                }
              } else if (filteredOptions.length > 0) {
                handleSelect(filteredOptions[0].value);
              }
            }
          }}
          className="w-full bg-transparent text-sm focus:outline-none text-slate-900 dark:text-white font-medium"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="max-h-40 overflow-y-auto custom-scrollbar space-y-0.5">
        {filteredOptions.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs font-semibold text-slate-400">
            No matching options found
          </div>
        ) : (
          filteredOptions.map((opt) => {
            const isSelected = String(opt.value) === String(value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleSelect(opt.value)}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-sm text-left rounded-lg font-medium transition-colors",
                  isSelected
                    ? "bg-primary-500/10 text-primary-600 dark:text-primary-500"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5"
                )}
              >
                <div className="flex flex-col text-left max-w-[90%]">
                  <span className="truncate">{opt.label}</span>
                  {opt.description && <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{opt.description}</span>}
                </div>
                {isSelected && <Check className="h-4 w-4 text-primary-500 shrink-0" />}
              </button>
            );
          })
        )}
        
        {creatable && search && !options.some(opt => opt.label.toLowerCase() === search.toLowerCase()) && (
          <button
            type="button"
            disabled={isCreating}
            onClick={() => {
              if (onCreate) {
                handleCreate();
              } else {
                handleSelect(search);
                setSearch('');
                setIsOpen(false);
              }
            }}
            className="flex w-full items-center justify-between px-3 py-2 text-sm text-left rounded-lg font-medium transition-colors text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 border border-transparent hover:border-primary-100 dark:hover:border-primary-500/20 mt-1 disabled:opacity-50"
          >
            <span className="truncate">
              {isCreating ? `Creating "${search}"...` : `Create "${search}"`}
            </span>
            <Plus className={cn("h-4 w-4 shrink-0", isCreating && "animate-spin")} />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "flex w-full items-center justify-between border select-none transition-all duration-200 text-left shadow-sm cursor-pointer",
          controlSize === 'sm' 
            ? "h-9 px-3 text-xs rounded-xl font-medium" 
            : "h-11 px-4 text-sm rounded-xl font-medium",
          isOpen
            ? "border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-zinc-900"
            : "border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary-400 dark:hover:border-primary-500/60",
          error && "border-rose-500 focus:ring-rose-500/10 focus:border-rose-500",
          className
        )}
      >
        <span className={cn(
          "truncate",
          (selectedOption && selectedOption.value !== '') || (creatable && value)
            ? "text-black dark:text-white font-bold"
            : "text-slate-700 dark:text-zinc-300 font-semibold"
        )}>
          {selectedOption ? selectedOption.label : (creatable && value ? String(value) : placeholder)}
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 text-slate-500 shrink-0 transition-transform duration-200", 
          isOpen && "rotate-180 text-primary-500"
        )} />
      </button>

      {isOpen && (
        menuPosition === 'fixed' 
          ? createPortal(<div id="searchable-select-portal" className="relative z-[99999]">{menuContent}</div>, document.body)
          : menuContent
      )}
    </div>
  );
}
