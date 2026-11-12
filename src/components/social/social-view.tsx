import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useInfiniteQuery, useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowSquareOut, CalendarBlank, Image, PencilSimpleLine, Plus, Queue } from "@phosphor-icons/react"
import { ApiError, superclerk } from "@/api/client"
import type { SocialAccount, SocialPost, SocialPostsQuery } from "@/api/social"
import { Button, BusyButton } from "@/components/common/button"
import { Chip } from "@/components/common/chip"
import { EmptyState, ErrorState, LoadingState } from "@/components/common/empty-state"
import { FormDialog, FormError } from "@/components/common/form-dialog"
import { PageBody, PageHeader } from "@/components/common/page"
import { SelectMenu } from "@/components/common/select-menu"
import { Sheet, SheetBody, SheetContent, SheetFooter, SheetHeader } from "@/components/common/sheet"
import { errorMessage } from "@/lib/errors"
import { Toggle } from "@/components/common/form"
import { socialTikTokCreatorQuery, socialTikTokPublishingProblem, SocialPlatformLabels } from "@/lib/social"
import { cn } from "@/lib/utils"
import { AccountsView, socialAccountsKey } from "./social-accounts"
import { SocialAnalytics } from "./social-analytics"
import { PlatformLogo } from "./social-logo"
import { Composer, localWhen, scheduledInstant, WhenFields, type When } from "./social-composer"
import { MediaPreview } from "./social-media"
import { socialPage, type SocialViewName } from "./social-pages"
import { TikTokDeclaration, TikTokPublishing, TikTokInboxNotice } from "./social-platform-fields"
import { CalendarView, FeedView, monthRange, POST_STATUS_LABELS, PostList, postNeedsAttention } from "./social-views"

const postsKey = ["social", "posts"] as const
type Editor = { kind: "new"; date?: Date } | { kind: "detail" | "edit"; id: string } | null

/** Every view but AI assistants, which is a page of its own. */
type WorkspaceView = Exclude<SocialViewName, "assistants">

const DESCRIPTIONS: Record<WorkspaceView, string> = {
  queue: "Scheduled posts, in the order they go out.",
  calendar: "Every scheduled and published post, day by day.",
  drafts: "Posts saved without a time, ready to schedule or publish.",
  posts: "Everything published or planned from here, newest first.",
  feed: "How posts made here could sit together on Instagram.",
  analytics: "Account activity and post performance across your connected socials.",
  accounts: "Switch on the accounts you want to post to.",
}

function Problem({ error }: { error: unknown }) {
  return error ? <FormError>{errorMessage(error, "The request failed")}</FormError> : null
}

