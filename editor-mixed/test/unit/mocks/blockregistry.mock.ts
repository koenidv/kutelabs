import type { AnyBlock } from "@kutelabs/editor-mixed/src/blocks/Block"
import type { BlockRInterface } from "@kutelabs/editor-mixed/src/registries/BlockRInterface"
import type { SizeProps } from "@kutelabs/editor-mixed/src/render/SizeProps"
import type { Coordinates } from "@kutelabs/editor-mixed/src/util/Coordinates"
import { mock } from "bun:test"

export const mockEmitter = () => ({
  on: mock(),
  off: mock(),
  emit: mock(),
})

export const mockBlockRegistry = () =>
  ({
    ...mockEmitter(),

    register: mock(),
    deregister: mock(),

    getRegistered: mock().mockImplementation((block: AnyBlock) => ({
      id: "mock-registered-block",
      block,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    })),

    getRegisteredById: mock().mockImplementation((id: string) => ({
      id,
      block: {} as AnyBlock,
      position: { x: 0, y: 0 },
      size: { width: 100, height: 100 },
    })),

    notifyDisconnecting: mock(),
    notifyConnecting: mock(),

    attachToRoot: mock(),
    attachToDrawer: mock(),

    get drawer() {
      return null
    },

    setSize: mock().mockImplementation((block: AnyBlock, size: SizeProps) => ({
      id: "mock-block",
      block,
      position: { x: 0, y: 0 },
      size,
    })),

    getSize: mock().mockReturnValue({ width: 100, height: 100 }),

    setPosition: mock().mockImplementation((block: AnyBlock, position: Coordinates) => ({
      id: "mock-block",
      block,
      position,
      size: { width: 100, height: 100 },
    })),

    getPosition: mock().mockReturnValue({ x: 0, y: 0 }),

    get detachedBlockIds() {
      return ["mock-detached"]
    },

    setDetached: mock(),

    get leafs() {
      return []
    },

    downstreamBlocksMeasuredAndValid: mock().mockReturnValue(true),

    clear: mock(),
  }) as any satisfies BlockRInterface
