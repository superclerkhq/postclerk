import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-2 py-16 px-6 text-center", className)}>
      {icon && <div className="mb-2 text-muted-foreground/60">{icon}</div>}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-sm text-xs text-muted-foreground">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}

export function LoadingState({ message }: { message?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message && <p className="text-xs">{message}</p>}
    </div>
  )
}

export function ErrorState({
  message,
  onRetry,
  action,
}: {
  message: string
  onRetry?: () => void
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
      <p className="text-xs text-destructive">{message}</p>
      {action}
      {onRetry && (
        <button onClick={onRetry} className="text-xs text-muted-foreground hover:text-foreground">
          Try again
        </button>
      )}
    </div>
  )
}
