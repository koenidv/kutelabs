import { defineCollection } from "astro:content"
import { glob } from 'astro/loaders'

const challenges = defineCollection({
  loader: glob({ pattern: '**\/*.json', base: "./src/content/challenges" }),
})

export const collections = {
  challenges: challenges,
}
