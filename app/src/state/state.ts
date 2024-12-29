import type { TestResult } from "@kutelabs/client-runner/src"
import { map } from "nanostores"
import type { Challenge } from "../schema/challenge"

/**
 * Stores the state of the tests. The display data however is passed to the Tests component directly to enable SSR.
 */
export const testState = map<Record<string, { state: TestResult | null; message?: string }>>({})

// export function setTests(tests: Challenge["tests"]) {
//   tests.forEach(test => {
//     Object.entries(test.run).forEach(([id, { description }]) => {
//       testState.setKey(id, { description, state: null })
//     })
//   })
// }

export function setTestResult(id: string, state: TestResult, message?: string) {
  testState.setKey(id, { state, message })
}
