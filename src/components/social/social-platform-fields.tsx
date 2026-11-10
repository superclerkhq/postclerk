import type { ReactNode } from "react"
import { useQuery, type UseQueryResult } from "@tanstack/react-query"

import type { SocialAccount, SocialMediaItem } from "@/api/social"
import { Button } from "@/components/common/button"
import { Checkbox } from "@/components/common/checkbox"
import { Field, TextInput, Toggle } from "@/components/common/form"
import { SelectMenu, type SelectMenuItem } from "@/components/common/select-menu"
import {
  setSocialPlatformOption,
  socialTikTokCreatorQuery,
  TikTokSavedChoices,
  type TikTokCreatorSettings,
} from "@/lib/social"

const TIKTOK_PRIVACY_LABELS: Record<TikTokCreatorSettings["privacyLevelOptions"][number], string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
}
const TIKTOK_BRANDED_CONTENT_POLICY = "https://www.tiktok.com/legal/page/global/bc-policy/en"
const TIKTOK_MUSIC_USAGE = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en"
const TIKTOK_PROCESSING_NOTICE = "TikTok may take a few minutes to process a post before it appears on the profile."

function TikTokCreator({ creator }: { creator: UseQueryResult<TikTokCreatorSettings> }) {
  if (creator.data)
    return (
      <div className="flex min-w-0 items-center gap-2.5">
        <img src={creator.data.creatorAvatarURL} alt="" className="size-8 shrink-0 rounded-full bg-surface-medium" />
        <span className="min-w-0 truncate text-sm">
          <span className="font-medium text-foreground">{creator.data.creatorNickname}</span>{" "}
          <span className="text-xs text-muted-foreground">@{creator.data.creatorUsername}</span>
        </span>
      </div>
    )
  return (
    <span className={creator.isError ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
      {creator.isError
        ? `Couldn’t load the current TikTok account: ${creator.error.message}`
        : "Checking the current TikTok account…"}
    </span>
  )
}

/**
 * What TikTok requires a person to see before a post goes out: the account, by its current nickname, and
 * every choice the post publishes with. Changing a choice means editing the post.
 * https://developers.tiktok.com/doc/content-sharing-guidelines
 */
export function TikTokPublishing({
  options,
  creator,
}: {
  options: Record<string, unknown>
  creator: UseQueryResult<TikTokCreatorSettings>
}) {
  const choices = TikTokSavedChoices.parse(options)
  if (choices.format === "inbox")
    return (
      <div className="space-y-3">
        <TikTokCreator creator={creator} />
        <TikTokInboxNotice />
      </div>
    )
  const rows: [string, string][] = [
    ["Who can view", TIKTOK_PRIVACY_LABELS[choices.privacyLevel]],
    ["Comments", choices.allowComment ? "On" : "Off"],
    ...(choices.format === "video"
      ? ([
          ["Duet", choices.allowDuet ? "On" : "Off"],
          ["Stitch", choices.allowStitch ? "On" : "Off"],
        ] as [string, string][])
      : ([["Music", choices.autoAddMusic ? "TikTok adds music" : "No added music"]] as [string, string][])),
    [
      "Promotion",
      choices.promotesThirdParty
        ? "Branded content · labeled “Paid partnership”"
        : choices.promotesOwnBrand
          ? "Your brand · labeled “Promotional content”"
          : "Not promotional",
    ],
    ["AI-generated", choices.isAiGenerated ? "Yes, labeled by TikTok" : "No"],
  ]
  return (
    <div className="space-y-3">
      <TikTokCreator creator={creator} />
      <dl className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-x-3 gap-y-1.5 text-xs">
        {rows.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted-foreground">{TIKTOK_PROCESSING_NOTICE}</p>
    </div>
  )
}

/** The sentence TikTok requires right before the button that publishes. */
export function TikTokDeclaration({ branded }: { branded: boolean }) {
  const link = "underline decoration-foreground/25 underline-offset-2 hover:text-foreground"
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      By posting, you agree to TikTok’s{" "}
      {branded && (
        <>
          <a className={link} href={TIKTOK_BRANDED_CONTENT_POLICY} target="_blank" rel="noreferrer">
            Branded Content Policy
          </a>{" "}
          and{" "}
        </>
      )}
      <a className={link} href={TIKTOK_MUSIC_USAGE} target="_blank" rel="noreferrer">
        Music Usage Confirmation
      </a>
      .
    </p>
  )
}

type Props = {
  account: SocialAccount
  options: Record<string, unknown>
  onChange: (next: Record<string, unknown>) => void
  mediaItems: readonly SocialMediaItem[]
  /** Whether the media this account gets includes a video, which some platform choices only apply to. */
  video: boolean
}

const yesNo = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
]
const postFormats = [
  { value: "post", label: "Feed post" },
  { value: "reel", label: "Reel" },
  { value: "story", label: "Story" },
]

