import { defineCollection } from "astro:content"

const challenges = defineCollection({
  type: "data",
})

export const collections = {
  challenges: challenges,
}
