import { Glob } from "bun"
import { Hono } from "hono"
import { env } from "./env"

import "@kutelabs/shared"
import "./analytics/Sentry"
import { applyMiddleware } from "./middleware/applyMiddleware"

export const app = new Hono()

applyMiddleware(app)

const routes = new Glob(__dirname + "/routes/**/index.ts")
await registerRoutes(routes)

async function registerRoutes(routes: Glob) {
  for await (const path of routes.scan(".")) {
    const routeName = parseRouteName(path)
    if (routeName === null) continue

    const module = await importModule(path)
    if (module === null) continue

    app.route(routeName, module)
    console.info(`Registered route /${routeName}`)
  }
}

function parseRouteName(path: string): string | null {
  const routeNameMatches = /src[\/\\]routes[\/\\](.*)[\/\\]index\.ts/.exec(path)
  const routeName = routeNameMatches !== null ? routeNameMatches[1] : null
  if (routeName === null) console.error(`Could not parse route name for file ${path}`)
  return routeName
}

async function importModule(path: String): Promise<Hono | null> {
  return new Promise(async (resolve, _) => {
    try {
      const exports = await import(`${path}`)
      const module = exports.default
      if (!(module instanceof Hono)) {
        console.error(`Failed to import module from ${path}; not a Hono instance`)
        resolve(null)
      }
      resolve(module)
    } catch (e) {
      console.error(`Failed to import module from ${path} - ${e}`)
      resolve(null)
    }
  })
}

app.get("/", c => {
  return c.text("kutelabs backend")
})

console.info(`Starting server on port ${env.PORT}`)
export default {
  port: env.PORT,
  fetch: app.fetch,
}
