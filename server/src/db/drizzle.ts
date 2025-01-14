import "dotenv/config"
import { drizzle } from "drizzle-orm/node-postgres"
import { env } from "../env"

export const db = drizzle({
  connection: {
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    ssl: env.DB_SSL,
  },
})
