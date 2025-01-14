import type { Challenge } from "../schema/challenge"
import type { Section } from "../schema/section"

export type ContentItem = {
  id: string
  collection: string
  data: Challenge | Section
}

export type NavigationItem = ContentItem & { type: "section" | "challenge" }
export type NavigationMap = Map<
  string,
  { previous: NavigationItem | null; next: NavigationItem | null }
>

/**
 * Sort sections and challenges by section and story order
 */
export function sortChallenges(
  items: ContentItem[]
): (ContentItem & { type: "section" | "challenge" })[] {
  const sectionOrder = items
    .filter(item => item.id.endsWith("/section"))
    .sort((a, b) => ((a.data as Section).order ?? 0) - ((b.data as Section).order ?? 0))
    .map(item => item.id.split("/")[0])

  return items
    .sort((a, b) => {
      const sectionComparison =
        sectionOrder.indexOf(a.id.split("/")[0]) - sectionOrder.indexOf(b.id.split("/")[0])
      if (sectionComparison !== 0) return sectionComparison

      if (a.id.endsWith("/section")) return -1
      if (b.id.endsWith("/section")) return 1

      return ((a.data as Challenge).story.order ?? 0) - ((b.data as Challenge).story.order ?? 0)
    })
    .filter(item => !item.data.hideSectionHead)
    .map(item => ({ ...item, type: item.id.endsWith("/section") ? "section" : "challenge" }))
}

/**
 * Map previous and next navigation items for each challenge
 */
export function generateNavigationMap(sortedItems: NavigationItem[]): NavigationMap {
  const navigationMap = new Map()

  const challenges = sortedItems.filter(item => item.type === "challenge")

  challenges.forEach((item, index) => {
    navigationMap.set(item.id, {
      previous: index > 0 ? challenges[index - 1] : null,
      next: index < challenges.length - 1 ? challenges[index + 1] : null,
    })
  })

  return navigationMap
}
