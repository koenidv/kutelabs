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
    dsn: process.env["SENTRY_DSN"],
    sourceMapsUploadOptions: {
      project: "kutelabs-astro",
      authToken: process.env["SENTRY_AUTH_TOKEN"],
    },
  }), tailwind(), icon(), svelte(), compress()],
  output: "static",
  adapter: netlify(),
  env: {
    schema: {
      API_BASE_URL: envField.string({ context: "client", "access": "public", optional: false, default: "http://api.kutelabs.koeni.dev", url: true }),
      POSTHOG_API_KEY: envField.string({ context: "client", "access": "public", optional: true }),
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