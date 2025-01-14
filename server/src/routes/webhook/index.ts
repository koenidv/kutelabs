import { Hono } from "hono"
import { db } from "../../db/drizzle"
import { users } from "../../db/schema"
import { eq } from "drizzle-orm"

const app = new Hono()

app.post("/clerk", async c => {
  // todo verify signature - https://docs.svix.com/receiving/verifying-payloads/how

  const data = await c.req.raw.clone().json()
  if (!data || data.object !== "event") {
    c.status(400)
    return c.json({ error: "Invalid webhook event" })
  }

  switch (data.type) {
    case "user.created":
      await createUser(data.data.id)
      break
    case "user.deleted":
      await deleteUser(data.data.id)
      break
  }

  return c.text("ok")
})

async function createUser(clerkId: string | undefined) {
  if (!clerkId) throw new Error("Cannot create user, invalid clerk id")
  await db.insert(users).values({ clerkId }).onConflictDoNothing()
}

async function deleteUser(clerkId: string | undefined) {
  if (!clerkId) throw new Error("Cannot delete user, invalid clerk id")
  await db.delete(users).where(eq(users.clerkId, clerkId))
}

export default app
