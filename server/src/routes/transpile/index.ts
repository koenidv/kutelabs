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

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  const kotlinCode = body.kotlinCode as string

  if (!kotlinCode) {
    c.status(400)
    c.json(ResultDTO.error(TranspilationStatus.EmptyInput))
  }

  if (await existsInCache(kotlinCode)) return c.json(await readTranspiledCache(kotlinCode))

  const dto = ResultDTO.fromTranspilationResult(await transpile(kotlinCode))
  if (shouldCache(dto.status)) writeTranspiledCache(kotlinCode, dto) // async, not blocking response

  return c.json(dto)
})

app.route
export default app
