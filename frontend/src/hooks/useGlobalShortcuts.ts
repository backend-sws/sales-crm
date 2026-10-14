import { useEffect } from 'react';
import { useShortcutStore } from '@/store/shortcutStore';

export function useGlobalShortcuts() {
  const { openAddItem, openAddCustomer, toggleLegend, closeAddItem, closeAddCustomer, closeLegend } = useShortcutStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // Alt + I or F2 -> Add New Item
      if ((e.altKey && e.key.toLowerCase() === 'i') || e.key === 'F2') {
        e.preventDefault();
        openAddItem();
        return;
      }

      // Alt + C or F3 -> Add New Customer
      if ((e.altKey && e.key.toLowerCase() === 'c') || e.key === 'F3') {
        e.preventDefault();
        openAddCustomer();
        return;
      }

      // Alt + K -> Toggle Shortcut Legend
      if (e.altKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        toggleLegend();
        return;
      }

      // ? key when NOT typing in an input field -> Toggle Shortcut Legend
      if (e.key === '?' && !isInput && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        toggleLegend();
        return;
      }

      // Escape -> Close any active modal in shortcut store
      if (e.key === 'Escape') {
        closeAddItem();
        closeAddCustomer();
        closeLegend();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [openAddItem, openAddCustomer, toggleLegend, closeAddItem, closeAddCustomer, closeLegend]);
}
