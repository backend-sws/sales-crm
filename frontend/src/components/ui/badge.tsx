import * as React from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning'

const variantClasses: Record<BadgeVariant, string> = {
  default:     'bg-slate-900 text-slate-50 dark:bg-slate-50 dark:text-slate-900',
  secondary:   'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-50',
  destructive: 'bg-red-500 text-white dark:bg-red-900',
  outline:     'border border-slate-200 text-slate-950 dark:border-slate-700 dark:text-slate-50',
  success:     'bg-green-500/15 text-green-700 dark:text-green-400',
  warning:     'bg-amber-500/15 text-amber-700 dark:text-amber-400',
}

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: BadgeVariant
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
        variantClasses[variant],
        className
      )}
      {...props}
    />
  )
}

export { Badge }
