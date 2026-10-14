import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './modal';
import { Button } from './button';
import { Input } from './input';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  itemName?: string;
  isLoading?: boolean;
  requireConfirmationText?: boolean;
}

export function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = 'DELETE',
  itemName,
  isLoading,
  requireConfirmationText = false,
}: DeleteConfirmModalProps) {
  const [inputValue, setInputValue] = useState('');

  // Reset input when modal opens or closes
  useEffect(() => {
    if (!isOpen) {
      setInputValue('');
    }
  }, [isOpen]);

  const handleConfirm = () => {
    if (!requireConfirmationText || inputValue.toLowerCase() === confirmText.toLowerCase()) {
      onConfirm();
      onClose();
    }
  };

  const isConfirmed = !requireConfirmationText || (inputValue.toLowerCase() === confirmText.toLowerCase());

  const footer = (
    <div className="flex justify-end gap-3 w-full">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={onClose}
        disabled={isLoading}
        className="rounded-xl h-10 px-5 text-xs font-bold border-slate-200 dark:border-white/10"
      >
        Cancel
      </Button>
      <Button
        variant="destructive"
        size="sm"
        disabled={!isConfirmed || isLoading}
        onClick={handleConfirm}
        className="rounded-xl h-10 px-5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 disabled:opacity-50"
      >
        {isLoading ? 'Deleting...' : (confirmText !== 'DELETE' ? confirmText : 'Confirm Delete')}
      </Button>
    </div>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={footer}
      maxWidth="md"
    >
      <div className="space-y-4 text-left">
        <div className="flex gap-4 items-start p-4 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/30">
          <div className="w-10 h-10 shrink-0 bg-rose-100 dark:bg-rose-900/50 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-rose-900 dark:text-rose-100">
              Warning: Destructive Action
            </h4>
            <p className="text-xs text-rose-700 dark:text-rose-300 mt-1 leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        {itemName && (
          <div className="p-3 bg-slate-50 dark:bg-zinc-900/50 rounded-xl border border-slate-100 dark:border-white/5">
            <span className="text-xs text-slate-500 dark:text-slate-400">Item being deleted:</span>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
              {itemName}
            </div>
          </div>
        )}

        {requireConfirmationText && (
          <div className="space-y-2 pt-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Type <span className="font-mono bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded text-rose-600 dark:text-rose-400 font-extrabold">{confirmText}</span> to confirm deletion
            </label>
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={`Type ${confirmText}`}
              className="h-10 text-sm font-medium rounded-xl"
              autoFocus
            />
          </div>
        )}
      </div>
    </Modal>
  );
}
