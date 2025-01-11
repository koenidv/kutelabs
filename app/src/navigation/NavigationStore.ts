import { getCollection } from "astro:content"
import {
  generateNavigationMap,
  sortChallenges,
  type NavigationItem,
  type NavigationMap,
} from "./navigationUtils"

/**
 * Singleton store for the navigation map to improve build performance
 */
class NavigationStore {
  private static instance: NavigationStore
  private challenges: NavigationItem[] | null = null
  private navigationMap: NavigationMap | null = null

  private constructor() {}

  static getInstance() {
    if (!NavigationStore.instance) {
      NavigationStore.instance = new NavigationStore()
    }
    return NavigationStore.instance
  }

  async getChallenes(): Promise<NavigationItem[]> {
    if (this.challenges) return this.challenges
    this.challenges = sortChallenges(await getCollection("challenges"))
    return this.challenges
  }

  async getNavigationMap(): Promise<NavigationMap> {
    if (this.navigationMap) return this.navigationMap
    this.navigationMap = generateNavigationMap(await this.getChallenes())
    return this.navigationMap
  }

  async getNext(id: string): Promise<NavigationItem | null> {
    const navigationMap = await this.getNavigationMap()
    return navigationMap.get(id)?.next ?? null
  }
}

export const navigationStore = NavigationStore.getInstance()
