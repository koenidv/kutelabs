import { ConnectPredicates } from "@kutelabs/editor-mixed/src/connections/ConnectPredicates"
import { describe, expect, mock, test } from "bun:test"
import { mockConnectorAfter, mockConnectorBefore, mockPredicateAlwaysAllow, mockPredicateAlwaysDecline } from "../mocks/basics.mock"

describe("ConnectPredicates", () => {
  describe("allows", () => {

    test("passes with one successful predicate", () => {
      const local = mockConnectorAfter()
      const remote = mockConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [mockPredicateAlwaysDecline(), mockPredicateAlwaysAllow()])

      expect(connectPredicates.allows(remote)).toBe(true)
    })

    test("passes without predicates", () => {
      const local = mockConnectorAfter()
      const remote = mockConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [])

      expect(connectPredicates.allows(remote)).toBe(true)
    })

    test("fails without successful predicate", () => {
      const local = mockConnectorAfter()
      const remote = mockConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [mockPredicateAlwaysDecline(), mockPredicateAlwaysDecline()])

      expect(connectPredicates.allows(remote)).toBe(false)
    })

    test("passes remote and local connector", () => {
      const local = mockConnectorAfter()
      const remote = mockConnectorBefore()
      const predicate = mock()
      const connectPredicates = new ConnectPredicates(local, [predicate])

      connectPredicates.allows(remote)

      expect(predicate).toHaveBeenCalledWith(remote, local)
    })


  })
})
