import { TranspilationStatus } from "../routes/transpile/Status"
import { PlaygroundPostprocessor } from "./PlaygroundPostprocessor"
import type { ErrorResult, KotlinPlayResultDto, SuccessResultPlayground } from "./transpile.types"

export async function transpileOnPlayground(
  code: string,
  entrypoint: string
): Promise<ErrorResult | SuccessResultPlayground> {
  const res = await fetch(`https://api.kotlinlang.org/api/2.2.0/compiler/translate?ir=true`, {
    method: "post",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      files: [
        {
          name: "File.kt",
          publicId: "",
          text: code,
        },
      ],
    }),
  })
  if (!res.ok)
    return { status: TranspilationStatus.UnknownError, message: "Kotlin Playground failed" }
  return mapTranspilationResult(await res.json(), entrypoint)
}

function mapTranspilationResult(
  result: KotlinPlayResultDto,
  entrypoint: string
): ErrorResult | SuccessResultPlayground {
  const errors = (result.errors["File.kt"] || []).filter(
    e =>
      !e.message.includes("@kotlin.js.ExperimentalJsExport") &&
      !e.message.includes("'_reject: (Throwable) -> Unit' is never used")
  )

  if (result.jsCode === null) {
    const singleErrorMessage = errors.length === 1 ? errors[0].message : undefined
    return {
      status: TranspilationStatus.CompilationError,
      message: result.exception || singleErrorMessage || "Compilation failed",
      transpilerHints: errors
    }
  }

  return {
    status: TranspilationStatus.Success,
    transpiled: new PlaygroundPostprocessor().process(result.jsCode),
    entrypoint: `playground.${entrypoint}`,
    transpilerHints: errors,
  }
}
