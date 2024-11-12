import { Hono } from "hono"
import { ResultDTO } from "./ResultDTO"
import { transpile } from "../../transpile/transpile"
import { TranspilationStatus } from "../../transpile/TranspilationStatus"
import {
  existsInCache,
  readTranspiledCache,
  shouldCache,
  writeTranspiledCache,
} from "../../cache/cacheUtils"

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  const kotlinCode = body.kotlinCode as string

  if (!kotlinCode)
    return c.also(it => {
      it.status(400)
      it.json(ResultDTO.error(TranspilationStatus.EmptyInput))
    })

  if (await existsInCache(kotlinCode))
    return c.json(await readTranspiledCache(kotlinCode))

  const dto = ResultDTO.fromTranspilationResult(await transpile(kotlinCode))
  if (shouldCache(dto.status)) writeTranspiledCache(kotlinCode, dto) // async, not blocking response

  return c.json(dto)
})

app.route
export default app
