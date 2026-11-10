import { useInfiniteQuery, useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowClockwise, ArrowSquareOut, ChartBar, SealCheck } from "@phosphor-icons/react"

import { ApiError, superclerk } from "@/api/client"
import type { SocialAccount } from "@/api/social"
import { Button, BusyButton, buttonClass } from "@/components/common/button"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/empty-state"
import { FormError } from "@/components/common/form-dialog"
import { Metric, PANEL, SectionHead } from "@/components/common/section"
import { errorMessage } from "@/lib/errors"
import { SocialPlatformLabels } from "@/lib/social"
import { PlatformLogo } from "./social-logo"

export function SocialAnalytics({
  accounts,
  accountId,
  onChoose,
}: {
  accounts: SocialAccount[]
  accountId: string | undefined
  onChoose: (account: SocialAccount) => void
}) {
  const account = accounts.find((item) => item.id === accountId)
  if (account?.status === "active") {
    return <AccountAnalytics key={account.id} account={account} />
  }
  const candidates = accounts.filter((item) => item.status === "active")
  return (
    <EmptyState
      icon={<ChartBar size={28} weight="duotone" />}
      title={candidates.length === 0 ? "Connect a social account" : "Choose an account"}
      description="See the profile and post performance available from each platform."
      action={
        candidates.length === 0 ? (
          <Link to="/" search={{ view: "accounts" }} className={buttonClass("primary", "sm")}>
            Manage connections
          </Link>
        ) : (
          <div className="flex max-w-lg flex-wrap justify-center gap-2">
            {candidates.map((item) => (
              <Button key={item.id} variant="secondary" onClick={() => onChoose(item)}>
                <PlatformLogo platform={item.platform} size={16} />
                {item.label}
              </Button>
            ))}
          </div>
        )
      }
    />
  )
}

function needsAuthorization(error: unknown): error is ApiError {
  return error instanceof ApiError && (error.status === 401 || error.status === 403)
}

