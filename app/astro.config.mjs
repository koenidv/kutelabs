// @ts-check
import { defineConfig, envField } from "astro/config"
import netlify from "@astrojs/netlify"
import tailwind from "@astrojs/tailwind"
import compress from "astro-compress";
import icon from "astro-icon";
import svelte from "@astrojs/svelte";

// import sentry from "@sentry/astro";
// import spotlightjs from "@spotlightjs/astro"; removed for now because they break the dev server with SSG

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), icon(), svelte(), compress()],
  output: "static",
  adapter: netlify(),
  env: {
    schema: {
      API_BASE_URL: envField.string({ context: "client", "access": "public", optional: false, default: "http://api.kutelabs.koeni.dev", url: true }),
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