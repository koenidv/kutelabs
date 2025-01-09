import { ConnectPredicates } from "@kutelabs/editor-mixed/src/connections/ConnectPredicates"
import { describe, expect, mock, test } from "bun:test"
import { ConnectorAfter, ConnectorBefore, PredicateAlwaysAllow, PredicateAlwaysDecline } from "../mocks/basics.mock"

describe("ConnectPredicates", () => {
  describe("allows", () => {

    test("passes with one successful predicate", () => {
      const local = ConnectorAfter()
      const remote = ConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [PredicateAlwaysDecline(), PredicateAlwaysAllow()])

      expect(connectPredicates.allows(remote)).toBe(true)
    })

    test("passes without predicates", () => {
      const local = ConnectorAfter()
      const remote = ConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [])

      expect(connectPredicates.allows(remote)).toBe(true)
    })

    test("fails without successful predicate", () => {
      const local = ConnectorAfter()
      const remote = ConnectorBefore()
      const connectPredicates = new ConnectPredicates(local, [PredicateAlwaysDecline(), PredicateAlwaysDecline()])

      expect(connectPredicates.allows(remote)).toBe(false)
    })

    test("passes remote and local connector", () => {
      const local = ConnectorAfter()
      const remote = ConnectorBefore()
      const predicate = mock()
      const connectPredicates = new ConnectPredicates(local, [predicate])

      connectPredicates.allows(remote)

      expect(predicate).toHaveBeenCalledWith(remote, local)
    })


  })
})
