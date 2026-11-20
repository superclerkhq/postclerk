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

test("YouTube starts from the caption's first line and leaves every declaration for the person", () => {
  expect(defaultOptions("youtube", [video], "  Our <new> kitchen tour  \nFilmed in Leeds.")).toEqual({
    title: "Our new kitchen tour",
    categoryId: "22",
    privacyStatus: "public",
    notifySubscribers: true,
  })
  expect(defaultOptions("youtube", [video], "🔥".repeat(120)).title).toBe("🔥".repeat(100))
})

test("every network starts from an ordinary choice, never a declaration made for the person", () => {
  expect(defaultOptions("facebook", [video], "A caption")).toEqual({ format: "post" })
  expect(defaultOptions("linkedin", [video], "A caption")).toEqual({ format: "post" })
  expect(defaultOptions("googlebusiness", [], "A caption")).toEqual({ topicType: "STANDARD", languageCode: "en" })
  for (const platform of ["threads", "tiktok"] as const)
    expect(defaultOptions(platform, [video], "A caption")).toEqual({})
})

test("an Instagram format the person didn't choose follows the media, even after they change another field", () => {
  const options = setSocialPlatformOption("instagram", {}, "thumbOffsetMs", 1500)
  expect({ ...defaultOptions("instagram", [video], ""), ...options }).toEqual({ format: "reel", thumbOffsetMs: 1500 })
  expect({ ...defaultOptions("instagram", [photo, photo], ""), ...options }.format).toBe("post")
  const chosen = setSocialPlatformOption("instagram", options, "format", "story")
  expect({ ...defaultOptions("instagram", [photo, photo], ""), ...chosen }.format).toBe("story")
})

const refused = (index: number, name: string) => ({
  path: ["platforms", String(index), "platformSpecificData", name],
  message: "Value is not one of the allowed values.",
})

test("a refused post asks for each field against the account it belongs to", () => {
  const instagram = account("instagram", "@northwind")
  const youtube = account("youtube", "Northwind Heating")
  // One MP4 to Instagram and YouTube with nothing chosen, as production sent it and the API names what it refuses.
  const problems = fieldProblems(
    [
      refused(0, "format"),
      refused(1, "title"),
      refused(1, "categoryId"),
      refused(1, "privacyStatus"),
      refused(1, "selfDeclaredMadeForKids"),
      refused(1, "containsSyntheticMedia"),
      refused(1, "hasPaidProductPlacement"),
      refused(1, "communityGuidelinesCertified"),
    ],
    [instagram, youtube],
  )
  expect(problems).toEqual([
    { account: instagram, problem: "Choose a format" },
    { account: youtube, problem: "Add a title" },
    { account: youtube, problem: "Choose a category" },
    { account: youtube, problem: "Choose who can watch" },
    { account: youtube, problem: "Answer whether it’s made for kids" },
    { account: youtube, problem: "Answer whether it has altered or synthetic content" },
    { account: youtube, problem: "Answer whether it has paid promotion" },
    { account: youtube, problem: "Confirm the video follows YouTube’s Community Guidelines" },
  ])
})

test("any other field in a destination shows the API's own message, and a field outside them none", () => {
  const instagram = account("instagram", "@northwind")
  const problems = fieldProblems(
    [
      { path: ["platforms", "0", "mediaItems", "0", "altText"], message: "Unknown field." },
      { path: ["content"], message: "Value does not satisfy the maximum constraint 63206." },
    ],
    [instagram],
  )
  expect(problems).toEqual([{ account: instagram, problem: "Unknown field." }])
})
