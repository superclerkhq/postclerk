import type { SocialAccount } from "@/api/social"
import { buttonClass } from "@/components/common/button"
import { PlatformLogo } from "@/components/social/social-logo"
import { SocialPlatformLogos } from "@/lib/social"
import { cn } from "@/lib/utils"

const SUBMIT = cn(buttonClass("primary", "lg"), "mt-8 h-11 w-full justify-center rounded-[10px] text-[14px]")
const PLATFORMS = Object.keys(SocialPlatformLogos) as SocialAccount["platform"][]

/** The first screen while the app isn't signed in to Superclerk, in the frame Superclerk's own sign-in uses. */
export function SignInScreen({ problem }: { problem?: string }) {
  return (
    <main className="app-viewport flex min-h-0 flex-col overflow-y-auto bg-background px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-6 text-foreground sm:px-10 sm:pb-8">
      <div className="superclerk-wordmark flex items-center gap-2 text-[18px] leading-none">
        <img src="/favicon.svg" alt="" className="size-5" />
        Social
      </div>
      <div className="flex flex-1 items-center justify-center py-12">
        <div className="w-full max-w-[360px]">
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-balance">
            Plan your posts in one place
          </h1>
          <p className="mt-2 text-[14.5px] leading-6 text-muted-foreground">
            Schedule to every network at once. Your posts live in your Superclerk workspace.
          </p>
          <div
            role="img"
            aria-label="Instagram, Facebook, LinkedIn, Threads, TikTok, YouTube and Google Business Profile"
            className="mt-5 flex gap-1.5"
          >
            {PLATFORMS.map((platform) => (
              <PlatformLogo key={platform} platform={platform} size={24} />
            ))}
          </div>
          {problem && (
            <p
              role="alert"
              className="mt-6 rounded-[10px] bg-destructive/[0.07] px-3.5 py-2.5 text-[13px] leading-5 text-destructive"
            >
              {problem}
            </p>
          )}
          <form method="post" action="/signin">
            <button type="submit" className={SUBMIT}>
              Sign in with Superclerk
            </button>
          </form>
          <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
            New to Superclerk? You’ll make an account on the way. The app gets your workspace’s social accounts and
            posts, and nothing else.
          </p>
        </div>
      </div>
    </main>
  )
}
