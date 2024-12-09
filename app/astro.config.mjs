// @ts-check
import { defineConfig } from "astro/config"
import netlify from "@astrojs/netlify";
import tailwind from "@astrojs/tailwind"
import lit from "@astrojs/lit"

import sentry from "@sentry/astro";
import spotlightjs from "@spotlightjs/astro";

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), lit(), sentry(), spotlightjs()],
  output: "server",
  adapter: netlify()
})