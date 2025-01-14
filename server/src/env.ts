import "dotenv/config"
import { bool, cleanEnv, num, str } from "envalid"
import { decodeBase64 } from "hono/utils/encode"

export const env = cleanEnv(process.env, {
  PORT: str({ default: "3000" }),
  ENV: str({ choices: ["development", "undefined", "production"], default: "undefined" }),
  APP_ORIGIN: str({ default: "https://kutelabs.koeni.dev", devDefault: "http://localhost:4321" }),
  DATA_DIR: str({ default: __dirname + "/data" }),
  DATA_VOLUME_NAME: str({ default: undefined }),
  CACHE_ENABLED: bool({ default: true }),
  TRANSPILER_NAME: str({ default: "kutelabs-transpiler" }),
  TRANSPILER_MEMORY: str({ default: "768m" }),
  TRANSPILER_MEMORY_SWAP: str({ default: undefined }),
  TRANSPILER_CPU: num({ default: undefined }),
  TRANSPILER_TIMEOUT: num({ default: 60000 }),
  TRANSPILER_GVISOR: bool({ default: true }),
  POSTHOG_API_KEY: str({ default: undefined }),
  POSTHOG_HOST: str({ default: "https://eu.i.posthog.com" }),
  POSTHOG_IDENTIFIER: str({ default: "local" }),
  SENTRY_DSN: str({ default: undefined }),
  DB_HOST: str({ default: "localhost" }),
  DB_PORT: num({ default: 5432 }),
  DB_USER: str({ default: "kutelabs" }),
  DB_PASSWORD: str({ default: "kutelabs" }),
  DB_NAME: str({ default: "kutelabs" }),
  DB_SSL: bool({ default: false }),
  CLERK_SECRET_KEY: str({ default: undefined }),
  CLERK_PUBLISHABLE_KEY: str({ default: undefined }),
})