function AccountAnalytics({ account }: { account: SocialAccount }) {
  const platform = SocialPlatformLabels[account.platform]
  const overview = useQuery({
    queryKey: ["social", "analytics", account.id, "overview"],
    queryFn: ({ signal }) => superclerk.social.accounts.analytics.overview(account.id, { signal }),
    staleTime: 60_000,
    retry: false,
  })
  const posts = useInfiniteQuery({
    queryKey: ["social", "analytics", account.id, "posts"],
    queryFn: ({ pageParam, signal }) =>
      superclerk.social.accounts.analytics.posts(account.id, { cursor: pageParam }, { signal }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.status === "ready" ? page.nextCursor : null),
    staleTime: 60_000,
    retry: false,
  })
  const overviewAuthorization = overview.data?.status === "authorization_required" || needsAuthorization(overview.error)
  const postsStatus = posts.data?.pages.find((page) => page.status !== "ready")
  const postsAuthorization = postsStatus?.status === "authorization_required" || needsAuthorization(posts.error)
  const authorizationErrors = [
    ...new Set([overview.error, posts.error].filter(needsAuthorization).map((error) => error.message)),
  ]
  const readyOverview = overview.data?.status === "ready" && !overviewAuthorization ? overview.data : undefined
  const pages = posts.data?.pages.filter((page) => page.status === "ready")
  const publications = pages?.flatMap((page) => page.posts)
  const retrievedAt = [
    ...(readyOverview ? [readyOverview.retrievedAt] : []),
    ...(!postsAuthorization && pages ? pages.map((page) => page.retrievedAt) : []),
  ]
  const retryPosts = () => void (posts.isFetchNextPageError ? posts.fetchNextPage() : posts.refetch())
  const unavailableMetric = `Not provided by ${platform}`
  const profileLabel = readyOverview?.profile.username ? `@${readyOverview.profile.username}` : platform
  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          {readyOverview?.profile.avatarUrl ? (
            <img
              src={readyOverview.profile.avatarUrl}
              alt=""
              className="size-10 rounded-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <PlatformLogo platform={account.platform} size={40} />
          )}
          <div className="min-w-0">
            <h2 className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="truncate">{readyOverview ? readyOverview.profile.name : account.label}</span>
              {readyOverview?.profile.verified && (
                <SealCheck size={16} weight="fill" aria-label={`Verified on ${platform}`} className="shrink-0" />
              )}
            </h2>
            {readyOverview?.profile.url ? (
              <a
                href={readyOverview.profile.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                {profileLabel}
                <ArrowSquareOut size={12} />
              </a>
            ) : (
              <p className="text-xs text-muted-foreground">{profileLabel}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {retrievedAt.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Updated {new Date(Math.min(...retrievedAt)).toLocaleString()}
            </p>
          )}
          <BusyButton
            variant="secondary"
            pending={overview.isFetching || posts.isFetching}
            icon={<ArrowClockwise size={13} />}
            onClick={() => void Promise.all([overview.refetch(), posts.refetch()])}
          >
            Refresh
          </BusyButton>
        </div>
      </div>
      {(overviewAuthorization || postsAuthorization) && (
        <div className={`${PANEL} space-y-3 p-4`}>
          <SectionHead
            title={`Allow access to ${platform} analytics`}
            description="Reconnect to grant analytics permissions. Your platform may require app approval. After reconnecting, review and save scheduled posts again."
          />
          {authorizationErrors.map((message) => (
            <FormError key={message}>{message}</FormError>
          ))}
          <a
            href={`https://app.superclerk.com/social?view=analytics&account=${encodeURIComponent(account.id)}`}
            target="_blank"
            rel="noreferrer"
            className={buttonClass("primary", "sm")}
          >
            Enable analytics in Superclerk
          </a>
        </div>
      )}
      {!overviewAuthorization &&
        (readyOverview ? (
          <>
            {overview.error && (
              <FormError>{errorMessage(overview.error, "Could not refresh profile totals")}</FormError>
            )}
            {readyOverview.groups.map((group) => (
              <section key={group.title} aria-label={group.title} className="space-y-3">
                <SectionHead title={group.title} description={group.description} />
                <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                  {group.metrics.map((metric) => (
                    <Metric
                      key={metric.key}
                      label={metric.label}
                      value={metric.value === null ? "—" : metric.value.toLocaleString()}
                      title={metric.value === null ? unavailableMetric : undefined}
                      icon={<ChartBar size={14} />}
                    />
                  ))}
                </div>
              </section>
            ))}
          </>
        ) : overview.error ? (
          <ErrorState
            message={errorMessage(overview.error, "Could not load profile performance")}
            onRetry={() => void overview.refetch()}
          />
        ) : (
          <LoadingState message="Loading profile performance…" />
        ))}
      {!postsAuthorization && (
        <section className="space-y-3" aria-label="Post performance">
          <SectionHead
            title="Post performance"
            description={pages?.[0]?.description ?? `Performance reported by ${platform}.`}
          />
          {posts.error && posts.data !== undefined && (
            <div className="flex flex-wrap items-center gap-2">
              <FormError>{errorMessage(posts.error, "Could not refresh post performance")}</FormError>
              <BusyButton variant="ghost" pending={posts.isFetching} onClick={retryPosts}>
                Try again
              </BusyButton>
            </div>
          )}
          {postsStatus?.status === "unavailable" ? (
            <p className={`${PANEL} px-4 py-6 text-xs text-muted-foreground`}>{postsStatus.message}</p>
          ) : (
            <>
              {publications === undefined ? (
                posts.error ? (
                  <ErrorState
                    message={errorMessage(posts.error, "Could not load post performance")}
                    onRetry={retryPosts}
                  />
                ) : (
                  <LoadingState message="Loading post performance…" />
                )
              ) : publications.length === 0 ? (
                <EmptyState title="No posts available" />
              ) : (
                <div className={PANEL}>
                  <ul className="divide-y divide-border/40">
                    {publications.map((post) => (
                      <li key={post.id} className="space-y-4 p-4">
                        <div className="flex min-w-0 items-center gap-3">
                          {post.thumbnailUrl !== null && (
                            <img
                              src={post.thumbnailUrl}
                              alt=""
                              loading="lazy"
                              referrerPolicy="no-referrer"
                              className="size-12 shrink-0 rounded-lg object-cover"
                            />
                          )}
                          <div className="min-w-0">
                            {post.url !== null ? (
                              <a
                                href={post.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 text-[13px] font-medium hover:underline"
                              >
                                <span className="line-clamp-2">{post.title || "Untitled post"}</span>
                                <ArrowSquareOut size={12} className="shrink-0 text-muted-foreground" />
                              </a>
                            ) : (
                              <p className="line-clamp-2 text-[13px] font-medium">{post.title || "Untitled post"}</p>
                            )}
                            {post.publishedAt !== null && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {new Date(post.publishedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
                          {post.metrics.map((metric) => (
                            <div key={metric.key}>
                              <dt className="text-[11px] text-muted-foreground">{metric.label}</dt>
                              <dd
                                title={metric.value === null ? unavailableMetric : undefined}
                                className="mt-1 text-sm font-medium tabular-nums"
                              >
                                {metric.value === null ? "—" : metric.value.toLocaleString()}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {posts.hasNextPage && (
                <BusyButton
                  variant="secondary"
                  disabled={posts.isFetching}
                  pending={posts.isFetchingNextPage}
                  onClick={() => void posts.fetchNextPage()}
                >
                  Load more posts
                </BusyButton>
              )}
            </>
          )}
        </section>
      )}
    </div>
  )
}
