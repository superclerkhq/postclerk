import { CaretLeft, CaretRight, Plus, TextAlignLeft, WarningCircle } from "@phosphor-icons/react"
import type { SocialAccount, SocialPost } from "@/api/social"
import { Button } from "@/components/common/button"
import { SocialPlatformLabels } from "@/lib/social"
import { cn } from "@/lib/utils"
import { PlatformLogo } from "./social-logo"
import { MediaPreview } from "./social-media"

export const POST_STATUS_LABELS: Record<SocialPost["status"], string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  awaiting_creator: "Sent to TikTok",
  partial: "Partly published",
  failed: "Failed",
  outcome_unknown: "Needs checking",
  cancelled: "Cancelled",
}

const STATUS_TONES: Record<SocialPost["status"], string> = {
  draft: "text-muted-foreground",
  scheduled: "text-muted-foreground",
  publishing: "text-brand",
  published: "text-success",
  awaiting_creator: "text-brand",
  partial: "text-destructive",
  failed: "text-destructive",
  outcome_unknown: "text-destructive",
  cancelled: "text-muted-foreground",
}

/** A post that may not have gone out the way it was meant to, and wants a person to look. */
export function postNeedsAttention(post: SocialPost) {
  return post.status === "failed" || post.status === "partial" || post.status === "outcome_unknown"
}

export function postMedia(post: SocialPost) {
  return post.mediaItems.length > 0
    ? post.mediaItems
    : post.platforms.flatMap((destination) => (destination.mediaItems === null ? [] : destination.mediaItems))
}

const time = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" })
const dayAndTime = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})
const monthDay = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" })
const weekday = new Intl.DateTimeFormat(undefined, { weekday: "long" })
const monthYear = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" })

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** "Today", "Tomorrow", or the weekday: how people say a day that is close. */
function dayName(day: Date) {
  const offset = Math.round((startOfDay(day).getTime() - startOfDay(new Date()).getTime()) / 86_400_000)
  return offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : offset === -1 ? "Yesterday" : weekday.format(day)
}

function scheduledDate(post: SocialPost) {
  if (post.scheduledFor === null) throw new Error("A scheduled post has no publish time")
  return new Date(post.scheduledFor)
}

/** Where a post goes: its account by name when there is one, the platforms' marks when there are several. */
function AccountMarks({ post }: { post: SocialPost }) {
  const names = post.platforms
    .map((destination) => `${destination.accountLabel} on ${SocialPlatformLabels[destination.platform]}`)
    .join(", ")
  return (
    <span className="flex min-w-0 items-center gap-1.5" title={names}>
      <span className="flex shrink-0 -space-x-1">
        {post.platforms.map((destination) => (
          <PlatformLogo
            key={destination.id}
            platform={destination.platform}
            size={16}
            className="shadow-[0_0_0_0.5px_var(--chrome-edge),0_0_0_1.5px_var(--background)]"
          />
        ))}
      </span>
      {post.platforms.length === 1 ? (
        <span className="truncate text-xs text-muted-foreground">{post.platforms[0]!.accountLabel}</span>
      ) : (
        <span className="sr-only">{names}</span>
      )}
    </span>
  )
}

