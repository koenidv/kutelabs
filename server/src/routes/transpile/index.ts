import { Hono } from "hono"
import { ResultDTO, TranspilatonError } from "./ResultDTO"
import { transpile } from "../../transpile/transpile"

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  const kotlinCode = body.kotlinCode as string

  if (!kotlinCode) return c.json(ResultDTO.error(TranspilatonError.noCode))

  const transpiled = await transpile(kotlinCode)
  return c.json(ResultDTO.fromTranspilationResult(transpiled))
})

app.route
export default app
