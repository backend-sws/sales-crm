import { Loader2 } from "lucide-react"

export function PageLoadingSkeleton() {
  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-[#09090b]">
      <div className="relative flex items-center justify-center">
        {/* Glowing background blur */}
        <div className="absolute inset-0 bg-primary-500/30 blur-xl rounded-full scale-150"></div>
        
        {/* Spinning Loader */}
        <Loader2 className="h-8 w-8 animate-spin text-primary-500 relative z-10" />
      </div>
    </div>
  )
}
