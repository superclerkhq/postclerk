import type {
  ConnectionsAccountsListResponse,
  SocialAccountsListResponse,
  SocialMediaCreateParams,
  SocialMediaGetResponse,
  SocialPostsCreateParams,
  SocialPostsGetResponse,
  SocialPostsListParams,
  SocialPostsUpdateParams,
} from "@superclerk/sdk"

export type SocialAccount = SocialAccountsListResponse["accounts"][number]
export type ConnectionAccount = ConnectionsAccountsListResponse["items"][number]
export type TikTokCreatorSettings = NonNullable<ConnectionAccount["tiktok"]>
export type SocialPost = SocialPostsGetResponse
export type SocialPostsQuery = SocialPostsListParams
export type SocialCreatePostInput = SocialPostsCreateParams
export type SocialEditPostInput = SocialPostsUpdateParams
export type SocialContentInput = Omit<SocialEditPostInput, "expectedRevision">
export type SocialMediaItem = SocialContentInput["mediaItems"][number]
export type SocialAsset = SocialMediaGetResponse
export type SocialUploadInput = SocialMediaCreateParams
