import { useReducer, useRef, useState } from "react"
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Check, Plus } from "@phosphor-icons/react"
import { ApiError, superclerk } from "@/api/client"
import type { SocialAccount, SocialCreatePostInput, SocialMediaItem, SocialPost } from "@/api/social"
import { Button, BusyButton } from "@/components/common/button"
import { Checkbox } from "@/components/common/checkbox"
import { Field, TextInput, fieldTone } from "@/components/common/form"
import { FormDialog, FormError } from "@/components/common/form-dialog"
import { DialogFooter } from "@/components/ui/dialog"
import { errorMessage } from "@/lib/errors"
import {
  socialContent,
  socialDraft,
  socialScheduledFor,
  socialTikTokCreatorQuery,
  socialTikTokPublishingProblem,
  uploadSocialFile,
  SocialPlatformLabels,
  type SocialDestinationDraft,
  type SocialDraft,
  type TikTokCreatorSettings,
} from "@/lib/social"
import { cn } from "@/lib/utils"
import { PlatformLogo } from "./social-logo"
import { assetKey, MediaTray, type StagedUpload } from "./social-media"
import { PlatformFields, TikTokDeclaration } from "./social-platform-fields"

export type ComposerState = { draft: SocialDraft; uploads: StagedUpload[] }

export type ComposerAction =
  | { type: "edit"; update: (draft: SocialDraft) => SocialDraft }
  | { type: "select"; accountId: string; selected: boolean }
  | { type: "own-media"; accountId: string; own: boolean }
  | { type: "stage"; uploads: StagedUpload[] }
  | { type: "uploaded"; id: string; assetId: string }
  | { type: "failed"; id: string; error: string }
  | { type: "retry"; id: string }
  | { type: "discard"; id: string }

function appendAsset(media: SocialMediaItem[], assetId: string) {
  return media.some((item) => item.assetId === assetId) ? media : [...media, { assetId }]
}

/**
 * The composer's one owner of the draft and the files still on their way into it. Taking an account off
 * the post, or giving it back the shared media, discards that account's files in the same step.
 */
export function composerReducer(state: ComposerState, action: ComposerAction): ComposerState {
  const { draft, uploads } = state
  switch (action.type) {
    case "edit":
      return { draft: action.update(draft), uploads }
    case "select":
      return action.selected
        ? {
            draft: {
              ...draft,
              destinations: [
                ...draft.destinations,
                { accountId: action.accountId, options: {}, customContent: null, mediaItems: null },
              ],
            },
            uploads,
          }
        : {
            draft: { ...draft, destinations: draft.destinations.filter((item) => item.accountId !== action.accountId) },
            uploads: uploads.filter((upload) => upload.accountId !== action.accountId),
          }
    case "own-media":
      return {
        draft: {
          ...draft,
          destinations: draft.destinations.map((item) =>
            item.accountId === action.accountId
              ? { ...item, mediaItems: action.own ? [...draft.mediaItems] : null }
              : item,
          ),
        },
        uploads: action.own ? uploads : uploads.filter((upload) => upload.accountId !== action.accountId),
      }
    case "stage":
      return { draft, uploads: [...uploads, ...action.uploads] }
    case "uploaded": {
      const upload = uploads.find((item) => item.id === action.id)
      // A discarded file never joins the post, even if confirmation completed before cancellation.
      if (upload === undefined) return state
      return {
        draft:
          upload.accountId === null
            ? { ...draft, mediaItems: appendAsset(draft.mediaItems, action.assetId) }
            : {
                ...draft,
                destinations: draft.destinations.map((item) => {
                  if (item.accountId !== upload.accountId) return item
                  if (item.mediaItems === null) throw new Error("An account's own upload outlived its own media")
                  return { ...item, mediaItems: appendAsset(item.mediaItems, action.assetId) }
                }),
              },
        uploads: uploads.filter((item) => item.id !== action.id),
      }
    }
    case "failed":
      return {
        draft,
        uploads: uploads.map((upload) =>
          upload.id === action.id ? { ...upload, state: { kind: "failed", error: action.error } } : upload,
        ),
      }
    case "retry":
      return {
        draft,
        uploads: uploads.map((upload) =>
          upload.id === action.id ? { ...upload, state: { kind: "uploading" } } : upload,
        ),
      }
    case "discard":
      return { draft, uploads: uploads.filter((upload) => upload.id !== action.id) }
  }
}

