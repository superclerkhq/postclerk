import { useId, useMemo, useState, type ReactElement, type ReactNode } from "react"
import { CaretDown } from "@phosphor-icons/react"

import { fieldTone, type Tone } from "@/components/common/form"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSearch,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type SelectMenuItem<T extends string = string> = {
  readonly value: T
  readonly label: string
  readonly hint?: string
  readonly disabled?: boolean
  /** Small leading visual — an app logo or a status dot. Rendered in a 16px slot. */
  readonly icon?: ReactNode
  /** Items that share a group sit under its label, groups in the order they first appear. */
  readonly group?: string
}

/**
 * The house selector, used in place of the native <select>, whose menu is drawn by the OS and
 * ignores the theme entirely. The trigger wears the same tone as the text fields beside it; the
 * menu is sized to the trigger, searchable once the list is long, and checks the active row.
 */
export function SelectMenu<T extends string = string>({
  value,
  items,
  onChange,
  placeholder = "Choose…",
  disabled,
  size = "md",
  tone = "outline",
  className,
  id,
  autoFocus,
  trigger,
  footer,
  menuClassName = "w-[var(--radix-dropdown-menu-trigger-width)]",
  iconClassName = "size-4",
  "aria-label": ariaLabel,
  "aria-describedby": ariaDescribedBy,
}: {
  value: T | null
  items: readonly SelectMenuItem<T>[]
  onChange: (value: T) => void
  placeholder?: string
  disabled?: boolean
  /** `md` matches a form field; `sm` is for dense editors, toolbars and table rows. */
  size?: "sm" | "md"
  tone?: Tone
  className?: string
  id?: string
  autoFocus?: boolean
  /** Draws the trigger where the field doesn't fit, such as inside a sentence. Name the chosen value with `valueID`. */
  trigger?: (state: { valueID: string; open: boolean }) => ReactElement
  /** A last row that isn't a choice, such as making a new one. */
  footer?: ReactNode
  menuClassName?: string
  iconClassName?: string
  "aria-label"?: string
  "aria-describedby"?: string
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const valueID = useId()
  const active = items.find((item) => item.value === value)
  const searchable = items.length > 8
  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const byGroup = new Map<string | undefined, SelectMenuItem<T>[]>()
    for (const item of items) {
      if (needle && !`${item.label} ${item.hint ?? ""}`.toLowerCase().includes(needle)) continue
      const groupItems = byGroup.get(item.group)
      if (groupItems) groupItems.push(item)
      else byGroup.set(item.group, [item])
    }
    return [...byGroup]
  }, [items, query])

  const rows =
    groups.length === 0 ? (
      <DropdownMenuEmpty>No matches</DropdownMenuEmpty>
    ) : (
      <DropdownMenuRadioGroup value={value ?? undefined}>
        {groups.map(([group, groupItems]) => (
          <DropdownMenuGroup key={group ?? ""}>
            {group ? <DropdownMenuLabel>{group}</DropdownMenuLabel> : null}
            {groupItems.map((item) => (
              <DropdownMenuRadioItem
                key={item.value}
                value={item.value}
                textValue={item.label}
                disabled={item.disabled}
                onSelect={() => {
                  if (item.value !== value) onChange(item.value)
                }}
                className={cn(size === "sm" && "min-h-7 text-xs")}
              >
                {item.icon ? (
                  <span className={cn("flex shrink-0 items-center justify-center", iconClassName)} aria-hidden>
                    {item.icon}
                  </span>
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{item.label}</span>
                  {item.hint ? (
                    <span className="block truncate text-[11px] font-normal text-muted-foreground">{item.hint}</span>
                  ) : null}
                </span>
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuGroup>
        ))}
      </DropdownMenuRadioGroup>
    )

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <DropdownMenuTrigger asChild disabled={disabled}>
        {trigger ? (
          trigger({ valueID, open })
        ) : (
          <button
            type="button"
            // Radix names the menu after its own trigger id; an explicit undefined would overwrite it.
            {...(id ? { id } : {})}
            autoFocus={autoFocus}
            aria-label={ariaLabel}
            // A button's label is its name alone, so the chosen value is announced as its description.
            aria-describedby={ariaDescribedBy ? `${valueID} ${ariaDescribedBy}` : valueID}
            className={cn(
              fieldTone(tone),
              "flex min-w-0 cursor-pointer items-center gap-2 py-0 text-left",
              size === "sm" ? "h-8 px-2.5 text-xs" : "h-9",
              tone === "soft" ? "data-[state=open]:bg-surface-deep" : "data-[state=open]:border-foreground/20",
              className,
            )}
          >
            {active?.icon ? (
              <span className="flex size-4 shrink-0 items-center justify-center" aria-hidden>
                {active.icon}
              </span>
            ) : null}
            <span id={valueID} className={cn("min-w-0 flex-1 truncate", !active && "text-muted-foreground")}>
              {active?.label ?? placeholder}
            </span>
            <CaretDown
              weight="bold"
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-[rotate] duration-150",
                open && "rotate-180",
              )}
              aria-hidden
            />
          </button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        {...(id ? { "aria-labelledby": id } : {})}
        className={cn(menuClassName, searchable ? "p-0" : !footer && "max-h-80 overflow-y-auto")}
      >
        {searchable ? (
          <DropdownMenuSearch
            value={query}
            onChange={setQuery}
            label={ariaLabel ? `Search ${ariaLabel}` : "Search options"}
          >
            {rows}
          </DropdownMenuSearch>
        ) : footer ? (
          <div className="max-h-72 overflow-y-auto">{rows}</div>
        ) : (
          rows
        )}
        {footer ? (
          <>
            <DropdownMenuSeparator className={searchable ? "my-0" : undefined} />
            <div className={searchable ? "p-1" : undefined}>{footer}</div>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
