import "dotenv/config"
import { bool, cleanEnv, num, str } from "envalid"

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
})
