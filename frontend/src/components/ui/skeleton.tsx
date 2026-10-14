import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-slate-200 dark:bg-zinc-800", className)}
      {...props}
    />
  )
}

export { Skeleton }
