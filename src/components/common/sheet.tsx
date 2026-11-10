import * as Dialog from "@radix-ui/react-dialog"
import { ArrowLeft, X } from "lucide-react"
import type { ReactNode } from "react"

import { ReturnFocusOnClose } from "@/components/ui/dialog"
import {
  HAIRLINE_BELOW,
  PANEL_ACTION_BAR,
  PANEL_DESCRIPTION,
  PANEL_ICON_BUTTON,
  PANEL_SCRIM,
  PANEL_SURFACE,
  PANEL_TITLE,
} from "@/components/ui/styles"
import { cn } from "@/lib/utils"

export const Sheet = Dialog.Root
export const SheetTrigger = Dialog.Trigger
export const SheetClose = Dialog.Close
export const SheetTitle = Dialog.Title
export const SheetDescription = Dialog.Description

/** For `onOpenAutoFocus`, where the first control is one a second Enter or a stray Tab shouldn't press. */
export function focusTitle(event: Event) {
  event.preventDefault()
  ;(event.currentTarget as HTMLElement).querySelector("h2")!.focus()
}

/**
 * A panel that floats in from the right, inset from the viewport like the app's own rounded sheet.
 * Compose it from `SheetHeader`, `SheetBody` and `SheetFooter`; the close button is built in.
 */
export function SheetContent({
  children,
  className,
  dismissible = true,
  closeButton = true,
  ...props
}: {
  children: ReactNode
  className?: string
  dismissible?: boolean
  /** False when the content draws its own way out. */
  closeButton?: boolean
} & Omit<React.ComponentPropsWithoutRef<typeof Dialog.Content>, "children" | "className">) {
  return (
    <Dialog.Portal>
      <Dialog.Overlay
        className={cn(
          PANEL_SCRIM,
          "motion-safe:data-[state=open]:animate-scrim-in motion-safe:data-[state=closed]:animate-scrim-out",
        )}
      />
      <Dialog.Content
        {...props}
        onEscapeKeyDown={(event) => {
          props.onEscapeKeyDown?.(event)
          if (event.defaultPrevented) return
          if (!dismissible) event.preventDefault()
        }}
        onPointerDownOutside={(event) => {
          props.onPointerDownOutside?.(event)
          if (event.defaultPrevented) return
          if (!dismissible) event.preventDefault()
        }}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex min-h-0 w-full max-w-lg flex-col overflow-hidden",
          "sm:inset-y-2 sm:right-2 sm:w-[calc(100%-1rem)] sm:rounded-2xl",
          PANEL_SURFACE,
          "motion-safe:data-[state=open]:animate-sheet-in motion-safe:data-[state=closed]:animate-sheet-out",
          className,
        )}
      >
        <ReturnFocusOnClose />
        {children}
        {closeButton && (
          <Dialog.Close disabled={!dismissible} className={cn(PANEL_ICON_BUTTON, "absolute right-4 top-3.5")}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Dialog.Close>
        )}
      </Dialog.Content>
    </Dialog.Portal>
  )
}

/**
 * The sheet's title row: an optional back step and icon tile before the title, actions after it.
 * It stops short of the top-right corner, where the close button floats.
 */
export function SheetHeader({
  back,
  icon,
  title,
  description,
  actions,
}: {
  back?: { label: string; onClick: () => void }
  icon?: ReactNode
  title: ReactNode
  description: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className={cn("flex shrink-0 items-center gap-3 py-4 pl-6 pr-14", HAIRLINE_BELOW)}>
      {back && (
        <button
          type="button"
          onClick={back.onClick}
          aria-label={`Back to ${back.label}`}
          className={cn(PANEL_ICON_BUTTON, "-ml-1.5 -mr-1")}
        >
          <ArrowLeft className="size-4" />
        </button>
      )}
      {icon !== undefined && (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-foreground/[0.04]">
          {icon}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <Dialog.Title tabIndex={-1} className={cn(PANEL_TITLE, "truncate outline-none")}>
          {title}
        </Dialog.Title>
        <Dialog.Description className={PANEL_DESCRIPTION}>{description}</Dialog.Description>
      </div>
      {actions !== undefined && <div className="flex shrink-0 items-center gap-1.5 self-start">{actions}</div>}
    </header>
  )
}

export function SheetBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-6 py-5", className)}>{children}</div>
}

export function SheetFooter({ className, children }: { className?: string; children: ReactNode }) {
  return <footer className={cn(PANEL_ACTION_BAR, className)}>{children}</footer>
}
