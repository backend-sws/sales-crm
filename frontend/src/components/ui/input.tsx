import * as React from "react"
import { cn } from "../../lib/utils"
import { Eye, EyeOff } from "lucide-react"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
  controlSize?: 'default' | 'sm';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, icon, controlSize = 'default', ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === "password";
    const inputType = isPassword ? (showPassword ? "text" : "password") : type;

    return (
      <div className="w-full">
        <div className="relative group">
          {icon && (
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none group-focus-within:text-primary-500 transition-colors text-zinc-400">
              {icon}
            </div>
          )}
          <input
            type={inputType}
            className={cn(
              "block w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-400 dark:focus:border-primary-500 transition-all font-medium text-slate-900 dark:text-white shadow-sm placeholder:text-slate-400 dark:placeholder:text-zinc-500 [color-scheme:light] dark:[color-scheme:dark]",
              controlSize === 'sm' 
                ? "h-9 py-1.5 px-3 text-xs rounded-xl" 
                : "h-11 py-2.5 px-5 text-sm rounded-lg",
              icon ? (controlSize === 'sm' ? "pl-10" : "pl-14") : (controlSize === 'sm' ? "pl-3" : "pl-5"),
              isPassword ? (controlSize === 'sm' ? "pr-10" : "pr-14") : (controlSize === 'sm' ? "pr-3" : "pr-5"),
              error && "border-red-500 focus:ring-red-500/10 focus:border-red-500",
              className
            )}
            ref={ref}
            min={type === "number" && props.min === undefined ? "0" : props.min}
            onWheel={(e) => {
              if (type === "number") {
                (e.target as HTMLInputElement).blur();
              }
              props.onWheel?.(e);
            }}
            onKeyDown={(e) => {
              if (type === "number" && (e.key === "-" || e.key === "e" || e.key === "E" || e.key === "+")) {
                e.preventDefault();
              }
              props.onKeyDown?.(e);
            }}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-5 flex items-center text-zinc-400 hover:text-white focus:outline-none transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          )}
        </div>
        {error && (
          <p className="text-xs text-red-500 mt-2 ml-1 font-medium animate-in slide-in-from-top-1 fade-in-0 duration-300">
            {error}
          </p>
        )}
      </div>
    )
  }
)
Input.displayName = "Input"

export { Input }
