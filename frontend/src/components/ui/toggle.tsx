import { cn } from '@/lib/utils';
interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
}

export function Toggle({ checked, onChange, label, description }: ToggleProps) {
  return (
    <div className={cn("flex items-center", label || description ? "justify-between" : "justify-center")}>
      {(label || description) && (
        <div>
          {label && <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>}
          {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
      )}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-white/75 ${
          checked ? 'bg-primary-500' : 'bg-slate-300 dark:bg-slate-700'
        }`}
      >
        <span className="sr-only">Toggle {label}</span>
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-2' : '-translate-x-2'
          }`}
        />
      </button>
    </div>
  );
}
