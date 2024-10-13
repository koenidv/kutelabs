import "dotenv/config"
import { cleanEnv, str } from "envalid"

export const env = cleanEnv(process.env, {
  PORT: str({ default: "3000" }),
  ENV: str({ choices: ["development", "undefined", "production"], default: "undefined" }),
  DATA_DIR: str({ default: __dirname + "/data" }),
})
