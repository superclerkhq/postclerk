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
  const asked = (owner: SocialAccount, problem: string) => ({ account: owner, label: owner.label, problem })
  expect(problems).toEqual([
    asked(instagram, "Choose a format"),
    asked(youtube, "Add a title"),
    asked(youtube, "Choose a category"),
    asked(youtube, "Choose who can watch"),
    asked(youtube, "Answer whether it’s made for kids"),
    asked(youtube, "Answer whether it has altered or synthetic content"),
    asked(youtube, "Answer whether it has paid promotion"),
    asked(youtube, "Confirm the video follows YouTube’s Community Guidelines"),
  ])
})

test("every other refused field keeps the API's own words, by its account or else its path", () => {
  const youtube = account("youtube", "Northwind Heating")
  const tooLong = "title must contain at most 100 characters"
  const problems = fieldProblems(
    [
      { path: ["platforms", "0", "platformSpecificData", "title"], message: tooLong },
      { path: ["content"], message: "Value does not satisfy the maximum constraint 63206." },
      { path: ["platforms"], message: "Value does not satisfy the maximum constraint 50." },
    ],
    [youtube],
  )
  expect(problems).toEqual([
    { account: youtube, label: "Northwind Heating", problem: tooLong },
    { account: undefined, label: "content", problem: "Value does not satisfy the maximum constraint 63206." },
    { account: undefined, label: "platforms", problem: "Value does not satisfy the maximum constraint 50." },
  ])
})
