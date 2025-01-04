import type { TestResult } from "@kutelabs/client-runner"
import type { LogType } from "@kutelabs/client-runner"
import type { EditorMixed } from "@kutelabs/editor-mixed"
import { IdGenerator } from "@kutelabs/shared/src"
import { atom, map } from "nanostores"

/* Stores the state of the tests. The display data however is passed to the Tests component directly to enable SSR.*/
export const testState = map<Record<string, { state: TestResult | null; message?: string }>>({})
export function setTestResult(id: string, state: TestResult, message?: string) {
  testState.setKey(id, { state, message })
}

/* Stores logs from code execution */
export const logState = atom<{ log: any[]; type: LogType }[]>([])
export function addLog(log: any[], type: LogType) {
  logState.set([...logState.get(), { log, type }])
}

/* Stores a reference to the DOM element of the current editor  */
export const editorRef = atom<null | EditorMixed>(null)

/** Stores the snackbar display queue */
export const snackbarState = atom<
  { id: string; message: string; type: SnackbarType; duration: number }[]
>([])
export type SnackbarType = "success" | "error" | "info" | "warning"
export type SnackbarMessage = { id: string; message: string; type: SnackbarType; duration: number }
export function displayMessage(
  message: string,
  type: SnackbarType,
  props?: { duration?: number; single?: boolean; immediate?: boolean }
) {
  const messageData = { id: IdGenerator.next, message, type, duration: props?.duration ?? 5000 }
  if (props?.single) snackbarState.set([messageData])
  else if (props?.immediate) snackbarState.set([messageData, ...snackbarState.get()])
  else snackbarState.set([...snackbarState.get(), messageData])
}
export function consumedMessage(id: string) {
  snackbarState.set(snackbarState.get().filter(m => m.id != id))
}
export function clearMessages() {
  snackbarState.set([])
}
