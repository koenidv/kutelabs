import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { API_BASE_URL } from "astro:env/client"

export async function transpileKtJs(code: string): Promise<ResultDtoInterface | null> {
  console.log(API_BASE_URL)
  const res = await fetch(`${API_BASE_URL}/transpile/kt/js`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ kotlinCode: code }),
  })
  if (!res.ok) return null
  const json = await res.json()
  console.log(json)
  return (json) as ResultDtoInterface
}
