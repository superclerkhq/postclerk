import { sha256 } from "@noble/hashes/sha2.js"
import z from "zod"
import { queryOptions } from "@tanstack/react-query"

import { superclerk } from "@/api/client"
import type {
  ConnectionAccount,
  SocialAccount,
  SocialAsset,
  SocialContentInput,
  SocialMediaItem,
  SocialPost,
  SocialUploadInput,
  TikTokCreatorSettings,
} from "@/api/social"
import { SocialMediaAssetUploadMetadata } from "@/lib/social-media-schema"

export const SocialPlatformLabels: Record<SocialAccount["platform"], string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
  tiktok: "TikTok",
  youtube: "YouTube",
  googlebusiness: "Google Business Profile",
}

export type { TikTokCreatorSettings }

/** The networks this app posts to, by the Superclerk app that connects each one. */
export const SocialNetworks = [
  { appID: "instagram", platform: "instagram", label: "Instagram" },
  { appID: "facebook-page", platform: "facebook", label: "Facebook Page" },
  { appID: "linkedin-profile", platform: "linkedin", label: "LinkedIn profile" },
  { appID: "linkedin-page", platform: "linkedin", label: "LinkedIn Page" },
  { appID: "threads", platform: "threads", label: "Threads" },
  { appID: "tiktok", platform: "tiktok", label: "TikTok" },
  { appID: "youtube", platform: "youtube", label: "YouTube" },
  { appID: "google-business-profile", platform: "googlebusiness", label: "Google Business Profile" },
] as const satisfies readonly { appID: string; platform: SocialAccount["platform"]; label: string }[]

/** The workspace's working connections that post to a network. */
export async function listSocialConnections() {
  const connections: { id: string; platform: SocialAccount["platform"]; label: string }[] = []
  for await (const connection of superclerk.connections.list()) {
    const network = SocialNetworks.find((item) => item.appID === connection.appID)
    if (network && connection.status === "ready")
      connections.push({ id: connection.id, platform: network.platform, label: connection.label })
  }
  return connections
}

export type SocialConnection = Awaited<ReturnType<typeof listSocialConnections>>[number]

/** Every account a connection's grant reaches, through every page. */
export async function connectionAccounts(connectionID: string) {
  const accounts: ConnectionAccount[] = []
  let cursor: string | undefined
  do {
    const page = await superclerk.connections.accounts.list(connectionID, { cursor })
    accounts.push(...page.items)
    cursor = page.nextCursor ?? undefined
  } while (cursor !== undefined)
  return accounts
}

const TikTokPublishingChoices = z.object({
  privacyLevel: z.enum(["PUBLIC_TO_EVERYONE", "MUTUAL_FOLLOW_FRIENDS", "FOLLOWER_OF_CREATOR", "SELF_ONLY"]),
  allowComment: z.boolean(),
  promotesOwnBrand: z.boolean(),
  promotesThirdParty: z.boolean(),
  isAiGenerated: z.boolean(),
})

/** The choices a saved TikTok destination publishes with, as the server stored them. */
export const TikTokSavedChoices = z.discriminatedUnion("format", [
  z.object({ format: z.literal("inbox") }),
  TikTokPublishingChoices.extend({ format: z.literal("video"), allowDuet: z.boolean(), allowStitch: z.boolean() }),
  TikTokPublishingChoices.extend({ format: z.literal("photo"), autoAddMusic: z.boolean() }),
])

export type TikTokSavedChoices = z.infer<typeof TikTokSavedChoices>

export function socialTikTokPublishingProblem(options: Record<string, unknown>) {
  if (options.format === "inbox")
    return options.uploadConsent === true ? null : "Confirm that you want to send this video to your TikTok inbox."
  if (options.privacyLevel === undefined) return "Choose who can view this TikTok post before publishing."
  if (
    options.commercialContentDisclosure === true &&
    options.promotesOwnBrand !== true &&
    options.promotesThirdParty !== true
  )
    return "Indicate whether this content promotes your brand, a third party, or both."
  if (options.promotesThirdParty === true && options.privacyLevel === "SELF_ONLY")
    return "Paid partnerships cannot be private. Choose another visibility or remove the paid partnership."
  if (options.promotesThirdParty === true && options.brandedContentPolicyConfirmation !== true)
    return "Agree to TikTok’s Branded Content Policy before publishing."
  if (options.musicUsageConfirmation !== true) return "Agree to TikTok’s Music Usage Confirmation before publishing."
  return null
}

export function socialTikTokCreatorQuery(account: SocialAccount) {
  return queryOptions({
    queryKey: ["social", "tiktok-creator", account.id, account.connectionID, account.nativeId] as const,
    queryFn: async () => {
      if (account.connectionID === null) throw new Error("This TikTok creator's connection is still being set up")
      const candidate = (await connectionAccounts(account.connectionID)).find(
        (item) => item.providerAccountID === account.nativeId,
      )
      if (candidate === undefined || candidate.tiktok === null)
        throw new Error("This TikTok creator is no longer authorized")
      return candidate.tiktok
    },
    staleTime: 0,
    refetchOnMount: "always",
    retry: false,
    refetchOnWindowFocus: false,
  })
}

export type SocialDestinationDraft = {
  accountId: string
  options: Record<string, unknown>
  customContent: string | null
  mediaItems: SocialMediaItem[] | null
}
export type SocialDraft = { content: string; mediaItems: SocialMediaItem[]; destinations: SocialDestinationDraft[] }

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

