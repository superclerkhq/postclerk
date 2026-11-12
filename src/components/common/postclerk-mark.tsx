/** The Postclerk leaf, drawn in the text colour so it follows the theme. `public/favicon.svg` is the same path. */
export function PostclerkMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="currentColor" aria-hidden className={className}>
      <path d="M16 2.5H26.5a3 3 0 0 1 3 3V16A13.5 13.5 0 0 1 16 29.5H5.5a3 3 0 0 1-3-3V16A13.5 13.5 0 0 1 16 2.5Z" />
    </svg>
  )
}
