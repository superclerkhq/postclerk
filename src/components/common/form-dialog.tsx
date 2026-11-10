import type { ComponentProps, FormEvent, InputHTMLAttributes, ReactNode } from "react"

import { BusyButton, Button } from "@/components/common/button"
import { SheetContent, SheetHeader } from "@/components/common/sheet"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogCrumb,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Kbd } from "@/components/ui/kbd"
import { cn } from "@/lib/utils"

/** Holds the dialog open while its change is saving: a half-sent save must not vanish under the user. */
export function MutationDialog({
  open,
  pending,
  onOpenChange,
  children,
}: {
  open: boolean
  pending: boolean
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && pending) return
        onOpenChange(nextOpen)
      }}
    >
      {children}
    </Dialog>
  )
}

export function MutationDialogContent({
  pending,
  dismissible = true,
  ...props
}: ComponentProps<typeof DialogContent> & { pending: boolean; dismissible?: boolean }) {
  const canDismiss = dismissible && !pending
  return (
    <DialogContent
      {...props}
      onEscapeKeyDown={!canDismiss ? (event) => event.preventDefault() : undefined}
      onPointerDownOutside={!canDismiss ? (event) => event.preventDefault() : undefined}
      onInteractOutside={!canDismiss ? (event) => event.preventDefault() : undefined}
    />
  )
}

/** Cancel in a centred dialog, labelled with the Escape key that also presses it. */
export function DialogCancelButton({ children, ...props }: Omit<ComponentProps<typeof Button>, "type" | "variant">) {
  return (
    <Button type="button" variant="ghost" aria-keyshortcuts="Escape" {...props}>
      {children}
      <Kbd>esc</Kbd>
    </Button>
  )
}

/** The action a centred dialog's form submits, labelled with the Enter key that also presses it. */
export function DialogSubmitButton({ children, className, ...props }: Omit<ComponentProps<typeof BusyButton>, "type">) {
  return (
    <BusyButton
      type="submit"
      aria-keyshortcuts="Enter"
      className={cn("pr-1.5 pointer-coarse:pr-3", className)}
      {...props}
    >
      {children}
      <Kbd className="ml-0.5">↵</Kbd>
    </BusyButton>
  )
}

/**
 * The Cancel + submit pair every mutation dialog ends with. Omit `onSubmit` inside a <form>. `keys` labels
 * them with Escape and Enter, and belongs in centred dialogs: a sheet's long forms and dirty guard make
 * neither key a promise.
 */
export function MutationDialogFooter({
  pending,
  submitLabel,
  submitDisabled,
  submitVariant = "primary",
  icon,
  keys,
  onCancel,
  onSubmit,
}: {
  pending: boolean
  submitLabel: string
  submitDisabled?: boolean
  submitVariant?: "primary" | "danger"
  icon?: ReactNode
  keys: boolean
  onCancel: () => void
  onSubmit?: () => void
}) {
  const submit = { variant: submitVariant, pending, disabled: submitDisabled, icon, children: submitLabel }
  return (
    <DialogFooter>
      {keys ? (
        <DialogCancelButton disabled={pending} onClick={onCancel}>
          Cancel
        </DialogCancelButton>
      ) : (
        <Button type="button" variant="ghost" disabled={pending} onClick={onCancel}>
          Cancel
        </Button>
      )}
      {onSubmit ? (
        <BusyButton type="button" {...submit} onClick={onSubmit} />
      ) : keys ? (
        <DialogSubmitButton {...submit} />
      ) : (
        <BusyButton type="submit" {...submit} />
      )}
    </DialogFooter>
  )
}

/** Why the last attempt failed, in the line above a dialog's actions: one line per problem when there are several. */
export function FormError({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="whitespace-pre-line text-xs leading-5 text-destructive">
      {children}
    </p>
  )
}

/**
 * The one field a short dialog is about, drawn large and bare under the dialog's crumb. Its hint sits
 * beneath it and doubles as the dialog's description.
 */
