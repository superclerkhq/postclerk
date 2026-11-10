import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronRight } from "lucide-react"

import { PANEL_ACTION_BAR, PANEL_SCRIM, PANEL_SURFACE } from "@/components/ui/styles"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/**
 * Hands focus back to whatever had it when the dialog opened. Radix returns focus only to its own
 * Trigger, and most of these open from state, so closing one used to strand focus on the page body.
 * Rendered inside the content: its first render runs before focus moves in, and its cleanup after the
 * content has left the page.
 */
export function ReturnFocusOnClose() {
  const [opener] = React.useState(() => document.activeElement)
  React.useEffect(
    () => () => {
      if (opener instanceof HTMLElement && opener.isConnected && document.activeElement === document.body) {
        opener.focus()
      }
    },
    [opener],
  )
  return null
}

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      PANEL_SCRIM,
      "motion-safe:data-[state=open]:animate-scrim-in motion-safe:data-[state=closed]:animate-scrim-out",
      className,
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

/**
 * A panel centred over the page. Compose it from `DialogHeader`, `DialogBody` and `DialogFooter`, the bar its
 * actions sit in. There is no close button: Cancel and Escape close a dialog.
 */
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed left-1/2 top-1/2 z-50 flex w-[calc(100%-2rem)] min-w-0 max-w-[480px] -translate-x-1/2 -translate-y-1/2 flex-col",
        "max-h-[calc(100svh-2rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl",
        PANEL_SURFACE,
        "duration-200 motion-safe:data-[state=open]:animate-in motion-safe:data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        className,
      )}
      {...props}
    >
      <ReturnFocusOnClose />
      {children}
    </DialogPrimitive.Content>
  </DialogPortal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex min-w-0 flex-col gap-1 px-6 pb-5 pt-5", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

/**
 * The title of a dialog that acts on one thing, as a trail: `[logo] Subject › Action`. The dialog's hero —
 * a field or a question — follows it.
 */
function DialogCrumb({ logo, subject, children }: { logo?: string; subject: string; children: React.ReactNode }) {
  return (
    <DialogPrimitive.Title className="-mt-1 mb-2 flex min-w-0 items-center gap-1.5 text-[12.5px] font-normal">
      <span
        className={cn(
          "inline-flex h-6 min-w-0 items-center gap-1.5 rounded-[7px] bg-foreground/[0.045] pr-2 font-medium text-foreground/85",
          logo ? "pl-1" : "pl-2",
        )}
      >
        {logo ? <img src={logo} alt="" className="size-4 shrink-0 object-contain" draggable={false} /> : null}
        <span className="truncate">{subject}</span>
      </span>
      <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/50" aria-hidden />
      <span className="shrink-0 text-muted-foreground">{children}</span>
    </DialogPrimitive.Title>
  )
}

const DialogBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("min-w-0 px-6 pb-5", className)} {...props} />
)
DialogBody.displayName = "DialogBody"

/** Pinned to the bottom, so a dialog taller than the screen keeps its actions in reach. */
const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn(PANEL_ACTION_BAR, "sticky bottom-0 z-10 min-w-0", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-[20px] font-semibold leading-7 tracking-[-0.02em] text-foreground", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-[13.5px] leading-[21px] text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogCrumb,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
