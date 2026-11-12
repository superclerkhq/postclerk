import type { SocialAccount } from "@/api/social"
import { SocialPlatformLogos } from "@/lib/platform-logos"
import { cn } from "@/lib/utils"

/**
 * A platform's mark on a rounded square tile. Every platform gets the same shape whatever its logo's own
 * outline, so a row of them reads as one set.
 */
export function PlatformLogo({
  platform,
  size = 16,
  className,
}: {
  platform: SocialAccount["platform"]
  size?: number
  className?: string
}) {
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, borderRadius: Math.max(3, Math.round(size * 0.24)) }}
      className={cn(
        "flex shrink-0 items-center justify-center bg-white shadow-[0_0_0_0.5px_var(--chrome-edge)]",
        className,
      )}
    >
      <img src={SocialPlatformLogos[platform]} alt="" className="size-[74%] object-contain" />
    </span>
  )
}
