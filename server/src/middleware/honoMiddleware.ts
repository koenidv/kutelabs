import type { Hono } from "hono"
import { bodyLimit } from "hono/body-limit"
import { cors } from "hono/cors"
import { csrf } from "hono/csrf"
import { logger } from "hono/logger"
import { secureHeaders } from "hono/secure-headers"

export function useCORS(app: Hono, origin: string) {
  app.use(
    "*",
    cors({
      origin: origin,
      allowHeaders: [],
      allowMethods: ["POST", "GET", "OPTIONS"],
      maxAge: 600,
      credentials: true,
    })
  )
}

export function useBodyLimit(app: Hono) {
  app.post(
    "*",
    bodyLimit({
      maxSize: 5 * 1024 * 1024,
      onError: c => {
        return c.text("overflow :(", 413)
      },
    })
  )
}

export function useCSRF(app: Hono, origin: string) {
  app.use(csrf({ origin }))
}

export function useLogger(app: Hono) {
  app.use(logger())
}

export function useSecureHeaders(app: Hono) {
  app.use(
    "*",
    secureHeaders({
      xFrameOptions: false,
      xDnsPrefetchControl: false,
      xXssProtection: false,
    })
  )
}
