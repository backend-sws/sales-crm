import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen?: boolean;
  open?: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl' | '6xl';
  overflowVisible?: boolean;
  className?: string;
}

const maxWidthClasses = {
  'sm': 'max-w-sm',
  'md': 'max-w-md',
  'lg': 'max-w-lg',
  'xl': 'max-w-xl',
  '2xl': 'max-w-2xl',
  '3xl': 'max-w-3xl',
  '4xl': 'max-w-4xl',
  '5xl': 'max-w-5xl',
  '6xl': 'max-w-6xl',
};

export function Modal({ isOpen, open, onClose, title, description, children, footer, maxWidth = '2xl', overflowVisible = false, className }: ModalProps) {
  const isVisible = isOpen ?? open ?? false;
  if (!isVisible) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-y-auto bg-black/50 backdrop-blur-sm transition-opacity">
      <div 
        className="flex min-h-full items-center justify-center p-4"
        onClick={handleOverlayClick}
      >
        <div 
          className={cn(
            "relative bg-white dark:bg-[#09090b] w-full rounded-2xl shadow-2xl border border-slate-200/80 dark:border-white/10 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200",
            maxWidthClasses[maxWidth],
            overflowVisible ? "overflow-visible" : "overflow-hidden",
            className
          )}
          onClick={e => e.stopPropagation()}
        >
        {/* Floating Close Button when no header */}
        {title === "" && (
          <button 
            onClick={onClose} 
            className="absolute top-3 right-3 z-50 text-slate-400 hover:text-slate-700 dark:text-slate-500 dark:hover:text-white transition-colors p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        
        {/* Header */}
        {title !== "" && (
          <div className="px-4 py-3 border-b border-slate-200/80 dark:border-white/10 flex justify-between items-start shrink-0 bg-slate-50/80 dark:bg-white/[0.01]">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-md hover:bg-slate-100 dark:hover:bg-white/10 mt-0.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className={cn("p-4 custom-scrollbar relative z-20", overflowVisible ? "overflow-visible" : "overflow-y-auto min-h-0")}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-4 py-3 border-t border-slate-200/80 dark:border-white/10 shrink-0 flex justify-end gap-3 bg-slate-50 dark:bg-white/[0.01] relative z-10">
            {footer}
          </div>
        )}
      </div>
      </div>
    </div>,
    document.body
  );
}