function PostRow({
  post,
  meta,
  showStatus,
  onOpen,
}: {
  post: SocialPost
  meta: string
  showStatus: boolean
  onOpen: () => void
}) {
  const media = postMedia(post)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open post: ${post.content || "Media post"}`}
      className="grid w-full min-w-0 cursor-pointer grid-cols-[56px_minmax(0,1fr)] items-start gap-4 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-foreground/[0.03] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:grid-cols-[64px_minmax(0,1fr)]"
    >
      <span className="relative">
        {media[0] ? (
          <MediaPreview
            asset={media[0].asset}
            altText={media[0].altText}
            className="aspect-square w-full rounded-lg shadow-[0_0_0_0.5px_var(--chrome-edge)]"
          />
        ) : (
          <span className="flex aspect-square w-full items-center justify-center rounded-lg bg-surface-soft text-muted-foreground">
            <TextAlignLeft size={18} />
          </span>
        )}
        {media.length > 1 && (
          <span className="absolute bottom-1 right-1 rounded bg-black/55 px-1 text-[10px] font-semibold tabular-nums text-white">
            {media.length}
          </span>
        )}
      </span>
      <span className="min-w-0 py-0.5">
        <span className="flex min-w-0 items-center gap-2.5">
          <span className="shrink-0 text-[13px] font-semibold tabular-nums text-foreground">{meta}</span>
          <AccountMarks post={post} />
          {showStatus && (
            <span
              className={cn(
                "ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium",
                STATUS_TONES[post.status],
              )}
            >
              {postNeedsAttention(post) && <WarningCircle size={13} weight="fill" />}
              {POST_STATUS_LABELS[post.status]}
            </span>
          )}
        </span>
        <span className="mt-1 line-clamp-2 text-[13.5px] leading-5 text-foreground/85">
          {post.content || "Media post"}
        </span>
      </span>
    </button>
  )
}

/**
 * Posts as people read a schedule. The queue runs by day with the time on each post; drafts and the full
 * history list one post a row. A status shows only where it says something the list does not.
 */
export function PostList({
  posts,
  variant,
  onOpen,
}: {
  posts: SocialPost[]
  variant: "queue" | "drafts" | "all"
  onOpen: (post: SocialPost) => void
}) {
  if (variant !== "queue")
    return (
      <div className="flex flex-col gap-0.5">
        {posts.map((post) => (
          <PostRow
            key={post.id}
            post={post}
            meta={
              variant === "drafts"
                ? `Edited ${monthDay.format(new Date(post.updatedAt))}`
                : post.scheduledFor === null
                  ? "No time set"
                  : dayAndTime.format(new Date(post.scheduledFor))
            }
            showStatus={variant === "all"}
            onOpen={() => onOpen(post)}
          />
        ))}
      </div>
    )
  const days: { day: Date; posts: SocialPost[] }[] = []
  for (const post of posts) {
    const day = startOfDay(scheduledDate(post))
    const last = days.at(-1)
    if (last && last.day.getTime() === day.getTime()) last.posts.push(post)
    else days.push({ day, posts: [post] })
  }
  return (
    <div className="flex flex-col gap-5">
      {days.map(({ day, posts: dayPosts }) => {
        const today = day.getTime() === startOfDay(new Date()).getTime()
        return (
          <section key={day.getTime()} aria-label={`${dayName(day)}, ${monthDay.format(day)}`}>
            <h2 className="sticky top-0 z-10 -mx-2.5 flex items-baseline gap-2 bg-background px-5 pb-1.5 pt-1">
              <span className={cn("text-[13px] font-semibold", today ? "text-brand" : "text-foreground")}>
                {dayName(day)}
              </span>
              <span className="text-xs tabular-nums text-muted-foreground">{monthDay.format(day)}</span>
            </h2>
            <div className="flex flex-col gap-0.5">
              {dayPosts.map((post) => (
                <PostRow
                  key={post.id}
                  post={post}
                  meta={time.format(scheduledDate(post))}
                  showStatus={post.status !== "scheduled"}
                  onOpen={() => onOpen(post)}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

export function monthRange(month: Date) {
  return {
    scheduledFrom: new Date(month.getFullYear(), month.getMonth(), 1).toISOString(),
    scheduledTo: new Date(month.getFullYear(), month.getMonth() + 1, 1).toISOString(),
  }
}

function CalendarTile({ post, onOpen }: { post: SocialPost; onOpen: () => void }) {
  const media = postMedia(post)[0]
  const attention = postNeedsAttention(post)
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${POST_STATUS_LABELS[post.status]}: ${post.content || "Media post"}`}
      title={post.content || "Media post"}
      className="@container/tile relative block aspect-square w-full cursor-pointer overflow-hidden rounded-lg bg-surface-soft text-left shadow-[0_0_0_0.5px_var(--chrome-edge)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    >
      {media ? (
        <MediaPreview asset={media.asset} altText={media.altText} className="size-full" />
      ) : (
        <span className="line-clamp-5 p-1.5 text-[10.5px] leading-[1.35] text-foreground/80">{post.content}</span>
      )}
      <span
        className={cn(
          "absolute bottom-1 left-1 hidden whitespace-nowrap rounded px-1 py-px text-[10px] font-medium tabular-nums @[4.5rem]/tile:block",
          attention ? "bg-destructive text-white" : "bg-background/90 text-foreground/85",
        )}
      >
        {attention ? "Check" : time.format(scheduledDate(post))}
      </span>
      {attention && (
        <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive shadow-[0_0_0_1.5px_white] @[4.5rem]/tile:hidden" />
      )}
    </button>
  )
}

/**
 * The month as it will fill up: a picture on every day something goes out, so gaps show at a glance.
 * Drafts have no day and stay in Drafts; cancelled posts are left out.
 */
