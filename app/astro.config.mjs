// @ts-check
import netlify from "@astrojs/netlify";
import svelte from "@astrojs/svelte";
import tailwind from "@astrojs/tailwind";
import clerk from '@clerk/astro';
import { neobrutalism } from '@clerk/themes';
import sentry from "@sentry/astro";
import compress from "astro-compress";
import icon from "astro-icon";
import { defineConfig, envField } from "astro/config";
import markdownIntegration from '@astropub/md'

// https://astro.build/config
export default defineConfig({
  integrations: [sentry({
    dsn: process.env["PUBLIC_SENTRY_DSN"],
    sourceMapsUploadOptions: {
      project: "kutelabs-astro",
      authToken: process.env["SECRET_SENTRY_AUTH_TOKEN"],
    },
  }), clerk({
    afterSignOutUrl: "/learn", signInFallbackRedirectUrl: "/learn", signUpFallbackRedirectUrl: "/learn", appearance: {
      baseTheme: [neobrutalism],
      variables: { borderRadius: "0", colorPrimary: "#6828EF" },
    }
  }), tailwind(), icon(), svelte(), markdownIntegration(), compress()],
  output: "static",
  adapter: netlify({
    imageCDN: true,
  }),
  compressHTML: true,
  publicDir: "public",
  srcDir: "src",
  site: "https://kutelabs.koeni.dev",
  env: {
    schema: {
      PUBLIC_API_BASE_URL: envField.string({ context: "client", access: "public", optional: false, default: "https://api.kutelabs.koeni.dev", url: true }),
      PUBLIC_POSTHOG_API_KEY: envField.string({ context: "client", access: "public", optional: false, startsWith: "phc_" }),
      PUBLIC_SENTRY_DSN: envField.string({ context: "client", access: "public", optional: false, url: true, includes: "sentry.io" }),
      SECRET_SENTRY_AUTH_TOKEN: envField.string({ context: "server", access: "secret", optional: false, startsWith: "sntrys_" }),
      PUBLIC_CLERK_PUBLISHABLE_KEY: envField.string({ context: "client", access: "public", optional: false, startsWith: "pk_" }),
      CLERK_SECRET_KEY: envField.string({ context: "server", access: "secret", optional: false, startsWith: "sk_" }),
    }
  },
  markdown: {
    syntaxHighlight: "prism"
  },
  prefetch: {
    defaultStrategy: "viewport",
  },
  experimental: {
    clientPrerender: true,
    svg: true,
  }
})