import type { TestResult } from "@kutelabs/client-runner"
import type { LogType } from "@kutelabs/client-runner";
import type { EditorMixed } from "@kutelabs/editor-mixed"
import { atom, map } from "nanostores"

/*Stores the state of the tests. The display data however is passed to the Tests component directly to enable SSR.*/
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
