// @ts-check
import { defineConfig } from "astro/config"
import netlify from "@astrojs/netlify";
import tailwind from "@astrojs/tailwind"
import lit from "@astrojs/lit"

// import sentry from "@sentry/astro";
// import spotlightjs from "@spotlightjs/astro"; removed for now because they break the dev server with SSG

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), lit()],
  output: "static",
  adapter: netlify(),
  prefetch: {
    defaultStrategy: "viewport",
  },
  experimental: {
    clientPrerender: true,
    svg: true,
  }
})