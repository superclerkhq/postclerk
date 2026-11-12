/**
 * Shared class recipes.
 *
 * Composed from the tokens defined in index.css. Prefer importing a recipe
 * over re-assembling the same Tailwind string in multiple files — when the
 * design system shifts, it ships from one place.
 *
 * Surface scale (see index.css):
 *   surface-base     → app background
 *   surface-soft     → resting fill for cards/inputs
 *   surface-medium   → hover / focus
 *   surface-strong   → active / selected
 */

/**
 * The clock every press runs on: a control sinks the instant it is pressed and eases back out when let go, so
 * even a quick click shows. A control on this clock drops its own `transition-*`.
 */
export const PRESS_MOTION =
  "transition-[color,background-color,box-shadow,filter] duration-240 ease-out press:duration-0"

/** How a flat control answers a press: it sinks into a small well (see --shadow-press in index.css). */
export const PRESS = `${PRESS_MOTION} press:shadow-[var(--shadow-press)]`

/*
 * Panels — sheets and dialogs speak one language: a card lifted by a hairline and a soft shadow (never a
 * border), a light scrim, and their actions in a bar along the bottom. Hairlines are 0.5px shadows because
 * Chromium rounds sub-pixel borders up to a full pixel.
 */
export const HAIRLINE_BELOW = "shadow-[inset_0_-0.5px_0_var(--chrome-edge)]"
export const HAIRLINE_ABOVE = "shadow-[inset_0_0.5px_0_var(--chrome-edge)]"

export const PANEL_SURFACE =
  "bg-card outline-none [--surface:var(--card)] shadow-[0_0_0_0.5px_var(--chrome-edge),0_24px_56px_-12px_rgb(0_0_0/0.22)]"

export const PANEL_SCRIM = "fixed inset-0 z-50 bg-black/[0.16] dark:bg-black/50"

export const PANEL_TITLE = "text-[15px] font-semibold leading-6 tracking-[-0.01em] text-foreground"

export const PANEL_DESCRIPTION = "text-[13px] leading-5 text-muted-foreground"

/**
 * What floats over a page beside its trigger, a menu or a popover: a card lifted by a hairline and a soft shadow, which
 * fades and grows in from there.
 */
export const FLOATING_SURFACE =
  "z-50 rounded-xl bg-popover text-popover-foreground outline-none shadow-[0_0_0_0.5px_var(--chrome-edge),0_12px_32px_-12px_rgb(0_0_0/0.22),0_2px_6px_-2px_rgb(0_0_0/0.06)] motion-safe:data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-97 data-[state=open]:duration-150 motion-safe:data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-97 data-[state=closed]:duration-100 ease-[cubic-bezier(0.32,0.72,0,1)]"

/**
 * The bar a panel's actions sit in: a faint band under a hairline. The band is opaque so the bar can stay
 * pinned over content scrolling beneath it.
 */
export const PANEL_ACTION_BAR = `flex shrink-0 flex-wrap items-center justify-end gap-1.5 px-4 py-2.5 bg-[color-mix(in_oklab,var(--foreground)_2.5%,var(--card))] ${HAIRLINE_ABOVE}`

/** The small square icon button panels use for close and back. */
export const PANEL_ICON_BUTTON = `flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground/80 ${PRESS} hover:bg-foreground/[0.05] hover:text-foreground outline-2 -outline-offset-2 outline-transparent focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40`
