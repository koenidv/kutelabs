import type { TestResult } from "@kutelabs/client-runner/src"
import { atom, map } from "nanostores"
import type { Challenge } from "../schema/challenge"

/*Stores the state of the tests. The display data however is passed to the Tests component directly to enable SSR.*/
export const testState = map<Record<string, { state: TestResult | null; message?: string }>>({})
export function setTestResult(id: string, state: TestResult, message?: string) {
  testState.setKey(id, { state, message })
}

/* Stores logs from code execution */
export const logState = atom<any[][]>([])
export function addLog(log: any[]) {
  console.log("adding log")
  logState.set([...logState.get(), log])
}
