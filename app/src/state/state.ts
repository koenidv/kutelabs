import type { TestResult } from "@kutelabs/client-runner"
import type { EditorMixed } from "@kutelabs/editor-mixed"
import { atom, map } from "nanostores"

/*Stores the state of the tests. The display data however is passed to the Tests component directly to enable SSR.*/
export const testState = map<Record<string, { state: TestResult | null; message?: string }>>({})
export function setTestResult(id: string, state: TestResult, message?: string) {
  testState.setKey(id, { state, message })
}

/* Stores logs from code execution */
export const logState = atom<any[][]>([])
export function addLog(log: any[], type: "log" | "error" | "warn" = "log") {
  // todo log types in ui
  logState.set([...logState.get(), log])
}

export const editorRef = atom<null | EditorMixed>(null)