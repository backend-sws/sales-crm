import React from 'react';
import { Search, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';


export interface FilterOption {
  label: string;
  value: string;
}

export interface FilterConfig {
  key: string;
  label: string;
  options: FilterOption[];
}

interface FilterBarProps {
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  activeFilters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
  onClearFilters?: () => void;
}

export function FilterBar({
  searchQuery,
  onSearchChange,
  searchPlaceholder = 'Search...',
  filters = [],
  activeFilters = {},
  onFilterChange,
  onClearFilters
}: FilterBarProps) {
  const hasActiveFilters = Object.keys(activeFilters).some(k => activeFilters[k] !== '');

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 w-full">
      {onSearchChange && (
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute z-10 pointer-events-none left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={searchPlaceholder}
            value={searchQuery || ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 bg-slate-50 dark:bg-black/20 border-slate-200 dark:border-white/10"
          />
        </div>
      )}

      {filters.length > 0 && onFilterChange && (
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0 hide-scrollbar">
          {filters.map((filter) => (
            <Select
              key={filter.key}
              value={activeFilters[filter.key] || ''}
              onChange={(e) => onFilterChange(filter.key, e.target.value)}
              className="w-32 sm:w-40 text-sm h-9 bg-white dark:bg-[#121212]"
            >
              <option value="">All {filter.label}</option>
              {filter.options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </Select>
          ))}

          {hasActiveFilters && onClearFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearFilters}
              className="h-9 px-2 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-4 h-4 mr-1" /> Clear
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