export function socialDraft(post?: SocialPost): SocialDraft {
  if (post === undefined) return { content: "", mediaItems: [], destinations: [] }
  return {
    content: post.content,
    mediaItems: post.mediaItems.map(({ assetId, altText }) => ({
      assetId,
      ...(altText === undefined ? {} : { altText }),
    })),
    destinations: post.platforms.map((destination) => ({
      accountId: destination.accountId,
      options: {
        ...Object.fromEntries(
          Object.entries(destination.platformSpecificData).filter(
            ([key]) =>
              key !== "creatorInfoFingerprint" &&
              (destination.platform !== "tiktok" || (key !== "durationSeconds" && key !== "privacyLevel")),
          ),
        ),
        ...(destination.platform === "tiktok"
          ? destination.platformSpecificData.format === "inbox"
            ? { uploadConsent: false }
            : {
                allowComment: false,
                ...(destination.platformSpecificData.format === "video"
                  ? { allowDuet: false, allowStitch: false }
                  : {}),
                commercialContentDisclosure: false,
                promotesOwnBrand: false,
                promotesThirdParty: false,
                musicUsageConfirmation: false,
                brandedContentPolicyConfirmation: false,
              }
          : {}),
      },
      customContent: destination.customContent,
      mediaItems:
        destination.mediaItems === null
          ? null
          : destination.mediaItems.map(({ assetId, altText }) => ({
              assetId,
              ...(altText === undefined ? {} : { altText }),
            })),
    })),
  }
}

export function socialContent(
  draft: SocialDraft,
  accounts: readonly SocialAccount[],
  tiktokCreators?: ReadonlyMap<string, TikTokCreatorSettings>,
): SocialContentInput {
  if (draft.destinations.length === 0) throw new Error("Select at least one publishing account")
  return {
    content: draft.content,
    mediaItems: draft.mediaItems,
    platforms: draft.destinations.map((destination) => {
      const account = accounts.find((item) => item.id === destination.accountId)
      if (account === undefined || account.status !== "active") throw new Error("Select an active publishing account")
      let options = destination.options
      if (account.platform === "tiktok") {
        const creator = tiktokCreators?.get(account.id)
        if (creator === undefined) throw new Error("Load the current TikTok creator settings before saving")
        if (
          options.format !== "inbox" &&
          !creator.privacyLevelOptions.some((privacy) => privacy === options.privacyLevel)
        )
          throw new Error("Choose one of this TikTok creator’s current privacy settings")
        const problem = socialTikTokPublishingProblem(options)
        if (problem !== null) throw new Error(problem)
        if (options.format === "inbox") {
          if (!creator.uploadAuthorized) throw new Error("Enable TikTok inbox uploads for this account before sending")
        } else {
          options = {
            ...options,
            creatorInfoFingerprint: creator.creatorInfoFingerprint,
            commercialContentDisclosure: options.commercialContentDisclosure === true,
            promotesOwnBrand: options.promotesOwnBrand === true,
            promotesThirdParty: options.promotesThirdParty === true,
            brandedContentPolicyConfirmation: options.brandedContentPolicyConfirmation === true,
            allowComment: !creator.commentDisabled && options.allowComment === true,
            ...(options.format === "video"
              ? {
                  allowDuet: !creator.duetDisabled && options.allowDuet === true,
                  allowStitch: !creator.stitchDisabled && options.allowStitch === true,
                }
              : {}),
          }
        }
      }
      return {
        platform: account.platform,
        accountId: account.id,
        platformSpecificData: options,
        ...(destination.customContent === null ? {} : { customContent: destination.customContent }),
        ...(destination.mediaItems === null ? {} : { mediaItems: destination.mediaItems }),
      } as SocialContentInput["platforms"][number]
    }),
  }
}

export function socialScheduledFor(value: string, now = Date.now()) {
  const scheduledFor = z.iso.datetime({ offset: true }).parse(value)
  if (Date.parse(scheduledFor) <= now) throw new Error("Choose a future date and include Z or an explicit UTC offset")
  return scheduledFor
}

export async function socialFileHash(file: Blob, signal?: AbortSignal) {
  signal?.throwIfAborted()
  const hash = sha256.create()
  const chunkBytes = 2 * 1024 * 1024
  for (let offset = 0; offset < file.size; offset += chunkBytes) {
    const bytes = await file.slice(offset, offset + chunkBytes).arrayBuffer()
    signal?.throwIfAborted()
    hash.update(new Uint8Array(bytes))
  }
  return Array.from(hash.digest(), (byte) => byte.toString(16).padStart(2, "0")).join("")
}

export async function uploadSocialFile(input: {
  file: File
  storageAccess: SocialUploadInput["storageAccess"]
  idempotencyKey: string
  signal: AbortSignal
}): Promise<SocialAsset> {
  input.signal.throwIfAborted()
  const metadata = SocialMediaAssetUploadMetadata.parse({
    filename: input.file.name,
    contentType: input.file.type,
    sizeBytes: input.file.size,
    storageAccess: input.storageAccess,
  })
  const sha256 = await socialFileHash(input.file, input.signal)
  // Storage takes browser uploads only from Superclerk's own sites, so the bytes go through this app's Worker.
  const response = await fetch("/api/upload", {
    method: "POST",
    headers: {
      "idempotency-key": input.idempotencyKey,
      "x-upload": encodeURIComponent(JSON.stringify({ ...metadata, sha256 })),
    },
    body: input.file,
    signal: input.signal,
  })
  input.signal.throwIfAborted()
  // Cloudflare refuses a request over 100 MB before it reaches the Worker.
  if (response.status === 413)
    throw new Error(
      "Files over 100 MB can’t pass through Postclerk yet. Upload this one in Superclerk’s media library.",
    )
  if (!response.ok) throw new Error(((await response.json()) as { error: { message: string } }).error.message)
  return (await response.json()) as SocialAsset
}
