import { Hono } from "hono"
import { ResultDTO, TranspilatonError } from "./ResultDTO"
import { transpile } from "../../transpile/transpile"
import { existsInCache, readTranspiledCache, writeTranspiledCache } from "../../cache/cacheUtils"

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  const kotlinCode = body.kotlinCode as string

  if (!kotlinCode) return c.json(ResultDTO.error(TranspilatonError.noCode))

  if (await existsInCache(kotlinCode))
    return c.json(ResultDTO.cached(await readTranspiledCache(kotlinCode)))

  const transpiled = await transpile(kotlinCode)
  writeTranspiledCache(kotlinCode, transpiled.transpiled!)

  return c.json(ResultDTO.fromTranspilationResult(transpiled))
})

app.route
export default app
