import { date, integer, pgTable, uniqueIndex, varchar, type AnyPgColumn } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  clerkId: varchar().primaryKey(),
  nickname: varchar(),
})

export const completedChallenges = pgTable("completed_challenges", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar()
    .notNull()
    .references((): AnyPgColumn => users.clerkId),
  challengeId: varchar().notNull(),
  completedAt: date().notNull().defaultNow()
}, (table) => ({
  userChallengeUnique: uniqueIndex('user_challenge_unique').on(table.userId, table.challengeId)
}))

export const activeDays = pgTable("active_days", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar()
    .notNull()
    .references((): AnyPgColumn => users.clerkId),
  day: date().notNull(),
}, (table) => ({
  userDayUnique: uniqueIndex('user_day_unique').on(table.userId, table.day)
}))