function Choice({
  label,
  value,
  items,
  onChange,
  hint,
  optional,
  disabled,
}: {
  label: string
  value: unknown
  items: readonly SelectMenuItem[]
  onChange: (value: string) => void
  hint?: ReactNode
  optional?: boolean
  disabled?: boolean
}) {
  return (
    <Field label={label} hint={hint} optional={optional}>
      <SelectMenu
        aria-label={label}
        value={typeof value === "string" ? value : null}
        items={items}
        onChange={onChange}
        disabled={disabled}
      />
    </Field>
  )
}

function BooleanChoice({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: unknown
  onChange: (value: boolean) => void
  hint?: ReactNode
}) {
  return (
    <Choice
      label={label}
      value={typeof value === "boolean" ? (value ? "yes" : "no") : undefined}
      items={yesNo}
      onChange={(value) => onChange(value === "yes")}
      hint={hint}
    />
  )
}

export function PlatformFields({ account, options, onChange, mediaItems, video }: Props) {
  const set = (name: string, value: unknown) =>
    onChange(setSocialPlatformOption(account.platform, options, name, value))
  const text = (name: string) => (typeof options[name] === "string" ? (options[name] as string) : "")
  switch (account.platform) {
    case "threads":
      return <p className="text-xs text-muted-foreground">Threads has no additional publishing settings.</p>
    case "instagram":
      return (
        <div className="grid gap-4">
          <Choice
            label="Instagram format"
            value={options.format}
            items={postFormats}
            onChange={(value) => set("format", value)}
            hint="Feed: JPEG or carousel. Reels: MP4. Stories have no caption."
          />
          {(video || options.thumbOffsetMs !== undefined) && (
            <Field label="Video cover" optional hint="The second of the video to use as its cover image.">
              <TextInput
                type="number"
                min={0}
                step={0.1}
                value={typeof options.thumbOffsetMs === "number" ? options.thumbOffsetMs / 1000 : ""}
                onChange={(event) =>
                  set(
                    "thumbOffsetMs",
                    event.target.value === "" ? undefined : Math.round(event.target.valueAsNumber * 1000),
                  )
                }
              />
            </Field>
          )}
        </div>
      )
    case "facebook":
      return (
        <div className="grid gap-4">
          <Choice
            label="Facebook format"
            value={options.format}
            items={postFormats}
            onChange={(value) => set("format", value)}
            hint="Stories have no caption. Reels require one MP4 video."
          />
          {options.format === "post" && (
            <>
              {(mediaItems.length === 0 || options.linkUrl !== undefined) && (
                <Field label="Link" optional hint="An HTTPS link, for a post without photos or video.">
                  <TextInput
                    type="url"
                    value={text("linkUrl")}
                    onChange={(event) => set("linkUrl", event.target.value || undefined)}
                  />
                </Field>
              )}
              {(video || options.title !== undefined) && (
                <Field label="Video title" optional hint="Shown with a feed video.">
                  <TextInput
                    maxLength={255}
                    value={text("title")}
                    onChange={(event) => set("title", event.target.value || undefined)}
                  />
                </Field>
              )}
            </>
          )}
        </div>
      )
    case "linkedin":
      return (
        <div className="grid gap-4">
          <Choice
            label="LinkedIn format"
            value={options.format}
            items={[
              { value: "post", label: "Post" },
              { value: "article", label: "Article link" },
            ]}
            onChange={(value) => set("format", value)}
          />
          {options.format === "article" && (
            <>
              <Field label="Article URL" hint="HTTPS link. Article posts cannot also attach uploaded media.">
                <TextInput
                  type="url"
                  value={text("sourceUrl")}
                  onChange={(event) => set("sourceUrl", event.target.value || undefined)}
                />
              </Field>
              <Field label="Article title">
                <TextInput
                  maxLength={200}
                  value={text("title")}
                  onChange={(event) => set("title", event.target.value || undefined)}
                />
              </Field>
              <Field label="Article description" optional>
                <TextInput
                  maxLength={500}
                  value={text("description")}
                  onChange={(event) => set("description", event.target.value || undefined)}
                />
              </Field>
            </>
          )}
        </div>
      )
    case "youtube":
      return (
        <div className="grid gap-4">
          <Field label="Video title" hint="Up to 100 characters. Angle brackets are not allowed.">
            <TextInput value={text("title")} onChange={(event) => set("title", event.target.value || undefined)} />
          </Field>
          <Field label="YouTube category ID" hint="The numeric ID of your chosen YouTube video category.">
            <TextInput
              inputMode="numeric"
              pattern="[1-9][0-9]*"
              value={text("categoryId")}
              onChange={(event) => set("categoryId", event.target.value || undefined)}
            />
          </Field>
          <Choice
            label="Visibility"
            value={options.privacyStatus}
            items={[
              { value: "public", label: "Public" },
              { value: "unlisted", label: "Unlisted" },
              { value: "private", label: "Private" },
            ]}
            onChange={(value) => set("privacyStatus", value)}
          />
          <Field label="Tags" optional hint="Separate tags with commas. YouTube allows 500 characters in total.">
            <TextInput
              value={Array.isArray(options.tags) ? options.tags.join(", ") : ""}
              onChange={(event) =>
                set(
                  "tags",
                  event.target.value.trim() === "" ? undefined : event.target.value.split(",").map((tag) => tag.trim()),
                )
              }
            />
          </Field>
          <BooleanChoice
            label="Notify subscribers"
            value={options.notifySubscribers}
            onChange={(value) => set("notifySubscribers", value)}
          />
          <BooleanChoice
            label="Made for kids"
            value={options.selfDeclaredMadeForKids}
            onChange={(value) => set("selfDeclaredMadeForKids", value)}
          />
          <BooleanChoice
            label="Altered or synthetic content"
            value={options.containsSyntheticMedia}
            onChange={(value) => set("containsSyntheticMedia", value)}
          />
          <BooleanChoice
            label="Paid product placement"
            value={options.hasPaidProductPlacement}
            onChange={(value) => set("hasPaidProductPlacement", value)}
          />
          <Toggle
            label="This video follows YouTube’s Community Guidelines"
            checked={options.communityGuidelinesCertified === true}
            onCheckedChange={(value) => set("communityGuidelinesCertified", value)}
          />
          <p className="text-xs text-muted-foreground">
            Upload the MP4 first, then an optional JPEG/PNG thumbnail up to 2 MiB.
          </p>
        </div>
      )
    case "googlebusiness":
      return <GoogleBusinessFields options={options} onChange={onChange} />
    case "tiktok":
      return <TikTokFields account={account} options={options} onChange={onChange} mediaItems={mediaItems} />
  }
}