/** A local date and time, as their two inputs hold them. Empty until the person chooses. */
export type When = { date: string; time: string }

function pad(value: number) {
  return String(value).padStart(2, "0")
}

export function localWhen(instant: Date, withTime: boolean): When {
  return {
    date: `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`,
    time: withTime ? `${pad(instant.getHours())}:${pad(instant.getMinutes())}` : "",
  }
}

export function scheduledInstant(when: When) {
  const date = new Date(`${when.date}T${when.time}`)
  if (when.date === "" || when.time === "" || !Number.isFinite(date.getTime()))
    throw new Error("Choose a publish date and time")
  const local = localWhen(date, true)
  if (local.date !== when.date || local.time !== when.time)
    throw new Error("This publish date and time does not exist in your time zone. Choose another time.")
  return socialScheduledFor(date.toISOString())
}

export function WhenFields({
  value,
  disabled,
  onChange,
}: {
  value: When
  disabled?: boolean
  onChange: (value: When) => void
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-2">
        <Field label="Date" className="w-44">
          <TextInput
            type="date"
            required
            disabled={disabled}
            value={value.date}
            onChange={(event) => onChange({ ...value, date: event.target.value })}
          />
        </Field>
        <Field label="Time" className="w-32">
          <TextInput
            type="time"
            required
            disabled={disabled}
            value={value.time}
            onChange={(event) => onChange({ ...value, time: event.target.value })}
          />
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">Times are in {Intl.DateTimeFormat().resolvedOptions().timeZone}.</p>
    </div>
  )
}

const INTENTS = [
  { id: "draft", label: "Draft", submit: "Save draft" },
  { id: "schedule", label: "Schedule", submit: "Schedule post" },
  { id: "now", label: "Publish now", submit: "Publish now" },
] as const

type Intent = (typeof INTENTS)[number]["id"]

/** The date and time beside the save button, with the zone they are read in. */
function WhenInputs({ value, onChange }: { value: When; onChange: (value: When) => void }) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const field = cn(fieldTone("outline"), "h-8 py-0 text-xs")
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <input
        type="date"
        required
        aria-label="Publish date"
        value={value.date}
        onChange={(event) => onChange({ ...value, date: event.target.value })}
        className={cn(field, "w-[9.25rem]")}
      />
      <input
        type="time"
        required
        aria-label="Publish time"
        value={value.time}
        onChange={(event) => onChange({ ...value, time: event.target.value })}
        className={cn(field, "w-[7.75rem]")}
      />
      <span className="text-xs text-muted-foreground">{zone}</span>
    </span>
  )
}

/** A per-account switch for a part of the post that account gets its own version of. */
function VersionToggle({ label, pressed, onClick }: { label: string; pressed: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        pressed
          ? "bg-brand-subtle text-brand"
          : "bg-background text-muted-foreground shadow-[0_0_0_0.5px_var(--chrome-edge)] hover:text-foreground",
      )}
    >
      {pressed ? <Check size={11} weight="bold" /> : <Plus size={11} weight="bold" />}
      {label}
    </button>
  )
}

/**
 * Writing a post: the accounts it goes to, its media and caption, any account's own version, and when it
 * publishes. A save waits for every added file, so a photo is never left out of a post unnoticed.
 */