export function SocialView({ view, accountId }: { view: WorkspaceView; accountId: string | undefined }) {
  const cache = useQueryClient()
  const navigate = useNavigate({ from: "/" })
  const [status, setStatus] = useState<SocialPost["status"] | undefined>(undefined)
  const [month, setMonth] = useState(() => new Date())
  const [editor, setEditor] = useState<Editor>(null)
  const accounts = useQuery({ queryKey: socialAccountsKey, queryFn: () => superclerk.social.accounts.list() })
  const accountsLoading =
    accounts.data === undefined && accounts.error === null ? <LoadingState message="Loading accounts…" /> : null
  const filter =
    accountId === undefined ? undefined : accounts.data?.accounts.find((account) => account.id === accountId)
  const feedAccount = view === "feed" && filter?.platform === "instagram" ? filter : undefined
  const listed = view === "queue" || view === "drafts" || view === "posts"
  const filters: SocialPostsQuery =
    view === "queue"
      ? { status: "scheduled", order: "scheduled", accountId }
      : view === "drafts"
        ? { status: "draft", order: "created", accountId }
        : view === "posts"
          ? { status, order: "created", accountId }
          : { accountId: feedAccount?.id, order: "created" }
  const posts = useInfiniteQuery({
    queryKey: [...postsKey, filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => superclerk.social.posts.list({ ...filters, cursor: pageParam }),
    getNextPageParam: (last) => (last.nextCursor === null ? undefined : last.nextCursor),
    enabled: listed || feedAccount !== undefined,
    refetchInterval: 15_000,
  })
  const range = { ...monthRange(month), accountId }
  const calendar = useQuery({
    queryKey: [...postsKey, "calendar", range],
    queryFn: async () => {
      const items: SocialPost[] = []
      for await (const post of superclerk.social.posts.list({ ...range, order: "scheduled", limit: 100 }))
        items.push(post)
      return items
    },
    enabled: view === "calendar",
    refetchInterval: 15_000,
  })
  const selectedId = editor?.kind === "detail" || editor?.kind === "edit" ? editor.id : null
  const selected = useQuery({
    queryKey: ["social", "post", selectedId],
    queryFn: () => {
      if (selectedId === null) throw new Error("Select a post")
      return superclerk.social.posts.get(selectedId)
    },
    enabled: selectedId !== null,
    refetchInterval: editor?.kind === "detail" ? 15_000 : false,
  })
  const saved = async () => {
    setEditor(null)
    await cache.invalidateQueries({ queryKey: postsKey })
  }
  const open = (post: SocialPost) => {
    cache.setQueryData(["social", "post", post.id], post)
    setEditor({ kind: "detail", id: post.id })
  }
  const loaded = posts.data?.pages.flatMap((page) => page.items)
  return (
    <>
      <PageHeader
        title={socialPage(view).label}
        description={DESCRIPTIONS[view]}
        actions={
          view === "accounts" || view === "analytics" ? undefined : (
            <Button disabled={accounts.data === undefined} onClick={() => setEditor({ kind: "new" })}>
              <Plus size={13} weight="bold" />
              New post
            </Button>
          )
        }
      />
      <PageBody>
        <div className="space-y-2 empty:hidden">
          {accounts.data === undefined && accounts.error ? (
            <ErrorState message={errorMessage(accounts.error, "Could not load accounts")} onRetry={accounts.refetch} />
          ) : (
            <Problem error={accounts.error} />
          )}
        </div>
        <div className="min-w-0">
          {/* Analytics and the feed read one account at a time: their own picker chooses the first, then the chips switch. */}
          {view !== "accounts" &&
            (accountId !== undefined || (view !== "analytics" && view !== "feed")) &&
            accounts.data !== undefined && (
              <AccountChips
                accounts={accounts.data.accounts}
                chosen={accountId}
                onChoose={(account) => void navigate({ search: (prev) => ({ ...prev, account }) })}
              />
            )}
          {view === "accounts" ? (
            accounts.data === undefined ? (
              accountsLoading
            ) : (
              <AccountsView accounts={accounts.data.accounts} />
            )
          ) : view === "analytics" ? (
            accounts.data === undefined ? (
              accountsLoading
            ) : (
              <SocialAnalytics
                accounts={accounts.data.accounts}
                accountId={accountId}
                onChoose={(account) => void navigate({ search: (prev) => ({ ...prev, account: account.id }) })}
              />
            )
          ) : view === "calendar" ? (
            calendar.data === undefined ? (
              calendar.error ? (
                <ErrorState
                  message={errorMessage(calendar.error, "Could not load this month")}
                  onRetry={calendar.refetch}
                />
              ) : (
                <LoadingState message="Loading this month’s posts…" />
              )
            ) : (
              <>
                <Problem error={calendar.error} />
                <CalendarView
                  month={month}
                  posts={calendar.data}
                  onMonthChange={setMonth}
                  onOpen={open}
                  onCreate={(date) => setEditor({ kind: "new", date })}
                />
              </>
            )
          ) : view === "feed" && feedAccount === undefined ? (
            accounts.data === undefined ? (
              accountsLoading
            ) : (
              <FeedAccounts
                accounts={accounts.data.accounts}
                onChoose={(account) => void navigate({ search: (prev) => ({ ...prev, account: account.id }) })}
              />
            )
          ) : loaded === undefined ? (
            posts.error ? (
              <ErrorState message={errorMessage(posts.error, "Could not load posts")} onRetry={posts.refetch} />
            ) : (
              <LoadingState message="Loading posts…" />
            )
          ) : (
            <div className={cn(view !== "feed" && "max-w-3xl")}>
              <Problem error={posts.error} />
              {view === "posts" && (
                <SelectMenu
                  size="sm"
                  aria-label="Status"
                  value={status ?? "all"}
                  items={[
                    { value: "all", label: "All statuses" },
                    ...(Object.keys(POST_STATUS_LABELS) as SocialPost["status"][]).map((item) => ({
                      value: item,
                      label: POST_STATUS_LABELS[item],
                    })),
                  ]}
                  onChange={(value) => setStatus(value === "all" ? undefined : (value as SocialPost["status"]))}
                  className="mb-4 w-44"
                />
              )}
              {view === "feed" && feedAccount !== undefined ? (
                <FeedView posts={loaded} account={feedAccount} onOpen={open} />
              ) : loaded.length === 0 ? (
                <EmptyState
                  icon={
                    view === "drafts" ? (
                      <PencilSimpleLine size={26} weight="duotone" />
                    ) : view === "queue" ? (
                      <Queue size={26} weight="duotone" />
                    ) : (
                      <CalendarBlank size={26} weight="duotone" />
                    )
                  }
                  title={
                    view === "queue"
                      ? "Nothing scheduled"
                      : view === "drafts"
                        ? "No drafts"
                        : status === undefined
                          ? "No posts yet"
                          : `No ${POST_STATUS_LABELS[status].toLowerCase()} posts`
                  }
                  description={
                    view === "queue"
                      ? "Write a post and choose a time to fill the queue."
                      : view === "drafts"
                        ? "Posts you save without a time wait here."
                        : undefined
                  }
                  action={
                    <Button onClick={() => setEditor({ kind: "new" })} disabled={accounts.data === undefined}>
                      <Plus size={13} weight="bold" />
                      New post
                    </Button>
                  }
                />
              ) : (
                <PostList
                  posts={loaded}
                  variant={view === "queue" ? "queue" : view === "drafts" ? "drafts" : "all"}
                  onOpen={open}
                />
              )}
              {posts.hasNextPage && (
                <div className="mt-4 flex justify-center">
                  <BusyButton
                    variant="ghost"
                    pending={posts.isFetchingNextPage}
                    onClick={() => void posts.fetchNextPage()}
                  >
                    Load more posts
                  </BusyButton>
                </div>
              )}
            </div>
          )}
        </div>
      </PageBody>
      {editor?.kind === "new" && accounts.data && (
        <Composer
          accounts={accounts.data.accounts}
          initialDate={editor.date}
          onSaved={saved}
          onClose={() => setEditor(null)}
        />
      )}
      {selectedId !== null && (selected.data === undefined || accounts.data === undefined) && (
        <Sheet
          open
          onOpenChange={(next) => {
            if (!next) setEditor(null)
          }}
        >
          <SheetContent>
            <SheetHeader title="Post" description="Loading the post and its accounts." />
            <SheetBody>
              {selected.error || accounts.error ? (
                <ErrorState
                  message={errorMessage(selected.error ?? accounts.error, "Could not load this post")}
                  onRetry={() => {
                    void selected.refetch()
                    void accounts.refetch()
                  }}
                />
              ) : (
                <LoadingState message="Loading post…" />
              )}
            </SheetBody>
          </SheetContent>
        </Sheet>
      )}
      {editor?.kind === "edit" && selected.data && accounts.data && (
        <Composer
          key={`${selected.data.id}:${selected.data.revision}`}
          accounts={accounts.data.accounts}
          post={selected.data}
          refreshError={selected.error}
          onSaved={saved}
          onClose={() => setEditor(null)}
        />
      )}
      {editor?.kind === "detail" && selected.data && accounts.data && (
        <PostDetail
          key={`${selected.data.id}:${selected.data.revision}`}
          post={selected.data}
          accounts={accounts.data.accounts}
          error={selected.error}
          onEdit={() => setEditor({ kind: "edit", id: selected.data.id })}
          onClose={() => setEditor(null)}
        />
      )}
    </>
  )
}

/**
 * Which accounts the posts are for: every one, or one at a time. Shown once there are two to choose between, or while a
 * link names an account, so it can always be cleared.
 */
function AccountChips({
  accounts,
  chosen,
  onChoose,
}: {
  accounts: readonly SocialAccount[]
  chosen: string | undefined
  onChoose: (accountID: string | undefined) => void
}) {
  const listed = accounts.filter((account) => account.status !== "disabled")
  if (listed.length < 2 && chosen === undefined) return null
  return (
    <div role="group" aria-label="Accounts" className="-mx-1 mb-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
      <Chip active={chosen === undefined} onClick={() => onChoose(undefined)}>
        <span className="pl-1.5">All accounts</span>
      </Chip>
      {chosen !== undefined && !listed.some((account) => account.id === chosen) && (
        <Chip active onClick={() => onChoose(undefined)}>
          <span className="pl-1.5">An account that is no longer listed</span>
        </Chip>
      )}
      {listed.map((account) => (
        <Chip
          key={account.id}
          active={account.id === chosen}
          onClick={() => onChoose(account.id === chosen ? undefined : account.id)}
        >
          <PlatformLogo platform={account.platform} size={16} />
          <span className="max-w-44 truncate">{account.label}</span>
          <span className="sr-only">on {SocialPlatformLabels[account.platform]}</span>
          {account.status === "disconnected" && (
            <span aria-label="Disconnected" className="size-1.5 shrink-0 rounded-full bg-destructive" />
          )}
        </Chip>
      ))}
    </div>
  )
}

/** The feed preview is for one Instagram account at a time, so it starts by asking which. */
function FeedAccounts({
  accounts,
  onChoose,
}: {
  accounts: SocialAccount[]
  onChoose: (account: SocialAccount) => void
}) {
  const instagram = accounts.filter((account) => account.platform === "instagram" && account.status !== "disabled")
  if (instagram.length === 0)
    return (
      <EmptyState
        icon={<Image size={26} weight="duotone" />}
        title="No Instagram account"
        description="Add an Instagram account to preview how its posts could look together."
      />
    )
  return (
    <div className="mx-auto max-w-sm space-y-2 py-10 text-center">
      <p className="text-sm font-medium text-foreground">Choose an Instagram account</p>
      <p className="pb-2 text-xs text-muted-foreground">See how posts made here could look on its profile grid.</p>
      {instagram.map((account) => (
        <button
          key={account.id}
          type="button"
          onClick={() => onChoose(account)}
          className="flex w-full cursor-pointer items-center gap-3 rounded-xl bg-surface-soft px-3 py-2.5 text-left transition-colors hover:bg-surface-medium focus-visible:outline-2 focus-visible:outline-ring"
        >
          <PlatformLogo platform="instagram" size={24} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">{account.label}</span>
        </button>
      ))}
    </div>
  )
}

const DESTINATION_STATUS_LABELS: Record<SocialPost["platforms"][number]["status"], string> = {
  pending: "Waiting to publish",
  publishing: "Publishing",
  processing: "Processing media",
  scheduled: "Scheduled by the platform",
  published: "Published",
  awaiting_creator: "Sent to TikTok",
  failed: "Failed",
  outcome_unknown: "Needs checking",
  cancelled: "Cancelled",
}

const DESTINATION_STATUS_TONES: Record<SocialPost["platforms"][number]["status"], string> = {
  pending: "text-muted-foreground",
  publishing: "text-brand",
  processing: "text-brand",
  scheduled: "text-muted-foreground",
  published: "text-success",
  awaiting_creator: "text-brand",
  failed: "text-destructive",
  outcome_unknown: "text-destructive",
  cancelled: "text-muted-foreground",
}

const fullTime = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
})