function TikTokCheckbox({
  label,
  value,
  disabled,
  onChange,
  hint,
}: {
  label: string
  value: unknown
  disabled?: boolean
  onChange: (value: boolean) => void
  hint?: string
}) {
  return (
    <label
      className={`flex items-start gap-2.5 text-sm ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
    >
      <Checkbox
        checked={!disabled && value === true}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5"
      />
      <span>
        <span className="text-foreground">{label}</span>
        {hint ? <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span> : null}
      </span>
    </label>
  )
}

export function TikTokInboxNotice() {
  return (
    <p className="text-xs leading-5 text-muted-foreground">
      Open the notification in your TikTok inbox to finish editing and post. Only the video is sent; add your caption,
      music, disclosures and visibility in TikTok. Delivery to the inbox does not publish your video.
    </p>
  )
}

function TikTokFields({ account, options, onChange, mediaItems }: Omit<Props, "video">) {
  const creator = useQuery(socialTikTokCreatorQuery(account))
  const set = (name: string, value: unknown) => onChange(setSocialPlatformOption("tiktok", options, name, value))
  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between gap-3">
        {creator.data ? (
          <div className="flex items-center gap-2">
            <img src={creator.data.creatorAvatarURL} alt="" className="size-8 rounded-full" />
            <span className="text-sm">
              {creator.data.creatorNickname}{" "}
              <span className="text-xs text-muted-foreground">@{creator.data.creatorUsername}</span>
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            {creator.isPending ? "Loading TikTok account settings…" : "TikTok settings unavailable"}
          </span>
        )}
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={creator.isFetching}
          onClick={() => void creator.refetch()}
        >
          Refresh
        </Button>
      </div>
      {creator.error && (
        <p role="alert" className="text-xs text-destructive">
          {creator.error.message}
        </p>
      )}
      <Choice
        label="TikTok delivery"
        value={options.format}
        items={[
          { value: "video", label: "Publish video directly" },
          { value: "photo", label: "Publish photo carousel directly" },
          { value: "inbox", label: "Finish in TikTok" },
        ]}
        onChange={(value) => set("format", value)}
      />
      {options.format === "inbox" && (
        <>
          <TikTokInboxNotice />
          <p className="text-xs text-muted-foreground">Attach one MP4 video, up to 10 minutes and 4 GB.</p>
          {creator.data && !creator.data.uploadAuthorized && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Enable inbox uploads for this TikTok account, then return here and refresh.
              </p>
              <a
                href="https://app.superclerk.com/social"
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand underline"
              >
                Enable in Superclerk
              </a>
            </div>
          )}
          <Toggle
            label="Send this video to my TikTok inbox"
            checked={options.uploadConsent === true}
            onCheckedChange={(value) => set("uploadConsent", value)}
          />
        </>
      )}
      {options.format !== "inbox" && (
        <>
          <Choice
            label="TikTok visibility"
            value={options.privacyLevel}
            disabled={!creator.data || creator.isFetching || creator.isError}
            items={
              creator.data
                ? creator.data.privacyLevelOptions.map((value) => ({
                    value,
                    label: TIKTOK_PRIVACY_LABELS[value],
                    disabled: value === "SELF_ONLY" && options.promotesThirdParty === true,
                  }))
                : []
            }
            onChange={(value) => set("privacyLevel", value)}
            hint="Choose from this account’s current visibility options. Paid partnerships cannot be private."
          />
          {options.format === "video" && (
            <p className="text-xs text-muted-foreground">
              {creator.data
                ? `This account allows videos up to ${creator.data.maxVideoPostDurationSeconds} seconds. The uploaded video’s duration is checked before publishing.`
                : "The uploaded video’s duration is checked against this account’s limit before publishing."}
            </p>
          )}
          {options.format === "photo" && (
            <>
              <Field label="Photo title" optional>
                <TextInput
                  maxLength={90}
                  value={typeof options.title === "string" ? options.title : ""}
                  onChange={(event) => set("title", event.target.value || undefined)}
                />
              </Field>
              <Choice
                label="Cover photo"
                value={typeof options.photoCoverIndex === "number" ? String(options.photoCoverIndex) : undefined}
                items={mediaItems.map((_, index) => ({ value: String(index), label: `Photo ${index + 1}` }))}
                onChange={(value) => set("photoCoverIndex", Number(value))}
                hint="Select an attached photo as the carousel cover."
              />
              <BooleanChoice
                label="Let TikTok add music"
                value={options.autoAddMusic}
                onChange={(value) => set("autoAddMusic", value)}
              />
            </>
          )}
          {creator.data && (
            <>
              <TikTokCheckbox
                label="Allow comments"
                value={options.allowComment}
                disabled={creator.data.commentDisabled}
                hint={creator.data.commentDisabled ? "Disabled by this account’s settings." : undefined}
                onChange={(value) => set("allowComment", value)}
              />
              {options.format === "video" && (
                <>
                  <TikTokCheckbox
                    label="Allow Duet"
                    value={options.allowDuet}
                    disabled={creator.data.duetDisabled}
                    hint={creator.data.duetDisabled ? "Disabled by this account’s settings." : undefined}
                    onChange={(value) => set("allowDuet", value)}
                  />
                  <TikTokCheckbox
                    label="Allow Stitch"
                    value={options.allowStitch}
                    disabled={creator.data.stitchDisabled}
                    hint={creator.data.stitchDisabled ? "Disabled by this account’s settings." : undefined}
                    onChange={(value) => set("allowStitch", value)}
                  />
                </>
              )}
            </>
          )}
          <Toggle
            label="Commercial content disclosure"
            checked={options.commercialContentDisclosure === true}
            onCheckedChange={(value) => set("commercialContentDisclosure", value)}
            hint="Does this post promote you, your business or another brand?"
          />
          {options.commercialContentDisclosure === true && (
            <>
              <TikTokCheckbox
                label="Your brand"
                value={options.promotesOwnBrand}
                onChange={(value) => set("promotesOwnBrand", value)}
                hint="Your post will be labeled Promotional content unless it is also a paid partnership."
              />
              <TikTokCheckbox
                label="Branded content"
                value={options.promotesThirdParty}
                disabled={options.privacyLevel === "SELF_ONLY"}
                onChange={(value) => set("promotesThirdParty", value)}
                hint={
                  options.privacyLevel === "SELF_ONLY"
                    ? "Branded content visibility cannot be set to private."
                    : "You promote another brand or third party. Your post will be labeled Paid partnership."
                }
              />
              <p className="text-xs text-muted-foreground">
                Select your brand, branded content, or both before publishing.
              </p>
            </>
          )}
          <BooleanChoice
            label="AI-generated content"
            value={options.isAiGenerated}
            onChange={(value) => set("isAiGenerated", value)}
          />
          {options.promotesThirdParty === true && (
            <Toggle
              label="I agree to TikTok’s Branded Content Policy"
              checked={options.brandedContentPolicyConfirmation === true}
              onCheckedChange={(value) => set("brandedContentPolicyConfirmation", value)}
            />
          )}
          <Toggle
            label="I agree to TikTok’s Music Usage Confirmation"
            checked={options.musicUsageConfirmation === true}
            onCheckedChange={(value) => set("musicUsageConfirmation", value)}
          />
          <p className="text-xs text-muted-foreground">{TIKTOK_PROCESSING_NOTICE}</p>
        </>
      )}
    </div>
  )
}

function GoogleBusinessFields({
  options,
  onChange,
}: {
  options: Record<string, unknown>
  onChange: Props["onChange"]
}) {
  const set = (name: string, value: unknown) =>
    onChange(setSocialPlatformOption("googlebusiness", options, name, value))
  const event =
    typeof options.event === "object" && options.event !== null ? (options.event as Record<string, unknown>) : {}
  const schedule =
    typeof event.schedule === "object" && event.schedule !== null ? (event.schedule as Record<string, unknown>) : {}
  const offer =
    typeof options.offer === "object" && options.offer !== null ? (options.offer as Record<string, unknown>) : {}
  const action =
    typeof options.callToAction === "object" && options.callToAction !== null
      ? (options.callToAction as Record<string, unknown>)
      : {}
  const text = (value: unknown) => (typeof value === "string" ? value : "")
  const setNested = (
    name: "event" | "offer" | "callToAction",
    current: Record<string, unknown>,
    key: string,
    value: unknown,
  ) => {
    const next = { ...current }
    if (value === undefined) delete next[key]
    else next[key] = value
    set(name, Object.keys(next).length === 0 ? undefined : next)
  }
  const setSchedule = (name: string, value: unknown) => {
    const next = { ...schedule }
    if (value === undefined) delete next[name]
    else next[name] = value
    setNested("event", event, "schedule", Object.keys(next).length === 0 ? undefined : next)
  }
  return (
    <div className="grid gap-4">
      <Choice
        label="Google Business post type"
        value={options.topicType}
        items={[
          { value: "STANDARD", label: "Update" },
          { value: "EVENT", label: "Event" },
          { value: "OFFER", label: "Offer" },
        ]}
        onChange={(value) => set("topicType", value)}
      />
      <Field label="Language code" hint="For example, en or en-US.">
        <TextInput
          minLength={2}
          maxLength={32}
          value={text(options.languageCode)}
          onChange={(event) => set("languageCode", event.target.value || undefined)}
        />
      </Field>
      {(options.topicType === "EVENT" || options.topicType === "OFFER") && (
        <>
          <Field label="Event title">
            <TextInput
              maxLength={200}
              value={text(event.title)}
              onChange={(input) => setNested("event", event, "title", input.target.value || undefined)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            {(["start", "end"] as const).map((part) => (
              <div key={part} className="grid gap-3">
                <Field label={`${part === "start" ? "Start" : "End"} date`}>
                  <TextInput
                    type="date"
                    value={businessDate(schedule[`${part}Date`])}
                    onChange={(input) => {
                      const [year, month, day] = input.target.value.split("-").map(Number)
                      setSchedule(`${part}Date`, input.target.value === "" ? undefined : { year, month, day })
                    }}
                  />
                </Field>
                <Field label={`${part === "start" ? "Start" : "End"} time`}>
                  <TextInput
                    type="time"
                    step={1}
                    value={businessTime(schedule[`${part}Time`])}
                    onChange={(input) => {
                      const [hours, minutes, seconds] = input.target.value.split(":").map(Number)
                      setSchedule(
                        `${part}Time`,
                        input.target.value === ""
                          ? undefined
                          : { hours, minutes, ...(seconds === undefined ? {} : { seconds }) },
                      )
                    }}
                  />
                </Field>
              </div>
            ))}
          </div>
        </>
      )}
      {options.topicType === "OFFER" ? (
        <>
          <p className="text-xs text-muted-foreground">An offer needs a coupon, redemption link or terms.</p>
          <Field label="Coupon code" optional>
            <TextInput
              maxLength={200}
              value={text(offer.couponCode)}
              onChange={(input) => setNested("offer", offer, "couponCode", input.target.value || undefined)}
            />
          </Field>
          <Field label="Redemption URL" optional>
            <TextInput
              type="url"
              maxLength={2048}
              value={text(offer.redeemOnlineUrl)}
              onChange={(input) => setNested("offer", offer, "redeemOnlineUrl", input.target.value || undefined)}
            />
          </Field>
          <Field label="Terms and conditions" optional>
            <TextInput
              maxLength={5000}
              value={text(offer.termsConditions)}
              onChange={(input) => setNested("offer", offer, "termsConditions", input.target.value || undefined)}
            />
          </Field>
        </>
      ) : (
        options.topicType !== undefined && (
          <>
            <Choice
              label="Call to action"
              optional
              value={action.actionType}
              items={[
                { value: "none", label: "No button" },
                { value: "BOOK", label: "Book" },
                { value: "ORDER", label: "Order" },
                { value: "SHOP", label: "Shop" },
                { value: "LEARN_MORE", label: "Learn more" },
                { value: "SIGN_UP", label: "Sign up" },
                { value: "CALL", label: "Call" },
              ]}
              onChange={(value) =>
                set(
                  "callToAction",
                  value === "none"
                    ? undefined
                    : {
                        actionType: value,
                        ...(value !== "CALL" && action.url !== undefined ? { url: action.url } : {}),
                      },
                )
              }
            />
            {action.actionType !== undefined && action.actionType !== "CALL" && (
              <Field label="Button URL">
                <TextInput
                  type="url"
                  maxLength={2048}
                  value={text(action.url)}
                  onChange={(input) => setNested("callToAction", action, "url", input.target.value || undefined)}
                />
              </Field>
            )}
          </>
        )
      )}
    </div>
  )
}

function businessDate(value: unknown) {
  if (typeof value !== "object" || value === null) return ""
  const date = value as { year: number; month: number; day: number }
  return `${date.year}-${String(date.month).padStart(2, "0")}-${String(date.day).padStart(2, "0")}`
}

function businessTime(value: unknown) {
  if (typeof value !== "object" || value === null) return ""
  const time = value as { hours: number; minutes: number; seconds?: number }
  return `${String(time.hours).padStart(2, "0")}:${String(time.minutes).padStart(2, "0")}${time.seconds === undefined ? "" : `:${String(time.seconds).padStart(2, "0")}`}`
}
