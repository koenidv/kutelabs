import { date, integer, pgTable, varchar, type AnyPgColumn } from "drizzle-orm/pg-core"

export const usersTable = pgTable("users", {
  clerkId: varchar().primaryKey(),
  nickname: varchar(),
})

export const completedChallengesTable = pgTable("completed_challenges", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar()
    .notNull()
    .references((): AnyPgColumn => usersTable.clerkId),
  challengeId: integer().notNull(),
  completedAt: varchar().notNull(),
})

export const activeDaysTable = pgTable("active_days", {
  id: integer().generatedAlwaysAsIdentity().primaryKey(),
  userId: varchar()
    .notNull()
    .references((): AnyPgColumn => usersTable.clerkId),
  day: date().notNull(),
})
