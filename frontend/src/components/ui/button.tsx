import * as React from "react"
import { cn } from "../../lib/utils"

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "gradient" | "brand" | "destructive"
  size?: "default" | "sm" | "lg" | "icon"
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "brand", size = "default", isLoading, loadingText, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed group gap-3",
          {
            "bg-blue-600 text-white hover:bg-blue-700": variant === "default",
            "bg-gradient-to-r from-primary to-orange-500 text-primary-foreground hover:brightness-110 shadow-[0_4px_20px_rgba(234,88,12,0.3)] border border-primary/50": variant === "gradient",
            "border border-border bg-input-bg hover:bg-muted text-foreground": variant === "outline",
            "hover:bg-muted text-foreground": variant === "ghost",
            "bg-rose-500 hover:bg-rose-600 text-white shadow-md": variant === "destructive",
            "bg-primary-500 hover:bg-primary-600 text-white shadow-xl shadow-primary-500/30 hover:shadow-primary-500/40 hover:-translate-y-1": variant === "brand",
          },
          {
            "h-10 px-4 text-sm rounded-xl": size === "default",
            "h-8 px-3 text-xs rounded-lg": size === "sm",
            "h-12 px-6 text-base rounded-xl": size === "lg",
            "h-10 w-10 rounded-xl p-0": size === "icon",
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <div className="flex items-center justify-center gap-3">
            {loadingText ? <span>{loadingText}</span> : null}
            <div className="flex items-center justify-center gap-1.5 mt-1">
              <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-white/90 rounded-full animate-bounce"></div>
            </div>
          </div>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = "Button"

export { Button }
