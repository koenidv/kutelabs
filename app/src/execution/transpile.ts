import { $authStore } from "@clerk/astro/client"
import type { ResultDtoInterface } from "@kutelabs/server/src/routes/transpile/ResultDtoInterface"
import { PUBLIC_API_BASE_URL } from "astro:env/client"

export async function transpileKtJs(
  abortController: AbortController,
  code: string,
  coroutineLib = true,
  generateSourceMap = false
): Promise<ResultDtoInterface | null> {
  const token = await $authStore.get().session?.getToken()
  if (!token) throw new Error("Unauthorized: Transpilation is only allowed when authenticated")

  const res = await fetch(`${PUBLIC_API_BASE_URL}/transpile/kt/js`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${await $authStore.get().session?.getToken()}`,
    },
    body: JSON.stringify({
      kotlinCode: code,
      includeCoroutineLib: coroutineLib,
      generateSourceMap: generateSourceMap,
    }),
    signal: abortController.signal,
  })
  if (!res.ok) return null
  const json = await res.json()
  return json as ResultDtoInterface
}
