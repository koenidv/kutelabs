import { SandboxCallbacks } from "@kutelabs/client-runner"
import { displayMessage } from "../state/state"

export const defaultEnabledNames = ["markBlock"]

export function filterCallbacks(
  enabledNames: string[],
  allFunctions: { [name: string]: (...args: any) => any }
): SandboxCallbacks {
  const enabled = [...defaultEnabledNames, ...enabledNames].reduce(
    (acc, name) => {
      if (!allFunctions[name]) throw new Error(`Function ${name} enabled but not found`)
      acc[name] = allFunctions[name]
      return acc
    },
    {} as Record<string, (...args: any) => any>
  )
  return new SandboxCallbacks(enabled)
}

export const appFeatures = {
  setUsername,
}

function setUsername(name: string) {
  if (typeof name === "string" && name.trim().length > 0 && name !== "Your name here") {
    displayMessage(`Welcome ${name.trim()}!`, "success")
    localStorage.setItem("username", name.trim())
  }
}