export function Composer({
  accounts,
  post,
  initialDate,
  refreshError,
  onSaved,
  onClose,
}: {
  accounts: SocialAccount[]
  post?: SocialPost
  initialDate?: Date
  refreshError?: unknown
  onSaved: () => Promise<void>
  onClose: () => void
}) {
  const cache = useQueryClient()
  const [{ draft, uploads }, dispatch] = useReducer(composerReducer, post, (saved) => ({
    draft: socialDraft(saved),
    uploads: [],
  }))
  const [intent, setIntent] = useState<Intent>(initialDate === undefined ? "draft" : "schedule")
  const [when, setWhen] = useState<When>(() =>
    initialDate === undefined ? { date: "", time: "" } : localWhen(initialDate, false),
  )
  const [access, setAccess] = useState<"public" | "private">("public")
  const creation = useRef<{ body: string; key: string } | null>(null)
  const editable = post === undefined || post.canEdit
  const chooseWhen = post === undefined || post.scheduledFor === null
  const initialAssets =
    post === undefined
      ? []
      : [
          ...post.mediaItems,
          ...post.platforms.flatMap((destination) => (destination.mediaItems === null ? [] : destination.mediaItems)),
        ].map((item) => item.asset)
  const attachedIds = [
    ...new Set(
      [
        ...draft.mediaItems,
        ...draft.destinations.flatMap((destination) => (destination.mediaItems === null ? [] : destination.mediaItems)),
      ].map((item) => item.assetId),
    ),
  ]
  const videos = new Set(
    useQueries({
      queries: attachedIds.map((id) => ({
        queryKey: assetKey(id),
        queryFn: () => superclerk.social.media.get(id),
        initialData: initialAssets.find((asset) => asset.id === id),
      })),
    }).flatMap((asset) => (asset.data?.contentType === "video/mp4" ? [asset.data.id] : [])),
  )
  const accountFor = (accountId: string) => {
    const account = accounts.find((item) => item.id === accountId)
    if (account === undefined) throw new Error("A selected account is no longer listed")
    return account
  }
  const tiktokDestinations = draft.destinations.filter(
    (destination) => accountFor(destination.accountId).platform === "tiktok",
  )
  const tiktokProblem = tiktokDestinations
    .map((destination) => socialTikTokPublishingProblem(destination.options))
    .find((problem) => problem !== null)
  const uploading = uploads.filter((upload) => upload.state.kind === "uploading").length
  const failed = uploads.length - uploading
  const blocked =
    uploading > 0
      ? `Uploading ${uploading} ${uploading === 1 ? "file" : "files"}. Saving is ready once ${uploading === 1 ? "it’s" : "they’re"} verified.`
      : failed > 0
        ? `Retry or remove ${failed === 1 ? "the file" : `the ${failed} files`} that didn’t upload before saving.`
        : tiktokProblem

  const upload = async (batch: StagedUpload[]) => {
    for (const item of batch) {
      if (item.abort.signal.aborted) continue
      try {
        const asset = await uploadSocialFile({
          file: item.file,
          storageAccess: item.access,
          idempotencyKey: item.key,
          signal: item.abort.signal,
        })
        cache.setQueryData(assetKey(asset.id), asset)
        dispatch({ type: "uploaded", id: item.id, assetId: asset.id })
      } catch (error) {
        if (!item.abort.signal.aborted)
          dispatch({ type: "failed", id: item.id, error: errorMessage(error, "Upload failed") })
      }
    }
    await cache.invalidateQueries({ queryKey: ["social", "library"] })
  }
  const addFiles = (accountId: string | null, files: File[], fileAccess: "public" | "private") => {
    // Drops and pastes land on elements a disabled fieldset doesn't reach, so every way in is closed here.
    if (files.length === 0 || save.isPending || !editable) return
    const batch: StagedUpload[] = files.map((file) => ({
      id: crypto.randomUUID(),
      accountId,
      file,
      access: fileAccess,
      key: crypto.randomUUID(),
      abort: new AbortController(),
      state: { kind: "uploading" },
    }))
    dispatch({ type: "stage", uploads: batch })
    void upload(batch)
  }
  const retry = (item: StagedUpload) => {
    dispatch({ type: "retry", id: item.id })
    void upload([item])
  }
  const discard = (item: StagedUpload) => {
    item.abort.abort()
    dispatch({ type: "discard", id: item.id })
  }
  const abortFor = (accountId: string) => {
    for (const item of uploads) if (item.accountId === accountId) item.abort.abort()
  }
  const close = () => {
    if (save.isPending) return
    for (const item of uploads) item.abort.abort()
    onClose()
  }
  const edit = (update: (current: SocialDraft) => SocialDraft) => {
    dispatch({ type: "edit", update })
    save.reset()
  }
  const editDestination = (
    accountId: string,
    update: (current: SocialDestinationDraft, draft: SocialDraft) => Partial<SocialDestinationDraft>,
  ) =>
    edit((current) => ({
      ...current,
      destinations: current.destinations.map((item) =>
        item.accountId === accountId ? { ...item, ...update(item, current) } : item,
      ),
    }))
  // Private media publishes only to YouTube, so the choice is offered only where YouTube is the sole audience.
  const onlyYouTube =
    draft.destinations.length > 0 &&
    draft.destinations.every((destination) => accountFor(destination.accountId).platform === "youtube")
  const accessFor = (youtube: boolean) => (youtube ? { value: access, onChange: setAccess } : null)

  const save = useMutation({
    mutationFn: async () => {
      if (!editable) throw new Error("This post can no longer be edited")
      if (uploads.length > 0) throw new Error("Finish or remove every added file before saving")
      const creators = new Map<string, TikTokCreatorSettings>()
      for (const destination of draft.destinations) {
        const account = accountFor(destination.accountId)
        if (account.platform !== "tiktok") continue
        const key = socialTikTokCreatorQuery(account).queryKey
        const state = cache.getQueryState(key)
        if (state?.fetchStatus === "fetching") throw new Error("Wait for current TikTok settings to finish loading")
        if (state?.status === "error") throw new Error("Refresh TikTok creator settings before saving")
        const creator = cache.getQueryData(key)
        if (creator !== undefined) creators.set(account.id, creator)
      }
      const content = socialContent(draft, accounts, creators)
      if (post !== undefined) {
        const body = { ...content, expectedRevision: post.revision }
        return superclerk.social.posts.update(
          post.id,
          !chooseWhen || intent === "draft"
            ? body
            : intent === "now"
              ? { ...body, publishNow: true }
              : { ...body, scheduledFor: scheduledInstant(when) },
        )
      }
      const body: SocialCreatePostInput =
        intent === "draft"
          ? { ...content, isDraft: true }
          : intent === "now"
            ? { ...content, publishNow: true }
            : { ...content, scheduledFor: scheduledInstant(when) }
      const serialized = JSON.stringify(body, (_key, value) =>
        value !== null && typeof value === "object" && !Array.isArray(value)
          ? Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))
          : value,
      )
      if (creation.current === null || creation.current.body !== serialized)
        creation.current = { body: serialized, key: crypto.randomUUID() }
      return superclerk.social.posts.create(body, { idempotencyKey: creation.current.key })
    },
    onSuccess: async (saved) => {
      cache.setQueryData(["social", "post", saved.id], saved)
      await onSaved()
    },
  })
  const dirty =
    JSON.stringify(draft) !== JSON.stringify(socialDraft(post)) ||
    uploads.length > 0 ||
    (chooseWhen && (intent !== "draft" || when.date !== "" || when.time !== ""))
  const submitLabel =
    post !== undefined && (!chooseWhen || intent === "draft")
      ? "Save changes"
      : intent === "now" && tiktokDestinations.some((destination) => destination.options.format === "inbox")
        ? "Send now"
        : INTENTS.find((item) => item.id === intent)!.submit
  const select = (accountId: string, selected: boolean) => {
    if (!selected) abortFor(accountId)
    dispatch({ type: "select", accountId, selected })
    save.reset()
  }
  return (
    <FormDialog
      sheet
      className="max-w-5xl"
      bodyClassName="space-y-6"
      title={post === undefined ? "New post" : "Edit post"}
      description={
        post === undefined
          ? "Write it once, then tune it for each account."
          : "Changes apply to every account it goes to."
      }
      pending={save.isPending}
      dirty={dirty}
      footer={
        <DialogFooter className="gap-y-2">
          {tiktokDestinations.some((destination) => destination.options.format !== "inbox") && (
            <div className="basis-full">
              <TikTokDeclaration
                branded={tiktokDestinations.some((destination) => destination.options.promotesThirdParty === true)}
              />
            </div>
          )}
          {tiktokDestinations.some((destination) => destination.options.format === "inbox") && (
            <div className="basis-full">
              <p className="text-xs text-muted-foreground">
                Your video will be sent to your TikTok inbox. Finish editing and publish in TikTok.
              </p>
            </div>
          )}
          {save.error ? (
            <div className="flex basis-full flex-wrap items-center gap-x-3 gap-y-1">
              <FormError>{errorMessage(save.error, "The post could not be saved")}</FormError>
              {post !== undefined && save.error instanceof ApiError && save.error.status === 409 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void cache.invalidateQueries({ queryKey: ["social", "post", post.id] })}
                >
                  Reload the latest version
                </Button>
              )}
            </div>
          ) : blocked ? (
            <p role="status" className="basis-full text-xs text-muted-foreground">
              {blocked}
            </p>
          ) : null}
          {chooseWhen ? (
            // Outside the body's fieldset, so it is locked here: changing when a save publishes resets it mid-flight.
            <fieldset
              disabled={save.isPending}
              className="m-0 mr-auto flex min-w-0 basis-full flex-wrap items-center gap-2 border-0 p-0 sm:basis-auto"
            >
              <div
                role="group"
                aria-label="When to publish"
                className="inline-flex h-8 items-center gap-0.5 rounded-md bg-foreground/[0.05] p-0.5"
              >
                {INTENTS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={intent === option.id}
                    onClick={() => {
                      setIntent(option.id)
                      save.reset()
                    }}
                    className={cn(
                      "inline-flex h-7 cursor-pointer items-center rounded-[5px] px-2.5 text-xs font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
                      "disabled:cursor-not-allowed disabled:opacity-60",
                      intent === option.id
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {intent === "schedule" && (
                <WhenInputs
                  value={when}
                  onChange={(next) => {
                    setWhen(next)
                    save.reset()
                  }}
                />
              )}
            </fieldset>
          ) : (
            <p className="mr-auto text-xs text-muted-foreground">Saving keeps its schedule.</p>
          )}
          <Button type="button" variant="ghost" disabled={save.isPending} onClick={close}>
            Cancel
          </Button>
          <BusyButton
            type="submit"
            pending={save.isPending || uploading > 0}
            disabled={!editable || draft.destinations.length === 0 || failed > 0 || tiktokProblem !== undefined}
            title={tiktokProblem}
          >
            {submitLabel}
          </BusyButton>
        </DialogFooter>
      }
      onOpenChange={(next) => {
        if (!next) close()
      }}
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate()
      }}
    >
      {refreshError ? <FormError>{errorMessage(refreshError, "The request failed")}</FormError> : null}
      {!editable && (
        <p className="text-xs text-muted-foreground">
          This post is read-only for your account or can no longer be edited.
        </p>
      )}
      <fieldset disabled={!editable} className="m-0 min-w-0 border-0 p-0">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,23rem)] lg:items-start">
          <div className="min-w-0 space-y-5 lg:sticky lg:top-0">
            <MediaTray
              label="Photos and video"
              items={draft.mediaItems}
              uploads={uploads.filter((item) => item.accountId === null)}
              initialAssets={initialAssets}
              access={accessFor(onlyYouTube)}
              onFiles={(files) => addFiles(null, files, onlyYouTube ? access : "public")}
              onRetry={retry}
              onDiscard={discard}
              onChange={(update) => edit((current) => ({ ...current, mediaItems: update(current.mediaItems) }))}
            />
            <Field label="Caption">
              <textarea
                rows={7}
                className={cn(
                  fieldTone("soft"),
                  "max-h-[55vh] min-h-40 resize-y text-[14px] leading-6 [field-sizing:content]",
                )}
                value={draft.content}
                placeholder="What do you want to share?"
                onChange={(event) => {
                  const content = event.target.value
                  edit((current) => ({ ...current, content }))
                }}
                onPaste={(event) => {
                  if (event.clipboardData.files.length === 0) return
                  event.preventDefault()
                  addFiles(null, Array.from(event.clipboardData.files), onlyYouTube ? access : "public")
                }}
              />
            </Field>
          </div>
          <section aria-label="Accounts" className="min-w-0 space-y-2.5">
            <h3 className="text-xs font-medium text-foreground">Post to</h3>
            {!accounts.some((account) => account.status === "active") && (
              <p className="text-xs text-muted-foreground">
                No active profiles.{" "}
                <Link to="/" search={{ view: "accounts" }} className="font-medium text-brand hover:underline">
                  Add an account
                </Link>{" "}
                to publish.
              </p>
            )}
            <div role="group" aria-label="Publish to" className="space-y-2">
              {accounts.map((account) => {
                const destination = draft.destinations.find((item) => item.accountId === account.id)
                if (account.status === "disabled" && destination === undefined) return null
                const unavailable = account.status !== "active"
                const youtube = account.platform === "youtube"
                const media =
                  destination === undefined || destination.mediaItems === null
                    ? draft.mediaItems
                    : destination.mediaItems
                return (
                  <section
                    key={account.id}
                    aria-label={destination === undefined ? undefined : `${account.label} settings`}
                    className="overflow-hidden rounded-2xl bg-surface-soft"
                  >
                    <label
                      className={cn(
                        "flex min-h-14 items-center gap-2.5 px-4 py-3",
                        unavailable && destination === undefined ? "cursor-not-allowed opacity-50" : "cursor-pointer",
                      )}
                    >
                      <Checkbox
                        aria-label={`${account.label} ${SocialPlatformLabels[account.platform]}`}
                        checked={destination !== undefined}
                        disabled={unavailable && destination === undefined}
                        onChange={(event) => select(account.id, event.target.checked)}
                      />
                      <PlatformLogo platform={account.platform} size={24} />
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-[13px] font-medium text-foreground">{account.label}</span>
                        <span className="block text-[11.5px] text-muted-foreground">
                          {SocialPlatformLabels[account.platform]}
                        </span>
                      </span>
                      {unavailable && (
                        <span className="shrink-0 text-[11px] text-destructive">
                          {account.status === "disabled" ? "Removed" : "Disconnected"}
                        </span>
                      )}
                    </label>
                    {destination !== undefined && (
                      <div className="space-y-4 px-4 pb-4">
                        <div className="flex flex-wrap gap-1.5">
                          <VersionToggle
                            label="Different caption"
                            pressed={destination.customContent !== null}
                            onClick={() =>
                              editDestination(account.id, (current, shared) => ({
                                customContent: current.customContent === null ? shared.content : null,
                              }))
                            }
                          />
                          <VersionToggle
                            label="Different media"
                            pressed={destination.mediaItems !== null}
                            onClick={() => {
                              const own = destination.mediaItems === null
                              if (!own) abortFor(account.id)
                              dispatch({ type: "own-media", accountId: account.id, own })
                              save.reset()
                            }}
                          />
                        </div>
                        {destination.customContent !== null && (
                          <Field label={`Caption for ${account.label}`}>
                            <textarea
                              rows={4}
                              className={cn(
                                fieldTone("outline"),
                                "min-h-24 resize-y text-[14px] leading-6 [field-sizing:content]",
                              )}
                              value={destination.customContent}
                              onChange={(event) => {
                                const customContent = event.target.value
                                editDestination(account.id, () => ({ customContent }))
                              }}
                            />
                          </Field>
                        )}
                        {destination.mediaItems !== null && (
                          <MediaTray
                            label={`Media for ${account.label}`}
                            items={destination.mediaItems}
                            uploads={uploads.filter((item) => item.accountId === account.id)}
                            initialAssets={initialAssets}
                            access={accessFor(youtube)}
                            onFiles={(files) => addFiles(account.id, files, youtube ? access : "public")}
                            onRetry={retry}
                            onDiscard={discard}
                            onChange={(update) =>
                              editDestination(account.id, (current) => {
                                if (current.mediaItems === null) throw new Error("This account uses the shared media")
                                return { mediaItems: update(current.mediaItems) }
                              })
                            }
                          />
                        )}
                        <PlatformFields
                          account={account}
                          options={destination.options}
                          mediaItems={media}
                          video={media.some((item) => videos.has(item.assetId))}
                          onChange={(options) => editDestination(account.id, () => ({ options }))}
                        />
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </section>
        </div>
      </fieldset>
    </FormDialog>
  )
}
