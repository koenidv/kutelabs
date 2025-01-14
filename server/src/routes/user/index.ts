import { getAuth } from "@hono/clerk-auth"
import { Hono } from "hono"
import { db } from "../../db/drizzle"
import { completedChallenges, users } from "../../db/schema"
import { eq, and } from "drizzle-orm"

const app = new Hono()

/**
 * called to mark a challenge as completed for progress tracking
 * this does NOT verify if the challenge was actually completed, users are free to cheat their own motivation
 * this also does not check if a challenge actually exists
 */
app.post("/challenge/completed", async c => {
  const body = await c.req.raw.clone().json()
  const auth = getAuth(c)

  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }
  if (!body || !body.challengeId) {
    c.status(400)
    return c.json({ error: "No challenge id provided" })
  }

  await db
    .insert(completedChallenges)
    .values({
      userId: auth.userId,
      challengeId: body.challengeId,
    })
    .onConflictDoNothing()

  const newCompleted = await db
    .select({ challengeId: completedChallenges.challengeId })
    .from(completedChallenges)
    .where(eq(completedChallenges.userId, auth.userId))

  return c.json({ completedIds: newCompleted.map(c => c.challengeId) })
})

/**
 * Marks a list of challenges as completed for a user
 * Returns the full list of completed challenges
 */
app.post("/challenge/completed/bulk", async c => {
  const body = await c.req.raw.clone().json()
  const auth = getAuth(c)

  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }
  if (!body || typeof body.challengeIds === undefined) {
    c.status(400)
    return c.json({ error: "No challenge ids provided" })
  }

  await db
    .insert(completedChallenges)
    .values(body.challengeIds.map((challengeId: string) => ({ userId: auth.userId, challengeId })))
    .onConflictDoNothing()

  const newCompleted = await db
    .select({ challengeId: completedChallenges.challengeId })
    .from(completedChallenges)
    .where(eq(completedChallenges.userId, auth.userId))

  return c.json({ completedIds: newCompleted.map(c => c.challengeId) })
})

/**
 * Gets a list of all completed challenges for a user
 */
app.get("/challenge/completed", async c => {
  const auth = getAuth(c)

  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }

  const completed = await db
    .select({ challengeId: completedChallenges.challengeId })
    .from(completedChallenges)
    .where(eq(completedChallenges.userId, auth.userId))

  return c.json({ completedIds: completed.map(c => c.challengeId) })
})

/**
 * Gets if a given challenge is completed for a user
 */
app.get("/challenge/completed/:challengeId{.+}", async c => {
  const auth = getAuth(c)

  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }

  const challengeId = c.req.param("challengeId")
  if (!challengeId) {
    c.status(400)
    return c.json({ error: "No challenge id provided" })
  }

  const completed = await db
    .select({ challengeId: completedChallenges.challengeId })
    .from(completedChallenges)
    .where(
      and(
        eq(completedChallenges.userId, auth.userId),
        eq(completedChallenges.challengeId, challengeId)
      )
    )

  return c.json({ completed: completed.length > 0 })
})

/**
 * Set nickname for user
 * Nicknames are independent of the Clerk/SSO name
 */
app.post("/name", async c => {
  const body = await c.req.raw.clone().json()
  const auth = getAuth(c)
  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }
  if (!body || !body.name) {
    c.status(400)
    return c.json({ error: "No challenge id provided" })
  }

  await db.update(users).set({ nickname: body.name }).where(eq(users.clerkId, auth.userId))
})

/**
 * Gets a users nickname
 */
app.get("/name", async c => {
  const auth = getAuth(c)
  if (!auth?.userId) {
    c.status(401)
    return c.json({ error: "Unauthorized" })
  }

  const user = await db
    .select({ nickname: users.nickname })
    .from(users)
    .where(eq(users.clerkId, auth.userId))

  return c.json({ nickname: user[0]?.nickname })
})

export default app
