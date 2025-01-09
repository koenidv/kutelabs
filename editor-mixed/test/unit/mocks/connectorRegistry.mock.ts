import { mock } from "bun:test"
import { type ConnectorRInterface } from "@kutelabs/editor-mixed/src/registries/ConnectorRInterface"

export const mockConnectorRegistry = () =>
  ({
    register: mock(),
    deregisterForBlock: mock(),
    selectConnectorForBlock: mock(),
  }) satisfies ConnectorRInterface
