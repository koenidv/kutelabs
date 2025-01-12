import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { PUBLIC_API_BASE_URL } from "astro:env/client"

export async function transpileKtJs(
  code: string,
  coroutineLib = true,
  generateSourceMap = false
): Promise<ResultDtoInterface | null> {
  const res = await fetch(`${PUBLIC_API_BASE_URL}/transpile/kt/js`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      kotlinCode: code,
      includeCoroutineLib: coroutineLib,
      generateSourceMap: generateSourceMap,
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  return json as ResultDtoInterface
}
