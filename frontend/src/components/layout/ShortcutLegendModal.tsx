import { useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { Search, Keyboard, Sparkles, Command, Zap, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useShortcutStore } from '@/store/shortcutStore';

interface ShortcutItem {
  keys: string[];
  description: string;
  category: 'Global' | 'POS & Invoices' | 'Form Controls';
  action?: () => void;
}

export function ShortcutLegendModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'All' | 'Global' | 'POS & Invoices' | 'Form Controls'>('All');
  const { openAddItem, openAddCustomer } = useShortcutStore();

  const shortcuts: ShortcutItem[] = [
    {
      keys: ['Alt', 'I'],
      description: 'Add New Item / Inventory Product',
      category: 'Global',
      action: () => {
        onClose();
        openAddItem();
      },
    },
    {
      keys: ['F2'],
      description: 'Quick Add Item (Alternative)',
      category: 'Global',
      action: () => {
        onClose();
        openAddItem();
      },
    },
    {
      keys: ['Alt', 'C'],
      description: 'Add New Customer / Party Profile',
      category: 'Global',
      action: () => {
        onClose();
        openAddCustomer();
      },
    },
    {
      keys: ['F3'],
      description: 'Quick Add Customer (Alternative)',
      category: 'Global',
      action: () => {
        onClose();
        openAddCustomer();
      },
    },
    {
      keys: ['Alt', 'K'],
      description: 'Toggle Keyboard Shortcut Legend',
      category: 'Global',
    },
    {
      keys: ['?'],
      description: 'Open Shortcut Legend (Outside input fields)',
      category: 'Global',
    },
    {
      keys: ['Esc'],
      description: 'Close active modal / drawer or clear selection',
      category: 'Global',
    },
    {
      keys: ['Ctrl', 'N'],
      description: 'New Bill / Reset POS Cart & Table selection',
      category: 'POS & Invoices',
    },
    {
      keys: ['F9'],
      description: 'Save Draft Invoice / Print Quick KOT',
      category: 'POS & Invoices',
    },
    {
      keys: ['F10'],
      description: 'Save & Print PDF / Place Order',
      category: 'POS & Invoices',
    },
    {
      keys: ['F4'],
      description: 'Send Invoice via WhatsApp directly',
      category: 'POS & Invoices',
    },
    {
      keys: ['Tab'],
      description: 'Focus next form input or button',
      category: 'Form Controls',
    },
    {
      keys: ['Shift', 'Tab'],
      description: 'Focus previous form input or button',
      category: 'Form Controls',
    },
    {
      keys: ['Ctrl', 'Enter'],
      description: 'Submit open form or submit modal',
      category: 'Form Controls',
    },
  ];

  const filteredShortcuts = shortcuts.filter((s) => {
    const matchesTab = activeTab === 'All' || s.category === activeTab;
    const matchesSearch =
      s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.keys.some((k) => k.toLowerCase().includes(searchQuery.toLowerCase())) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const categories: Array<'All' | 'Global' | 'POS & Invoices' | 'Form Controls'> = [
    'All',
    'Global',
    'POS & Invoices',
    'Form Controls',
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-primary-500/20">
            <Keyboard className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              Keyboard Shortcut Legend
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-200 dark:border-primary-500/30">
                Key Map
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Speed up your workflow using application keyboard shortcuts
            </p>
          </div>
        </div>
      }
      maxWidth="2xl"
    >
      <div className="space-y-4 pt-1">
        {/* Search & Categories Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search shortcut key or action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs font-medium rounded-lg bg-slate-50 dark:bg-zinc-900 border border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-primary-500"
            />
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-zinc-900 p-1 rounded-lg border border-slate-200 dark:border-white/5 overflow-x-auto shrink-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                className={cn(
                  'px-2.5 py-1 text-[11px] font-bold rounded-md transition-all whitespace-nowrap',
                  activeTab === cat
                    ? 'bg-white dark:bg-zinc-800 text-primary-600 dark:text-primary-400 shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Shortcuts List */}
        <div className="max-h-[380px] overflow-y-auto pr-1 space-y-2">
          {filteredShortcuts.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                'group flex items-center justify-between p-3 rounded-xl border transition-all duration-200',
                item.action
                  ? 'bg-slate-50/70 hover:bg-primary-50/50 dark:bg-zinc-900/50 dark:hover:bg-primary-500/10 border-slate-200/80 dark:border-white/5 hover:border-primary-300 dark:hover:border-primary-500/30 cursor-pointer'
                  : 'bg-white dark:bg-zinc-900/30 border-slate-100 dark:border-white/5'
              )}
              onClick={() => item.action && item.action()}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-slate-400 group-hover:text-primary-500 transition-colors">
                  {item.category === 'Global' && <Zap className="w-4 h-4 text-amber-500" />}
                  {item.category === 'POS & Invoices' && <Command className="w-4 h-4 text-blue-500" />}
                  {item.category === 'Form Controls' && <Layers className="w-4 h-4 text-emerald-500" />}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {item.description}
                  </p>
                  <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    {item.category}
                  </span>
                </div>
              </div>

              {/* Key Combination Badges */}
              <div className="flex items-center gap-1.5 shrink-0">
                {item.keys.map((k, kIdx) => (
                  <span key={kIdx} className="flex items-center gap-1">
                    {kIdx > 0 && <span className="text-[10px] text-slate-400 font-bold">+</span>}
                    <kbd className="px-2.5 py-1 text-[11px] font-black uppercase tracking-wider font-mono bg-white dark:bg-zinc-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 rounded-md shadow-sm border-b-2 border-b-slate-300 dark:border-b-zinc-700">
                      {k}
                    </kbd>
                  </span>
                ))}
              </div>
            </div>
          ))}

          {filteredShortcuts.length === 0 && (
            <div className="text-center py-8 space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400">No matching shortcuts found</p>
            </div>
          )}
        </div>

        {/* Footer tip */}
        <div className="pt-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded">
              Alt + K
            </kbd>{' '}
            toggles this window anytime.
          </span>
          <span className="text-primary-600 dark:text-primary-400 font-bold">Pro Tip: Click any row to test!</span>
        </div>
      </div>
    </Modal>
  );
}
