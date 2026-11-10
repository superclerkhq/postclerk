import { Search } from "lucide-react"

import { fieldTone } from "@/components/common/form"
import { cn } from "@/lib/utils"

const SEARCH_TONE = {
  quiet: cn(
    "h-9 rounded-lg bg-surface-soft pl-9 pr-3 text-[13px] text-foreground placeholder:text-muted-foreground/70 transition-colors",
    "outline-1 -outline-offset-1 outline-transparent hover:bg-surface-medium focus:bg-surface-medium focus:outline-ring",
    "disabled:cursor-not-allowed disabled:opacity-60",
  ),
  // Beside other filled form fields, at their size.
  soft: cn(fieldTone("soft"), "h-10 pl-9 text-[14px]"),
}

export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  className,
  tone = "quiet",
  disabled,
}: {
  value: string
  onChange: (next: string) => void
  placeholder: string
  label: string
  className?: string
  tone?: keyof typeof SEARCH_TONE
  disabled?: boolean
}) {
  return (
    <div className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/70" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        disabled={disabled}
        className={cn("w-full", SEARCH_TONE[tone])}
      />
    </div>
  )
}
