import { PostHog } from "posthog-node"
import { env } from "../env"

class PostHogClient {
  private static instance: PostHog | null = null

  private constructor() {}

  public static getInstance(): PostHog {
    if (!PostHogClient.instance) {
      PostHogClient.instance = new PostHog(env.POSTHOG_API_KEY ?? "", {
        host: env.POSTHOG_HOST,
        disableGeoip: true,
        disabled: !env.POSTHOG_API_KEY,
      })
    }
    return PostHogClient.instance
  }
}

export const posthog = PostHogClient.getInstance()
