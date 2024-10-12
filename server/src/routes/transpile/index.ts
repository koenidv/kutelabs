import { Hono } from "hono"
import { ResultDTO, TranspilatonError } from "./ResultDTO"

const app = new Hono()

app.post("/kt/js", async c => {
  const body = await c.req.json()
  const kotlinCode = body.kotlinCode as string

  // todo implement transpilation

  return c.json(ResultDTO.error(TranspilatonError.unknown))
})

app.route
export default app
