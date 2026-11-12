import * as React from "react"
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu"
import { Check, MagnifyingGlass } from "@phosphor-icons/react"

import { FLOATING_SURFACE, PRESS } from "@/components/ui/styles"
import { cn } from "@/lib/utils"

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup

/** Every row in every menu: the shelf's own row, tinted while it is under the pointer or the keyboard. */
export const MENU_ROW = cn(
  "relative flex min-h-8 cursor-pointer select-none items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] text-foreground outline-none",
  // The highlight follows the pointer, so menus run the press on a quicker clock.
  PRESS,
  "duration-100 data-[highlighted]:bg-foreground/[0.05]",
  "data-[disabled]:cursor-not-allowed data-[disabled]:opacity-45",
  // Icons rest muted; :where() keeps this at zero specificity so an icon with its own colour keeps it.
  "[:where(&)>svg]:shrink-0 [:where(&)>svg]:text-muted-foreground",
)

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 6, onCloseAutoFocus, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      onCloseAutoFocus={(event) => {
        onCloseAutoFocus?.(event)
        // A choice can open something that takes focus itself (a confirm, an editor). Focus is only
        // handed back to the trigger when it was left stranded on the page.
        if (document.activeElement !== document.body) event.preventDefault()
      }}
      className={cn(
        FLOATING_SURFACE,
        "max-h-[var(--radix-dropdown-menu-content-available-height)] min-w-[12rem] overflow-y-auto overflow-x-hidden p-1",
        "origin-[var(--radix-dropdown-menu-content-transform-origin)]",
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
))
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      MENU_ROW,
      destructive && "text-destructive data-[highlighted]:bg-destructive/[0.08] [:where(&)>svg]:text-current",
      className,
    )}
    {...props}
  />
))
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName

/** A choice in a `DropdownMenuRadioGroup`. The chosen row ends in a brand check: a menu's one accent, like the switches. */
const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(MENU_ROW, "pr-8 data-[state=checked]:font-medium", className)}
    {...props}
  >
    {children}
    <DropdownMenuPrimitive.ItemIndicator className="absolute right-2 flex items-center">
      <Check weight="bold" className="size-4 text-brand" aria-hidden />
    </DropdownMenuPrimitive.ItemIndicator>
  </DropdownMenuPrimitive.RadioItem>
))
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn("flex items-center gap-2 px-2 pb-1 pt-2 text-[12px] font-medium text-muted-foreground/80", className)}
    {...props}
  />
))
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-foreground/[0.06]", className)}
    {...props}
  />
))
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName

/** The quiet line a menu shows instead of rows: nothing matched, or rows are still loading. */
function DropdownMenuEmpty({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn("flex items-center justify-center gap-1.5 px-2 py-5 text-[13px] text-muted-foreground", className)}
    >
      {children}
    </div>
  )
}

/**
 * A filter field above a menu's rows, which it renders as `children`. Radix menus read typed
 * characters as typeahead and move focus to the matching row, which would steal the field's
 * keystrokes: typing while a row has focus is routed back into the field, ArrowDown steps from the
 * field into the rows (ArrowUp on the first row steps back), and Enter takes the first match of a
 * typed query. Space on a row still picks that row.
 */
function DropdownMenuSearch({
  value,
  onChange,
  label,
  placeholder = "Search…",
  className,
  children,
}: {
  value: string
  onChange: (value: string) => void
  label: string
  placeholder?: string
  /** Classes for the scrolling list of rows. */
  className?: string
  children: React.ReactNode
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const listRef = React.useRef<HTMLDivElement>(null)
  const firstRow = () => listRef.current!.querySelector<HTMLElement>("[role^='menuitem']:not([data-disabled])")

  return (
    <div
      onKeyDownCapture={(event) => {
        const input = inputRef.current!
        const typing = event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey
        if (event.target === input) {
          if (typing) event.stopPropagation()
          if (event.key === "ArrowDown") {
            event.preventDefault()
            firstRow()?.focus()
          }
          // An empty query has no match to take, and an IME's Enter only confirms its composition.
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault()
            if (value.trim()) firstRow()?.click()
          }
          return
        }
        if ((typing && event.key !== " ") || (event.key === "ArrowUp" && event.target === firstRow())) {
          event.stopPropagation()
          if (!typing) event.preventDefault()
          input.focus()
        }
      }}
    >
      <div className="flex h-10 items-center gap-2 px-3 shadow-[inset_0_-0.5px_0_var(--chrome-edge)]">
        <MagnifyingGlass weight="bold" className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
        <input
          ref={inputRef}
          autoFocus
          value={value}
          aria-label={label}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="h-full min-w-0 flex-1 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
      </div>
      <div ref={listRef} className={cn("max-h-72 overflow-y-auto p-1", className)}>
        {children}
      </div>
    </div>
  )
}

export {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuEmpty,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSearch,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
}
