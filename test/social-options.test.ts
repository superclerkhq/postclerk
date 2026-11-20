import { expect, test } from "bun:test"

import type { SocialAccount } from "../src/api/social"
import { defaultOptions, fieldProblems, setSocialPlatformOption } from "../src/lib/social-options"

const video = { contentType: "video/mp4" } as const
const photo = { contentType: "image/jpeg" } as const
const account = (platform: SocialAccount["platform"], label: string): SocialAccount => ({
  id: `${platform}-account`,
  platform,
  nativeId: `${platform}-native`,
  connectionID: `${platform}-connection`,
  label,
  status: "active",
})

test("Instagram starts a single video as a Reel and anything else as a feed post", () => {
  expect(defaultOptions("instagram", [video], "")).toEqual({ format: "reel" })
  expect(defaultOptions("instagram", [photo], "")).toEqual({ format: "post" })
  expect(defaultOptions("instagram", [video, photo], "")).toEqual({ format: "post" })
  expect(defaultOptions("instagram", [], "")).toEqual({ format: "post" })
})

test("YouTube starts from the caption's first line and leaves the guidelines for the person", () => {
  expect(defaultOptions("youtube", [video], "  Our <new> kitchen tour  \nFilmed in Leeds.")).toEqual({
    title: "Our new kitchen tour",
    categoryId: "22",
    privacyStatus: "public",
    notifySubscribers: true,
    selfDeclaredMadeForKids: false,
    containsSyntheticMedia: false,
    hasPaidProductPlacement: false,
  })
  expect(defaultOptions("youtube", [video], "🔥".repeat(120)).title).toBe("🔥".repeat(100))
})

test("the other networks start with nothing chosen for the person", () => {
  for (const platform of ["facebook", "linkedin", "threads", "tiktok", "googlebusiness"] as const)
    expect(defaultOptions(platform, [video], "A caption")).toEqual({})
})

test("an Instagram format the person didn't choose follows the media, even after they change another field", () => {
  const options = setSocialPlatformOption("instagram", {}, "thumbOffsetMs", 1500)
  expect({ ...defaultOptions("instagram", [video], ""), ...options }).toEqual({ format: "reel", thumbOffsetMs: 1500 })
  expect({ ...defaultOptions("instagram", [photo, photo], ""), ...options }.format).toBe("post")
  const chosen = setSocialPlatformOption("instagram", options, "format", "story")
  expect({ ...defaultOptions("instagram", [photo, photo], ""), ...chosen }.format).toBe("story")
})

test("a refused post names each field beside the account it belongs to", () => {
  const instagram = account("instagram", "@northwind")
  const youtube = account("youtube", "Northwind Heating")
  // One MP4 to Instagram and YouTube with the options untouched, as the API names the fields it refuses.
  const problems = fieldProblems(
    [
      {
        path: ["platforms", "0", "platformSpecificData", "format"],
        message: "Value is not one of the allowed values.",
      },
      {
        path: ["platforms", "1", "platformSpecificData", "communityGuidelinesCertified"],
        message: "Value is not one of the allowed values.",
      },
      { path: ["platforms", "1", "mediaItems", "0", "altText"], message: "Unknown field." },
    ],
    [instagram, youtube],
  )
  expect(problems).toEqual([
    { account: instagram, text: "@northwind · Format: Value is not one of the allowed values." },
    { account: youtube, text: "Northwind Heating · Community guidelines: Value is not one of the allowed values." },
    { account: youtube, text: "Northwind Heating · Alt text: Unknown field." },
  ])
})

test("a refused field outside the accounts keeps its own name, and an unlabelled one its raw name", () => {
  const problems = fieldProblems(
    [
      { path: ["content"], message: "Value does not satisfy the maximum constraint 63206." },
      { path: ["platforms", "0", "platformSpecificData", "trialGraduation"], message: "Unknown field." },
      { path: [], message: "Value does not satisfy the request schema." },
    ],
    [account("instagram", "@northwind")],
  )
  expect(problems.map((problem) => problem.text)).toEqual([
    "Caption: Value does not satisfy the maximum constraint 63206.",
    "@northwind · trialGraduation: Unknown field.",
    "Value does not satisfy the request schema.",
  ])
})