export function HeroField({
  label,
  hint,
  className,
  ...props
}: { label: string; hint: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "aria-label">) {
  return (
    <div className="min-w-0">
      <input
        aria-label={label}
        className={cn(
          "w-full min-w-0 bg-transparent text-[20px] font-medium leading-8 tracking-[-0.02em] text-foreground outline-none",
          "placeholder:text-muted-foreground/50 disabled:opacity-60",
          className,
        )}
        {...props}
      />
      <DialogDescription className="mt-0.5">{hint}</DialogDescription>
    </div>
  )
}

/** The thing a dialog acts on, leading its header as `[logo] name › title`. */
export type DialogSubject = { name: string; logo?: string }

/**
 * One shell for every form dialog: modal chrome, form, header, body, and the
 * standard cancel/submit footer unless a custom `footer` is given. Always open —
 * mount it conditionally.
 */
export function FormDialog({
  subject,
  title,
  description,
  pending,
  dirty = false,
  sheet = false,
  className,
  bodyClassName,
  submitLabel,
  submitDisabled,
  submitVariant,
  icon,
  footer,
  onSubmit,
  onOpenChange,
  children,
}: {
  /** Centred dialogs only: what the dialog acts on. */
  subject?: DialogSubject
  title: string
  /** Absent when a `HeroField` describes the dialog from under itself. */
  description?: ReactNode
  pending: boolean
  dirty?: boolean
  /** Record-shaped forms render as a right-side sheet; short forms stay centered. */
  sheet?: boolean
  className?: string
  bodyClassName?: string
  submitLabel?: string
  submitDisabled?: boolean
  submitVariant?: "primary" | "danger"
  icon?: ReactNode
  footer?: ReactNode
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onOpenChange: (open: boolean) => void
  children: ReactNode
}) {
  const defaultFooter = footer ?? (
    <MutationDialogFooter
      pending={pending}
      submitLabel={submitLabel ?? "Save"}
      submitDisabled={submitDisabled}
      submitVariant={submitVariant}
      icon={icon}
      keys={!sheet}
      onCancel={() => onOpenChange(false)}
    />
  )

  if (sheet) {
    return (
      <MutationDialog open pending={pending} onOpenChange={onOpenChange}>
        <SheetContent dismissible={!pending && !dirty} className={className}>
          <SheetHeader title={title} description={description} />
          <form className="flex min-h-0 flex-1 flex-col" onSubmit={onSubmit}>
            <fieldset
              disabled={pending}
              className={cn(
                "m-0 min-h-0 min-w-0 flex-1 overflow-y-auto border-0 px-6 py-5",
                bodyClassName ?? "space-y-4",
              )}
            >
              {children}
            </fieldset>
            {defaultFooter}
          </form>
        </SheetContent>
      </MutationDialog>
    )
  }

  return (
    <MutationDialog open pending={pending} onOpenChange={onOpenChange}>
      <MutationDialogContent pending={pending} dismissible={!dirty} className={className}>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            {subject ? (
              <DialogCrumb logo={subject.logo} subject={subject.name}>
                {title}
              </DialogCrumb>
            ) : (
              <DialogTitle>{title}</DialogTitle>
            )}
            {description !== undefined ? <DialogDescription>{description}</DialogDescription> : null}
          </DialogHeader>
          <DialogBody>
            <fieldset disabled={pending} className={cn("m-0 min-w-0 border-0 p-0", bodyClassName ?? "space-y-4")}>
              {children}
            </fieldset>
          </DialogBody>
          {defaultFooter}
        </form>
      </MutationDialogContent>
    </MutationDialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  pending,
  danger = true,
  onConfirm,
  onOpenChange,
  children,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  pending: boolean
  danger?: boolean
  onConfirm: () => void
  onOpenChange: (open: boolean) => void
  /** Shown under the description — why the last attempt failed. */
  children?: ReactNode
}) {
  return (
    <MutationDialog open={open} pending={pending} onOpenChange={onOpenChange}>
      <MutationDialogContent pending={pending} className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* An error component may render nothing; the body then takes no room. */}
        <DialogBody className="empty:hidden">{children}</DialogBody>
        <MutationDialogFooter
          pending={pending}
          submitLabel={confirmLabel}
          submitVariant={danger ? "danger" : "primary"}
          keys
          onCancel={() => onOpenChange(false)}
          onSubmit={onConfirm}
        />
      </MutationDialogContent>
    </MutationDialog>
  )
}
