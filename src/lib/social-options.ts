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
  facebook: () => ({ format: "post" }),
  linkedin: () => ({ format: "post" }),
  googlebusiness: () => ({ topicType: "STANDARD", languageCode: globalThis.navigator?.language ?? "en" }),
  threads: none,
  tiktok: none,
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
 * Every field the API refused. A destination's (`platforms.N`, the Nth account in the order the post sent them) comes
 * with its account; any other, such as the caption or the list of accounts, with its path. A field left unchosen, which
 * the API words as an expected type or an allowed value, gets its sentence; a value that breaks a rule, such as a
 * title too long, keeps the API's own words.
 */
export function fieldProblems(fields: readonly FieldError[], accounts: readonly SocialAccount[]) {
  return fields.map(({ path, message }) => {
    const account = path[0] === "platforms" ? accounts[Number(path[1])] : undefined
    const unchosen = message.startsWith("Expected ") || message === "Value is not one of the allowed values."
    const problem = (unchosen && FIELD_PROBLEMS[path.at(-1)!]) || message
    return { account, label: account ? account.label : path.join("."), problem }
  })
}