export function CalendarView({
  month,
  posts,
  onMonthChange,
  onOpen,
  onCreate,
}: {
  month: Date
  posts: SocialPost[]
  onMonthChange: (month: Date) => void
  onOpen: (post: SocialPost) => void
  onCreate: (date: Date) => void
}) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate()
  const cellCount = Math.ceil((first.getDay() + days) / 7) * 7
  const today = startOfDay(new Date())
  const byDay = new Map<number, SocialPost[]>()
  for (const post of posts) {
    if (post.status === "draft" || post.status === "cancelled") continue
    const day = scheduledDate(post).getDate()
    const group = byDay.get(day)
    if (group) group.push(post)
    else byDay.set(day, [post])
  }
  return (
    <section aria-label="Social calendar">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-foreground">{monthYear.format(month)}</h2>
        <div className="flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => onMonthChange(new Date())}>
            Today
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <CaretLeft size={14} weight="bold" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <CaretRight size={14} weight="bold" />
          </Button>
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl shadow-[0_0_0_0.5px_var(--chrome-edge)]">
        <div className="grid grid-cols-7 bg-surface-soft/70 py-2 text-center text-[11px] font-medium text-muted-foreground">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {Array.from({ length: cellCount }, (_, index) => {
            const day = index - first.getDay() + 1
            const edge = "shadow-[inset_0.5px_0.5px_0_var(--chrome-edge)]"
            if (day < 1 || day > days)
              return <div key={index} className={cn("min-h-20 bg-surface-soft/50 sm:min-h-32", edge)} />
            const date = new Date(month.getFullYear(), month.getMonth(), day)
            const isToday = date.getTime() === today.getTime()
            const entries = byDay.get(day)
            return (
              <div
                key={index}
                className={cn("group flex min-h-20 min-w-0 flex-col gap-1 p-1 sm:min-h-32 sm:p-1.5", edge)}
              >
                <div className="flex h-5 items-center justify-between">
                  <span
                    className={cn(
                      "flex h-5 min-w-5 items-center justify-center rounded-md px-1 text-[11px] tabular-nums sm:text-xs",
                      isToday ? "bg-brand font-semibold text-brand-foreground" : "text-foreground/75",
                    )}
                  >
                    {day}
                  </span>
                  {date >= today && (
                    <button
                      type="button"
                      aria-label={`New post for ${date.toLocaleDateString()}`}
                      onClick={() => onCreate(date)}
                      className="hidden size-5 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-surface-medium hover:text-foreground focus-visible:flex group-hover:flex pointer-coarse:flex"
                    >
                      <Plus size={11} weight="bold" />
                    </button>
                  )}
                </div>
                {entries?.map((post) => (
                  <CalendarTile key={post.id} post={post} onOpen={() => onOpen(post)} />
                ))}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/**
 * How posts made here could sit together on one Instagram profile, using that account's own caption and
 * media. It is an approximation of the grid, not the live profile: no counts, no other posts.
 */
export function FeedView({
  posts,
  account,
  onOpen,
}: {
  posts: SocialPost[]
  account: SocialAccount
  onOpen: (post: SocialPost) => void
}) {
  const entries = posts.flatMap((post) => {
    const destination = post.platforms.find((item) => item.accountId === account.id)
    if (!destination || destination.platformSpecificData.format === "story" || post.status === "cancelled") return []
    return [{ post, destination, media: destination.mediaItems === null ? post.mediaItems : destination.mediaItems }]
  })
  return (
    <div className="mx-auto w-full max-w-[468px]">
      <div className="mb-4 flex items-center gap-3">
        <PlatformLogo platform="instagram" size={40} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{account.label}</p>
          <p className="text-xs leading-5 text-muted-foreground">
            An approximate grid, newest created posts first. This is not your account’s live feed.
          </p>
        </div>
      </div>
      {entries.length === 0 ? (
        <p className="rounded-xl bg-surface-soft px-4 py-10 text-center text-xs text-muted-foreground">
          No feed posts for this account yet. Stories don’t appear in the grid.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg">
          {entries.map(({ post, destination, media }) => {
            const caption = destination.customContent === null ? post.content : destination.customContent
            return (
              <button
                key={post.id}
                type="button"
                onClick={() => onOpen(post)}
                aria-label={caption || "Media post"}
                className="group relative aspect-[3/4] cursor-pointer overflow-hidden bg-surface-soft text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                {media[0] ? (
                  <MediaPreview asset={media[0].asset} altText={media[0].altText} className="size-full" />
                ) : (
                  <span className="line-clamp-6 p-2.5 text-xs leading-snug text-foreground/80">{caption}</span>
                )}
                {post.status !== "published" && (
                  <span
                    className={cn(
                      "absolute bottom-1.5 left-1.5 rounded px-1.5 py-px text-[10px] font-medium",
                      postNeedsAttention(post) ? "bg-destructive text-white" : "bg-background/90 text-foreground/85",
                    )}
                  >
                    {post.status === "scheduled"
                      ? dayAndTime.format(scheduledDate(post))
                      : POST_STATUS_LABELS[post.status]}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
