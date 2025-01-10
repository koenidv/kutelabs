// @ts-check
import netlify from "@astrojs/netlify";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import sentry from "@sentry/astro";
import compress from "astro-compress";
import icon from "astro-icon";
import { defineConfig, envField } from "astro/config";

// https://astro.build/config
export default defineConfig({
  integrations: [sentry({
    dsn: process.env["PUBLIC_SENTRY_DSN"],
    sourceMapsUploadOptions: {
      project: "kutelabs-astro",
      authToken: process.env["SECRET_SENTRY_AUTH_TOKEN"],
    },
  }), tailwind(), icon(), svelte(), compress()],
  output: "static",
  adapter: netlify(),
  env: {
    schema: {
      PUBLIC_API_BASE_URL: envField.string({ context: "client", access: "public", optional: false, default: "https://api.kutelabs.koeni.dev", url: true }),
      PUBLIC_POSTHOG_API_KEY: envField.string({ context: "client", access: "public", optional: false, startsWith: "phc_" }),
      PUBLIC_SENTRY_DSN: envField.string({ context: "client", access: "public", optional: false, url: true, includes: "sentry.io" }),
      SECRET_SENTRY_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: false, startsWith: "sntrys_" }),
    }
  },
  prefetch: {
    defaultStrategy: "viewport",
  },
  experimental: {
    clientPrerender: true,
    svg: true,
  }
})