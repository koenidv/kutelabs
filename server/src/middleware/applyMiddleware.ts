import type { Hono } from "hono"
import { useBodyLimit, useCORS, useCSRF, useLogger, useSecureHeaders } from "./honoMiddleware"
import { env } from "../env"
import { clerkMiddleware } from "@hono/clerk-auth"

export function applyMiddleware(app: Hono) {
  useBodyLimit(app)
  useLogger(app)
  useCORS(app, env.APP_ORIGIN)
  useCSRF(app, env.APP_ORIGIN)
  useSecureHeaders(app)
  app.use('*', clerkMiddleware())
}