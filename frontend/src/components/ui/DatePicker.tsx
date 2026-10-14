import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, isValid } from 'date-fns';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (value: string) => void;
  max?: string;
  min?: string;
  className?: string;
  placeholder?: string;
  align?: string;
  controlSize?: 'default' | 'sm' | 'lg';
}

export function DatePicker({ 
  value, 
  onChange, 
  max, 
  min, 
  className, 
  placeholder = "Select Date", 
  align = 'left',
  controlSize = 'default' 
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Parse state date
  const parsedDate = value ? new Date(value) : new Date();
  const [currentMonth, setCurrentMonth] = useState(isValid(parsedDate) ? parsedDate : new Date());

  // Update currentMonth if value changes from outside
  useEffect(() => {
    if (value) {
      const d = new Date(value);
      if (isValid(d)) {
        setCurrentMonth(d);
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

  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  // Days in month
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Generate days grid
  const days = [];
  // Empty slots for previous month padding
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  const handleSelectDay = (date: Date) => {
    const formatted = format(date, 'yyyy-MM-dd');
    onChange(formatted);
    setIsOpen(false);
  };

  const isSelected = (date: Date) => {
    if (!value) return false;
    const d = new Date(value);
    return d.getDate() === date.getDate() &&
           d.getMonth() === date.getMonth() &&
           d.getFullYear() === date.getFullYear();
  };

  const isTodayDate = (date: Date) => {
    const today = new Date();
    return today.getDate() === date.getDate() &&
           today.getMonth() === date.getMonth() &&
           today.getFullYear() === date.getFullYear();
  };

  const isDateDisabled = (date: Date) => {
    if (max) {
      const maxDate = new Date(max);
      maxDate.setHours(23, 59, 59, 999);
      if (date > maxDate) return true;
    }
    if (min) {
      const minDate = new Date(min);
      minDate.setHours(0, 0, 0, 0);
      if (date < minDate) return true;
    }
    return false;
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const weekDays = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  // Display value formatting
  const displayValue = value ? format(new Date(value), 'dd/MM/yyyy') : '';

  return (
    <div className={cn("relative inline-block w-full", className)} ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(p => !isOpen)}
        className={cn(
          "group w-full flex items-center justify-between gap-2 border transition-all duration-200 select-none cursor-pointer text-left shadow-sm",
          // Height and padding based on controlSize
          controlSize === 'sm' 
            ? "h-9 px-3 text-xs rounded-xl font-medium" 
            : "h-11 px-4 text-sm rounded-xl font-medium",
          // Active state (open dropdown) vs normal
          isOpen 
            ? "border-primary-500 dark:border-primary-500 ring-2 ring-primary-500/20 bg-white dark:bg-zinc-900" 
            : "border-slate-300 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-primary-400 dark:hover:border-primary-500",
          // Text color
          displayValue 
            ? "text-black dark:text-white font-bold" 
            : "text-black/80 dark:text-zinc-400 font-semibold"
        )}
      >
        <span className="truncate whitespace-nowrap">
          {displayValue || placeholder}
        </span>
        <CalendarIcon className={cn(
          "w-4 h-4 shrink-0 transition-colors duration-200",
          displayValue 
            ? "text-primary-500" 
            : "text-black/80 dark:text-zinc-400 group-hover:text-primary-500"
        )} />
      </button>

      {isOpen && (
        <div className={cn(
          "absolute top-full z-50 mt-1.5 w-72 p-3 bg-white dark:bg-[#111118] border border-slate-200 dark:border-white/10 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-black/70 animate-in fade-in slide-in-from-top-2 duration-150",
          align === 'right' ? 'right-0' : 'left-0'
        )}>
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-white select-none">
              {monthNames[month]} {year}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekDays.map(d => (
              <span key={d} className="text-[10px] font-black uppercase text-slate-450 dark:text-slate-550 select-none">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((date, idx) => {
              if (!date) return <div key={`empty-${idx}`} />;
              const selected = isSelected(date);
              const disabled = isDateDisabled(date);
              const isToday = isTodayDate(date);

              return (
                <button
                  key={date.toISOString()}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleSelectDay(date)}
                  className={[
                    "h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center cursor-pointer select-none",
                    selected 
                      ? "bg-primary-500 text-white font-black" 
                      : disabled 
                        ? "opacity-20 cursor-not-allowed text-slate-450 dark:text-slate-650" 
                        : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300",
                    isToday && !selected ? "border border-primary-500/50 text-primary-500" : ""
                  ].join(' ')}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
