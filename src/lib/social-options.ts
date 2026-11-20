import type { FieldError } from "@superclerk/sdk"

import type { SocialAccount, SocialAsset } from "@/api/social"

type Media = readonly Pick<SocialAsset, "contentType">[]

const none = () => ({})

// What each network's settings start as. YouTube's declarations stay the person's to make, as TikTok's are.
const DEFAULTS: Record<SocialAccount["platform"], (media: Media, caption: string) => Record<string, unknown>> = {
  instagram: (media) => ({ format: media.length === 1 && media[0].contentType === "video/mp4" ? "reel" : "post" }),
  youtube: (_media, caption) => ({
    title: Array.from(caption.split("\n")[0].replace(/[<>]/g, "").trim()).slice(0, 100).join(""),
    categoryId: "22",
    privacyStatus: "public",
    notifySubscribers: true,
  }),
  facebook: none,
  linkedin: none,
  threads: none,
  tiktok: none,
  googlebusiness: none,
}

/**
 * The settings a destination starts with for its media and caption. They are never stored: the person's own
 * choices go on top wherever a destination is shown or saved, so the defaults follow the media until then.
 */
export function defaultOptions(platform: SocialAccount["platform"], media: Media, caption: string) {
  return DEFAULTS[platform](media, caption)
}

export function setSocialPlatformOption(
  platform: SocialAccount["platform"],
  options: Record<string, unknown>,
  name: string,
  value: unknown,
) {
  if (platform === "tiktok" && name === "format" && (value === "inbox" || options.format === "inbox"))
    return { format: value }
  const next = { ...options }
  if (value === undefined) delete next[name]
  else next[name] = value
  if (name === "format") {
    if (platform === "facebook" && value !== "post") {
      delete next.linkUrl
      delete next.title
    }
    if (platform === "linkedin") {
      delete next.sourceUrl
      delete next.title
      delete next.description
    }
    if (platform === "tiktok") {
      for (const field of value === "video"
        ? ["photoCoverIndex", "autoAddMusic", "title"]
        : ["allowDuet", "allowStitch"])
        delete next[field]
    }
  }
  if (platform === "googlebusiness" && name === "topicType") {
    if (value === "STANDARD") delete next.event
    if (value !== "OFFER") delete next.offer
    if (value === "OFFER") delete next.callToAction
  }
  if (platform === "tiktok" && name === "commercialContentDisclosure") {
    for (const field of ["promotesOwnBrand", "promotesThirdParty", "brandedContentPolicyConfirmation"]) {
      next[field] = false
    }
  }
  if (platform === "tiktok" && name === "promotesThirdParty") {
    if (value === false) next.brandedContentPolicyConfirmation = false
    else delete next.brandedContentPolicyConfirmation
  }
  return next
}

// What a refused field asks of the person, in Superclerk's own words; any other field shows the API's message.
const FIELD_PROBLEMS: Partial<Record<string, string>> = {
  format: "Choose a format",
  title: "Add a title",
  categoryId: "Choose a category",
  privacyStatus: "Choose who can watch",
  selfDeclaredMadeForKids: "Answer whether it’s made for kids",
  containsSyntheticMedia: "Answer whether it has altered or synthetic content",
  hasPaidProductPlacement: "Answer whether it has paid promotion",
  communityGuidelinesCertified: "Confirm the video follows YouTube’s Community Guidelines",
}

/**
 * Each field the API refused in one of the post's destinations, with the account it belongs to: a path's
 * `platforms.N` is the Nth destination, and `accounts` lists them in the order the post sent them.
 */
export function fieldProblems(fields: readonly FieldError[], accounts: readonly SocialAccount[]) {
  return fields
    .filter(({ path }) => path[0] === "platforms")
    .map(({ path, message }) => ({
      account: accounts[Number(path[1])],
      problem: FIELD_PROBLEMS[path.at(-1)!] ?? message,
    }))
}
