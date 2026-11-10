import z from "zod"

// R2's single-request upload limit is 5 MiB below 5 GiB; this flow does not use multipart uploads.
export const MaxSocialMediaAssetBytes = 5 * 1024 * 1024 * 1024 - 5 * 1024 * 1024
export const MaxSocialMediaImageBytes = 20 * 1024 * 1024

const SocialMediaAssetUploadBase = z
  .object({
    filename: z
      .string()
      .trim()
      .min(1)
      .max(255)
      .refine((value) => !/[\r\n]/.test(value), "filename contains invalid characters"),
    storageAccess: z.enum(["private", "public"]),
    sha256: z.string().regex(/^[0-9a-f]{64}$/),
  })
  .strict()

export const SocialMediaImageUploadInput = SocialMediaAssetUploadBase.extend({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  sizeBytes: z.number().int().positive().max(MaxSocialMediaImageBytes),
}).strict()

export const SocialMediaVideoUploadInput = SocialMediaAssetUploadBase.extend({
  contentType: z.literal("video/mp4"),
  sizeBytes: z.number().int().positive().max(MaxSocialMediaAssetBytes),
}).strict()

export const SocialMediaAssetUploadInput = z.union([SocialMediaImageUploadInput, SocialMediaVideoUploadInput])
export type SocialMediaAssetUploadInput = z.infer<typeof SocialMediaAssetUploadInput>

export const SocialMediaAssetUploadMetadata = z.union([
  SocialMediaImageUploadInput.omit({ sha256: true }),
  SocialMediaVideoUploadInput.omit({ sha256: true }),
])
