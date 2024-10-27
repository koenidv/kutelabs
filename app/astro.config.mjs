// @ts-check
import { defineConfig } from "astro/config"
import tailwind from "@astrojs/tailwind"
import lit from "@astrojs/lit"

// https://astro.build/config
export default defineConfig({
  integrations: [tailwind(), lit()],
  output: "static"
})