function PostDetail({
  post,
  accounts,
  error,
  onEdit,
  onClose,
}: {
  post: SocialPost
  accounts: SocialAccount[]
  error: unknown
  onEdit: () => void
  onClose: () => void
}) {
  const cache = useQueryClient()
  const [scheduling, setScheduling] = useState(false)
  const [musicUsageConfirmation, setMusicUsageConfirmation] = useState(false)
  const [brandedContentPolicyConfirmation, setBrandedContentPolicyConfirmation] = useState(false)
  const tiktokDestinations = post.canEdit
    ? post.platforms.filter((destination) => destination.platform === "tiktok")
    : []
  const directTikTokDestinations = tiktokDestinations.filter(
    (destination) => destination.platformSpecificData.format !== "inbox",
  )
  const tiktokAccounts = tiktokDestinations.flatMap((destination) => {
    const account = accounts.find((account) => account.id === destination.accountId && account.status === "active")
    return account === undefined ? [] : [{ account, destination }]
  })
  const creatorQueries = useQueries({
    queries: tiktokAccounts.map(({ account }) => socialTikTokCreatorQuery(account)),
  })
  const tiktokChoicesProblem = tiktokDestinations
    .map((destination) =>
      socialTikTokPublishingProblem({
        ...destination.platformSpecificData,
        musicUsageConfirmation,
        brandedContentPolicyConfirmation,
      }),
    )
    .find((problem) => problem !== null)
  const tiktokProblem =
    tiktokDestinations.length > 0 && post.scheduledFor === null
      ? "Edit this TikTok draft to review its visibility and publishing settings before scheduling or publishing."
      : tiktokChoicesProblem !== undefined
        ? tiktokChoicesProblem
        : tiktokAccounts.length !== tiktokDestinations.length
          ? "A selected TikTok account is unavailable. Edit this post to review its publishing accounts."
          : creatorQueries.some((query) => query.isError)
            ? "Current TikTok settings could not be loaded. Edit this post to review them before scheduling or publishing."
            : creatorQueries.some((query) => query.isPending || query.isFetching)
              ? "Loading current TikTok creator settings…"
              : creatorQueries.some((query, index) =>
                    tiktokAccounts[index]!.destination.platformSpecificData.format !== "inbox"
                      ? query.data?.creatorInfoFingerprint !==
                        tiktokAccounts[index]!.destination.platformSpecificData.creatorInfoFingerprint
                      : query.data?.uploadAuthorized !== true,
                  )
                ? "TikTok creator settings have changed. Edit this post to review its current settings before scheduling or publishing."
                : null
  const update = async (updated: SocialPost) => {
    cache.setQueryData(["social", "post", post.id], updated)
    await cache.invalidateQueries({ queryKey: postsKey })
  }
  const command = useMutation({
    mutationFn: (action: "cancel" | "now") => {
      if (!post.canEdit) throw new Error("This post is not available for changes")
      if (action === "now" && tiktokProblem !== null) throw new Error(tiktokProblem)
      return action === "cancel"
        ? superclerk.social.posts.cancel(post.id, { expectedRevision: post.revision })
        : superclerk.social.posts.reschedule(post.id, { expectedRevision: post.revision, publishNow: true })
    },
    onSuccess: update,
  })
  const media = post.mediaItems
  return (
    <>
      <Sheet
        open
        onOpenChange={(next) => {
          if (!next && !command.isPending) onClose()
        }}
      >
        <SheetContent className="max-w-xl" dismissible={!command.isPending}>
          <SheetHeader
            title={POST_STATUS_LABELS[post.status]}
            description={
              post.scheduledFor === null
                ? "No publish time yet."
                : `${post.status === "scheduled" ? "Goes out" : "Scheduled for"} ${fullTime.format(new Date(post.scheduledFor))}`
            }
          />
          <SheetBody className="space-y-6">
            <Problem error={error} />
            {media.length > 0 && (
              <div className={cn("grid gap-2", media.length === 1 ? "grid-cols-1" : "grid-cols-3")}>
                {media.map((item) => (
                  <MediaPreview
                    key={item.assetId}
                    asset={item.asset}
                    altText={item.altText}
                    controls
                    className={cn("rounded-xl", media.length === 1 ? "aspect-[4/3]" : "aspect-square")}
                  />
                ))}
              </div>
            )}
            {post.content && (
              <p className="whitespace-pre-wrap break-words text-[14px] leading-6 text-foreground">{post.content}</p>
            )}
            <section
              aria-label="Accounts"
              className="divide-y divide-border/50 overflow-hidden rounded-2xl bg-surface-soft"
            >
              {post.platforms.map((destination) => {
                const tiktok = tiktokAccounts.findIndex((entry) => entry.destination.id === destination.id)
                return (
                  <div key={destination.id} className="space-y-3 px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <PlatformLogo platform={destination.platform} size={20} />
                      <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                        {destination.accountLabel}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          {SocialPlatformLabels[destination.platform]}
                        </span>
                      </span>
                      <span
                        className={cn("shrink-0 text-xs font-medium", DESTINATION_STATUS_TONES[destination.status])}
                      >
                        {DESTINATION_STATUS_LABELS[destination.status]}
                      </span>
                    </div>
                    {destination.customContent !== null && (
                      <p className="whitespace-pre-wrap break-words text-[13px] leading-5 text-foreground/85">
                        {destination.customContent}
                      </p>
                    )}
                    {destination.mediaItems !== null && destination.mediaItems.length > 0 && (
                      <div className="grid grid-cols-4 gap-1.5">
                        {destination.mediaItems.map((item) => (
                          <MediaPreview
                            key={item.assetId}
                            asset={item.asset}
                            altText={item.altText}
                            controls
                            className="aspect-square rounded-lg"
                          />
                        ))}
                      </div>
                    )}
                    {tiktok !== -1 && (
                      <TikTokPublishing options={destination.platformSpecificData} creator={creatorQueries[tiktok]!} />
                    )}
                    {destination.status === "awaiting_creator" && <TikTokInboxNotice />}
                    {destination.url !== null && (
                      <a
                        href={destination.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
                      >
                        Open the published post
                        <ArrowSquareOut size={12} />
                      </a>
                    )}
                    {destination.error !== null && <FormError>{destination.error.message}</FormError>}
                    {destination.status === "outcome_unknown" && (
                      <p className="text-xs leading-5 text-destructive">
                        The platform may have published this. Check the account before posting it again; it won’t be
                        republished automatically.
                      </p>
                    )}
                  </div>
                )
              })}
            </section>
            {postNeedsAttention(post) && post.status !== "outcome_unknown" && (
              <p className="text-xs leading-5 text-muted-foreground">
                Accounts that failed won’t be retried. Write a new post to try them again.
              </p>
            )}
            {tiktokProblem !== null && (
              <p role="status" className="text-xs leading-5 text-muted-foreground">
                {tiktokProblem}
              </p>
            )}
            <Problem error={command.error} />
            {command.error instanceof ApiError && command.error.status === 409 && (
              <Button
                variant="secondary"
                onClick={() => void cache.invalidateQueries({ queryKey: ["social", "post", post.id] })}
              >
                Reload latest post
              </Button>
            )}
          </SheetBody>
          {post.canEdit && (
            <SheetFooter>
              {directTikTokDestinations.length > 0 && post.scheduledFor !== null && (
                <div className="min-w-0 basis-full space-y-2 px-0.5 pb-1">
                  {tiktokDestinations.some(
                    (destination) => destination.platformSpecificData.promotesThirdParty === true,
                  ) && (
                    <Toggle
                      label="I agree to TikTok’s Branded Content Policy"
                      checked={brandedContentPolicyConfirmation}
                      onCheckedChange={setBrandedContentPolicyConfirmation}
                    />
                  )}
                  <Toggle
                    label="I agree to TikTok’s Music Usage Confirmation"
                    checked={musicUsageConfirmation}
                    onCheckedChange={setMusicUsageConfirmation}
                  />
                  <TikTokDeclaration
                    branded={tiktokDestinations.some(
                      (destination) => destination.platformSpecificData.promotesThirdParty === true,
                    )}
                  />
                </div>
              )}
              <Button
                variant="danger"
                className="mr-auto"
                disabled={command.isPending}
                onClick={() => command.mutate("cancel")}
              >
                Cancel post
              </Button>
              <Button variant="secondary" disabled={command.isPending} onClick={onEdit}>
                Edit
              </Button>
              <Button
                variant="secondary"
                disabled={command.isPending || tiktokProblem !== null}
                onClick={() => setScheduling(true)}
              >
                {post.scheduledFor === null ? "Schedule" : "Reschedule"}
              </Button>
              <BusyButton
                disabled={tiktokProblem !== null}
                pending={command.isPending}
                onClick={() => command.mutate("now")}
              >
                Publish now
              </BusyButton>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>
      {scheduling && (
        <ScheduleDialog
          post={post}
          disabled={!post.canEdit || tiktokProblem !== null}
          onSaved={async (updated) => {
            await update(updated)
            setScheduling(false)
          }}
          onClose={() => setScheduling(false)}
        />
      )}
    </>
  )
}

function ScheduleDialog({
  post,
  disabled,
  onSaved,
  onClose,
}: {
  post: SocialPost
  disabled: boolean
  onSaved: (post: SocialPost) => Promise<void>
  onClose: () => void
}) {
  const cache = useQueryClient()
  const [expectedRevision] = useState(post.revision)
  const [when, setWhen] = useState<When>(() =>
    post.scheduledFor === null ? { date: "", time: "" } : localWhen(new Date(post.scheduledFor), true),
  )
  const schedule = useMutation({
    mutationFn: () => {
      if (disabled) throw new Error("This post is not available for scheduling")
      return superclerk.social.posts.reschedule(post.id, { expectedRevision, scheduledFor: scheduledInstant(when) })
    },
    onSuccess: onSaved,
  })
  return (
    <FormDialog
      title={post.scheduledFor === null ? "Schedule post" : "Reschedule post"}
      description="Choose when this post goes out."
      pending={schedule.isPending}
      submitLabel={post.scheduledFor === null ? "Schedule" : "Reschedule"}
      submitDisabled={disabled || when.date === "" || when.time === ""}
      onOpenChange={(next) => {
        if (!next) onClose()
      }}
      onSubmit={(event) => {
        event.preventDefault()
        schedule.mutate()
      }}
    >
      <WhenFields
        value={when}
        disabled={disabled}
        onChange={(next) => {
          setWhen(next)
          schedule.reset()
        }}
      />
      <Problem error={schedule.error} />
      {schedule.error instanceof ApiError && schedule.error.status === 409 && (
        <Button
          type="button"
          variant="secondary"
          onClick={async () => {
            await cache.invalidateQueries({ queryKey: ["social", "post", post.id] })
            onClose()
          }}
        >
          Reload latest post
        </Button>
      )}
      {post.platforms.some(
        (destination) => destination.platform === "tiktok" && destination.platformSpecificData.format !== "inbox",
      ) && (
        <TikTokDeclaration
          branded={post.platforms.some(
            (destination) =>
              destination.platform === "tiktok" && destination.platformSpecificData.promotesThirdParty === true,
          )}
        />
      )}
    </FormDialog>
  )
}
