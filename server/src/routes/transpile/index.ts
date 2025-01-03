import { Hono } from "hono"
import {
  existsInCache,
  readTranspiledCache,
  shouldCache,
  writeTranspiledCache,
} from "../../cache/cacheUtils"
import { TranspilationStatus } from "../../transpile/TranspilationStatus"
import { transpile } from "../../transpile/transpile"
import { ResultDTO } from "./ResultDTO"
import { restoreBlockIds, standardizeBlockIds } from "../../transpile/standardizeBlockIds"
import { env } from "../../env"

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  if (!body || !body.kotlinCode) {
    c.status(400)
    c.json(ResultDTO.error(TranspilationStatus.EmptyInput))
  }
  const { code, ids: standardizedBlockIds } = standardizeBlockIds(body.kotlinCode)
  if (env.CACHE_ENABLED && await existsInCache(code)) return c.json(await readTranspiledCache(code))

  const dto = ResultDTO.fromTranspilationResult(await transpile(code), transpiled =>
    restoreBlockIds(transpiled, standardizedBlockIds)
  )
  if (shouldCache(dto.status)) writeTranspiledCache(code, dto) // async, not blocking response

  return c.json(dto)
})

app.route
export default app
