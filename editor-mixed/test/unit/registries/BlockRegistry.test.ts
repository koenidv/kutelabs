import { BlockRegistry } from "@kutelabs/editor-mixed/src/registries/BlockRegistry"
import { beforeEach, describe, expect, mock, test } from "bun:test"
import { mockConnectorRegistry } from "../mocks/connectorRegistry.mock"
import { mockBlock } from "../mocks/basics.mock"
import { Coordinates } from "@kutelabs/editor-mixed/src/util/Coordinates"
import { SizeProps } from "@kutelabs/editor-mixed/src/render/SizeProps"
import type { AnyBlock } from "@kutelabs/editor-mixed/src/blocks/Block"
import { BlockType } from "@kutelabs/editor-mixed/src/blocks/configuration/BlockType"
import { BlockMarking } from "@kutelabs/editor-mixed/src"

describe("BlockRegistry", () => {
  const requestUpdate = mock()
  const block = mockBlock()
  let registry: BlockRegistry

  beforeEach(() => {
    registry = new BlockRegistry(mockConnectorRegistry() as any, requestUpdate)
  })

  describe("register", () => {
    test("registers new block", () => {
      registry.register(block)
      expect(registry.getRegistered(block)).toBeDefined()
    })

    test("fails on duplicate registration", () => {
      registry.register(block)
      expect(() => registry.register(block)).toThrow()
    })

    test("registers with position and size", () => {
      const pos = new Coordinates(10, 20)
      const size = SizeProps.simple(100, 50)

      registry.register(block, pos, size)

      const registered = registry.getRegistered(block)
      expect(registered.globalPosition).toEqual(pos)
      expect(registered.size).toEqual(size)
    })
  })

  describe("deregister", () => {
    test("removes registered block", () => {
      registry.register(block)
      registry.deregister(block)
      expect(() => registry.getRegistered(block)).toThrow()
    })

    test("fails on unregistered block", () => {
      expect(() => registry.deregister(block)).toThrow()
    })
  })

  describe("getRegisteredById", () => {
    test("finds block by id", () => {
      registry.register(block)
      const found = registry.getRegisteredById(block.id)
      expect(found?.block).toBe(block)
    })

    test("returns undefined for unknown id", () => {
      expect(registry.getRegisteredById("unknown")).toBeUndefined()
    })
  })

  describe("position", () => {
    test("updates position", () => {
      registry.register(block)
      const newPos = new Coordinates(30, 40)

      registry.setPosition(block, newPos)
      expect(registry.getPosition(block)).toEqual(newPos)
    })

    test("fails getting position of unregistered block", () => {
      expect(() => registry.getPosition(block)).toThrow()
    })
  })

  describe("size", () => {
    test("updates size", () => {
      registry.register(block)
      const newSize = SizeProps.simple(200, 10)

      registry.setSize(block, newSize)
      expect(registry.getSize(block)).toEqual(newSize)
    })

    test("fails getting size of unregistered block", () => {
      expect(() => registry.getSize(block)).toThrow()
    })
  })

  describe("detached blocks", () => {
    test("sets single detached block", () => {
      registry.setDetached(block)
      expect(registry.detachedBlockIds).toContain(block.id)
    })

    test("clears detached blocks", () => {
      registry.setDetached(block)
      registry.setDetached(null)
      expect(registry.detachedBlockIds).toHaveLength(0)
    })
  })

  describe("leafs", () => {
    test("returns blocks without downstream connections", () => {
      const leafBlock = {
        ...block,
        downstreamWithConnectors: [],
      } as unknown as AnyBlock

      registry.register(leafBlock)
      expect(registry.leafs).toContain(leafBlock)
    })

    test("excludes root blocks", () => {
      const rootBlock = {
        ...block,
        type: BlockType.Root,
        downstreamWithConnectors: [],
      } as unknown as AnyBlock

      registry.register(rootBlock)
      expect(registry.leafs).not.toContain(rootBlock)
    })
  })

  describe("block marking", () => {
    test("marks block by reference", () => {
      registry.register(block)
      registry.markBlock(block, BlockMarking.Error)
      const registered = registry.getRegistered(block)
      expect(registered.marking).toBe(BlockMarking.Error)
    })

    test("marks block by id", () => {
      registry.register(block)
      registry.markBlock(block.id, BlockMarking.Error)
      const registered = registry.getRegistered(block)
      expect(registered.marking).toBe(BlockMarking.Error)
    })

    test("clears all markings", () => {
      registry.register(block)
      registry.markBlock(block, BlockMarking.Error)
      registry.clearMarked(false)
      const registered = registry.getRegistered(block)
      expect(registered.marking).toBeNull()
    })
  })
})
