import React from 'react';
import { UserCheck, Layers, X, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BulkActionToolbarProps {
  selectedCount: number;
  onOpenReassign: () => void;
  onOpenChangeStage: () => void;
  onOpenMerge?: () => void;
  onClearSelection: () => void;
}

export function BulkActionToolbar({
  selectedCount,
  onOpenReassign,
  onOpenChangeStage,
  onOpenMerge,
  onClearSelection,
}: BulkActionToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-2xl border border-white/15 flex items-center gap-3 sm:gap-4 animate-in slide-in-from-bottom duration-200">
      <span className="text-xs font-semibold whitespace-nowrap">
        {selectedCount} lead{selectedCount > 1 ? 's' : ''} selected
      </span>

      <div className="h-4 w-px bg-white/20" />

      {selectedCount === 2 && onOpenMerge && (
        <Button
          size="sm"
          onClick={onOpenMerge}
          className="h-8 text-xs bg-amber-500 hover:bg-amber-600 text-white rounded-xl gap-1.5 font-bold shadow-sm"
          title="Merge and consolidate these 2 selected leads"
        >
          <GitMerge className="w-3.5 h-3.5" />
          <span>Merge (2)</span>
        </Button>
      )}

      <Button
        size="sm"
        onClick={onOpenReassign}
        className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white rounded-xl gap-1.5"
      >
        <UserCheck className="w-3.5 h-3.5" />
        Reassign
      </Button>

      <Button
        size="sm"
        onClick={onOpenChangeStage}
        className="h-8 text-xs bg-white/10 hover:bg-white/20 text-white rounded-xl gap-1.5"
      >
        <Layers className="w-3.5 h-3.5" />
        Change Stage
      </Button>

      <button
        onClick={onClearSelection}
        className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white"
        title="Clear Selection"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
