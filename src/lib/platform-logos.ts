import type { SocialAccount } from "@/api/social"

/** Each network's logo. Its own module, so the landing page draws them without loading the app. */
export const SocialPlatformLogos: Record<SocialAccount["platform"], string> = {
  instagram: "/logos/instagram.png",
  facebook: "/logos/facebook.svg",
  linkedin: "/logos/linkedin.svg",
  threads: "/logos/threads.svg",
  tiktok: "/logos/tiktok.svg",
  youtube: "/logos/youtube.svg",
  googlebusiness: "/logos/gbusinessprofile.svg",
}
