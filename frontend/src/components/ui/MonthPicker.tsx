import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface MonthPickerProps {
  value: string; // "YYYY-MM"
  onChange: (value: string) => void;
  max?: string; // "YYYY-MM"
  min?: string; // "YYYY-MM"
  className?: string;
  placeholder?: string;
  align?: string;
}

export function MonthPicker({ value, onChange, max, min, className, placeholder = "Select Month", align = 'left' }: MonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse current year and month from value (default to current date if empty or invalid)
  const initialYear = value ? parseInt(value.split('-')[0], 10) : new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(initialYear);

  // Update selectedYear when value changes
  useEffect(() => {
    if (value) {
      const yr = parseInt(value.split('-')[0], 10);
      if (!isNaN(yr)) {
        setSelectedYear(yr);
      }
    }
  }, [value]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handlePrevYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleSelectMonth = (monthIdx: number) => {
    const formattedMonth = String(monthIdx + 1).padStart(2, '0');
    const formattedValue = `${selectedYear}-${formattedMonth}`;
    onChange(formattedValue);
    setIsOpen(false);
  };

  const isSelected = (monthIdx: number) => {
    if (!value) return false;
    const [yrStr, moStr] = value.split('-');
    return parseInt(yrStr, 10) === selectedYear && parseInt(moStr, 10) === monthIdx + 1;
  };

  const isTodayMonth = (monthIdx: number) => {
    const today = new Date();
    return today.getFullYear() === selectedYear && today.getMonth() === monthIdx;
  };

  const isMonthDisabled = (monthIdx: number) => {
    const formattedMonth = String(monthIdx + 1).padStart(2, '0');
    const targetVal = `${selectedYear}-${formattedMonth}`;

    if (max && targetVal > max) return true;
    if (min && targetVal < min) return true;
    return false;
  };

  const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNamesLong = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  // Formatting display text (e.g. "July 2026")
  let displayValue = '';
  if (value) {
    const [yrStr, moStr] = value.split('-');
    const mIdx = parseInt(moStr, 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      displayValue = `${monthNamesLong[mIdx]} ${yrStr}`;
    }
  }

  return (
    <div className={["relative inline-block w-full", className].join(' ')} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(p => !isOpen)}
        className="w-full h-10 px-3 flex items-center justify-between text-left text-base sm:text-sm rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.02] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all cursor-pointer select-none"
      >
        <span className={displayValue ? 'font-semibold' : 'text-slate-400 font-medium'}>
          {displayValue || placeholder}
        </span>
        <CalendarIcon className="w-4 h-4 text-slate-400" />
      </button>

      {isOpen && (
        <div className={[
          "absolute top-11 z-50 mt-1 w-64 p-3 bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/70 animate-in fade-in slide-in-from-top-2 duration-150",
          align === 'right' ? 'right-0' : align === 'left' ? 'left-0' : align
        ].join(' ')}>
          {/* Header (Year Navigation) */}
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-white/5 pb-2">
            <button
              type="button"
              onClick={handlePrevYear}
              className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black tracking-wider text-slate-800 dark:text-white select-none">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={handleNextYear}
              className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Months Grid */}
          <div className="grid grid-cols-3 gap-2">
            {monthNamesShort.map((mName, idx) => {
              const selected = isSelected(idx);
              const disabled = isMonthDisabled(idx);
              const isToday = isTodayMonth(idx);

              return (
                <button
                  key={mName}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectMonth(idx)}
                  className={[
                    "h-10 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none",
                    selected 
                      ? "bg-primary-500 text-white font-black" 
                      : disabled 
                        ? "opacity-20 cursor-not-allowed text-slate-450 dark:text-slate-650" 
                        : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300",
                    isToday && !selected ? "border border-primary-500/50 text-primary-500" : ""
                  ].join(' ')}
                >
                  {mName}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
