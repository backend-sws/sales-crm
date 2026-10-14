import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Drawer({ isOpen, onClose, title, subtitle, children, className }: DrawerProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[100] transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Drawer */}
      <div 
        className={cn(
          "fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-[#111115] shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-300",
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10 shrink-0">
          <div>
            <h2 className="font-bold text-lg text-slate-800 dark:text-white">{title}</h2>
            {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar min-h-0">
          {children}
        </div>
      </div>
    </>,
    document.body
  );
}
