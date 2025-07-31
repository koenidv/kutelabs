import { SandboxCallbacks, type NestedFunctions } from "@kutelabs/client-runner"
import { addLog, displayMessage } from "../state/state"

export const defaultEnabledNames = ["console"]

export function filterCallbacks(
  enabledNames: string[],
  allFunctions: NestedFunctions
): SandboxCallbacks {
  const enabled = [...defaultEnabledNames, ...enabledNames].reduce((acc, name) => {
    if (!allFunctions[name]) throw new Error(`Function ${name} enabled but not found`)
    acc[name] = allFunctions[name]
    return acc
  }, {} as NestedFunctions)
  return new SandboxCallbacks(enabled)
}

const consoleCallbacks = {
  console: {
    log: (...message: any[]) => addLog(message, "log"),
    error: (...message: any[]) => addLog(message, "error"),
    warn: (...message: any[]) => addLog(message, "warn"),
  },
} as NestedFunctions

const setUsername = (name: string) => {
  if (typeof name === "string" && name.trim().length > 0 && name !== "Your name here") {
    displayMessage(`Welcome ${name.trim()}!`, "success")
    localStorage.setItem("username", name.trim())
  }
}
const setUsernameKotlinSignature = `(name: String): Unit`

const confetti = () => {
  console.log("Confetti effect triggered!")
}

export const appFeatures = {
  ...consoleCallbacks,
  setUsername,
  confetti,
} as const satisfies NestedFunctions

export type AppFeatureKeysWithSignatures = {
  [K in keyof NestedFunctions]: string
}

export const appFeatureKotlinSignatures = {
  setUsername: setUsernameKotlinSignature,
  __lineExecutingCallback: "(line: Int): Unit",
  // e.g. confetti using default signature: (): Unit
} as const

export function getKotlinSignatures(featureKeys: string[]): AppFeatureKeysWithSignatures {
  const signatures: Record<keyof NestedFunctions, string> = {}
  featureKeys.forEach(key => {
    signatures[key as keyof NestedFunctions] =
      appFeatureKotlinSignatures[key as keyof typeof appFeatureKotlinSignatures] || "(): Unit"
  })
  return signatures
}
