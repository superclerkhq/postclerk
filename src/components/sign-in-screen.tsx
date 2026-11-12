import { GithubLogo } from "@phosphor-icons/react"

import type { SocialAccount } from "@/api/social"
import { buttonClass } from "@/components/common/button"
import { PlatformLogo } from "@/components/social/social-logo"
import { SocialPlatformLogos } from "@/lib/social"
import { cn } from "@/lib/utils"

const REPOSITORY = "https://github.com/surgent-dev/postclerk"
const SUBMIT = cn(
  buttonClass("primary", "lg"),
  "mt-8 h-11 w-full justify-center rounded-[10px] text-[14px] sm:w-auto sm:px-6",
)
const PLATFORMS = Object.keys(SocialPlatformLogos) as SocialAccount["platform"][]

/** The first screen until this browser signs in to Superclerk: what Postclerk is, and the way in. */
export function SignInScreen({ problem }: { problem?: string }) {
  return (
    <main className="app-viewport flex min-h-0 flex-col overflow-y-auto bg-background px-6 pt-[max(1.25rem,env(safe-area-inset-top))] pb-8 text-foreground sm:px-10">
      <header className="flex items-center justify-between">
        <div className="wordmark flex items-center gap-2 text-[18px] leading-none">
          <img src="/favicon.svg" alt="" className="size-5" />
          Postclerk
        </div>
        <a
          href={REPOSITORY}
          className="flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          <GithubLogo size={16} weight="fill" aria-hidden />
          GitHub
        </a>
      </header>
      <div className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 py-12 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)] lg:gap-16">
        <div>
          <h1 className="text-[32px] leading-[1.15] font-semibold tracking-tight text-balance">
            Schedule every post from one calendar
          </h1>
          <p className="mt-3 text-[15px] leading-6 text-muted-foreground">
            Postclerk is a free, open-source social media scheduler. Write once, then post to every network at the right
            time.
          </p>
          <div
            role="img"
            aria-label="Instagram, Facebook, LinkedIn, Threads, TikTok, YouTube and Google Business Profile"
            className="mt-6 flex gap-1.5"
          >
            {PLATFORMS.map((platform) => (
              <PlatformLogo key={platform} platform={platform} size={26} />
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
          <form method="post" action="/oauth/signin">
            <button type="submit" className={SUBMIT}>
              Sign in with Superclerk
            </button>
          </form>
          <p className="mt-4 text-[13px] leading-5 text-muted-foreground">
            New to Superclerk? You’ll make an account on the way. Postclerk gets your workspace’s social accounts and
            posts, and nothing else.
          </p>
          <p className="mt-6 text-[13px] leading-5 text-muted-foreground">
            MIT licensed.{" "}
            <a
              href={`${REPOSITORY}#run-your-own`}
              className="font-medium text-foreground underline-offset-2 hover:underline"
            >
              Run your own copy
            </a>{" "}
            on Cloudflare for free.
          </p>
        </div>
        <img
          src="/calendar.png"
          alt="Postclerk’s calendar, with the week’s posts scheduled to each network"
          width={1600}
          height={1000}
          className="w-full rounded-xl shadow-[0_0_0_0.5px_var(--chrome-edge)]"
        />
      </div>
    </main>
  )
}
