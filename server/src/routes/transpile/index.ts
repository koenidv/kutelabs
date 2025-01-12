import { Hono } from "hono"
import { getConnInfo } from "hono/bun"
import { posthog } from "../../analytics/PostHogClient"
import {
  existsInCache,
  readTranspiledCache,
  shouldCache,
  writeTranspiledCache,
} from "../../cache/cacheUtils"
import { env } from "../../env"
import { restoreBlockIds, standardizeBlockIds } from "../../transpile/standardizeBlockIds"
import { TranspilationStatus } from "../../transpile/TranspilationStatus"
import { transpile } from "../../transpile/transpile"
import { ResultDTO } from "./ResultDTO"

const app = new Hono()

app.post("/kt/js", async c => {
  const startTime = Date.now()
  const body = await c.req.json()
  if (!body || !body.kotlinCode) {
    c.status(400)
    c.json(ResultDTO.error(TranspilationStatus.EmptyInput))
  }
  const { code, ids: standardizedBlockIds } = standardizeBlockIds(body.kotlinCode)
  const includeCoroutineLib = body.includeCoroutineLib ?? true
  const generateSourceMap = body.generateSourceMap ?? false

  const ipHash = Bun.hash(getConnInfo(c).remote.address ?? "").toString() ?? "anynomous"
  // todo use same session id / user id in frontend and here https://posthog.com/questions/getting-current-session-id-or-recording-link
  const inputID = [code, generateSourceMap ? "sourcemap" : ""]

  if (env.CACHE_ENABLED && (await existsInCache(inputID))) {
    posthog.capture({
      distinctId: ipHash,
      event: "transpile_request",
      properties: {
        result: "cached",
        code: code,
        time: Date.now() - startTime,
        server: env.POSTHOG_IDENTIFIER,
      },
    })

    return c.json(
      (await readTranspiledCache(inputID)).postProcess(code =>
        restoreBlockIds(code, standardizedBlockIds)
      )
    )
  }

  const dto = ResultDTO.fromTranspilationResult(
    await transpile(code, includeCoroutineLib, generateSourceMap)
  )
  if (shouldCache(dto.status))
    await writeTranspiledCache(inputID, dto)

  posthog.capture({
    distinctId: ipHash,
    event: "transpile_request",
    properties: {
      result: dto.status,
      code: code,
      message: dto.message,
      time: Date.now() - startTime,
      server: env.POSTHOG_IDENTIFIER,
    },
  })

  dto.postProcess(code => restoreBlockIds(code, standardizedBlockIds))
  return c.json(dto)
})

export default app
