import { Connection } from "../connections/Connection"
import { Connector, type BlockAndConnector } from "../connections/Connector"
import { ConnectorRole } from "../connections/ConnectorRole"
import { ConnectorType } from "../connections/ConnectorType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import { BlockRegistry } from "../registries/BlockRegistry"
import type { BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRegistry } from "../registries/ConnectorRegistry"
import { Coordinates } from "../util/Coordinates"
import { BlockConnectors } from "./BlockConnectors"
import type { BlockContract } from "./BlockContract"
import { type BlockDataByType } from "./configuration/BlockData"
import type { BlockType } from "./configuration/BlockType"
import { ConnectedBlocks } from "./ConnectedBlocks"
import { IdGenerator } from "@kutelabs/shared"

export type AnyBlock = Block<BlockType>

export class Block<T extends BlockType, S = never> implements BlockContract {
  readonly id: string = IdGenerator.next
  readonly type: BlockType
  readonly draggable: boolean
  renderStale: boolean = false
  isInDrawer: boolean = false
  data: BlockDataByType<T, S>
  private readonly insertOnRoot: typeof BlockRegistry.prototype.attachToRoot

  constructor(
    type: T,
    data: BlockDataByType<T, S>,
    connectors: { connector: Connector; connected?: AnyBlock | undefined }[],
    draggable: boolean,
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRegistry
  ) {
    this.type = type
    this.draggable = draggable

    this.data = data

    this.connectors.addConnector(this, connectorRegistry, DefaultConnectors.internal())
    for (const { connector, connected } of connectors) {
      this.connectors.addConnector(this, connectorRegistry, connector)
      if (connected) {
        this.connect(
          blockRegistry,
          connected,
          new Connection(connector, connected.upstreamConnector)
        )
      }
    }

    blockRegistry.register(this)
    this.insertOnRoot = blockRegistry.attachToRoot.bind(blockRegistry)
  }

  //#region Connect/Disconnect

  public connect(
    registry: BlockRInterface,
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates
  ): void {
    registry.notifyConnected(block, this)
    this.silentConnect(block, connection, atPosition)
  }

  public silentConnect(
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction = false
  ): void {
    const localConnector = connection.localConnector(this)

    if (!localConnector) return this.handleNoLocalConnector(block, connection)

    if (!isOppositeAction && !localConnector?.isDownstram) {
      return this.handleConnectUpstream(block, connection, localConnector.type, atPosition)
    }

    this.connectedBlocks.insertForConnector(block, localConnector, this.insertOnRoot)
    if (isOppositeAction) return

    // todo invalidate position

    block.silentConnect(this, connection, undefined, true)
  }

  private handleNoLocalConnector(block: AnyBlock, connection: Connection) {
    const lastLocalConnector = connection.localConnector(this.lastAfter)
    if (lastLocalConnector && !lastLocalConnector.isDownstram) {
      this.handleConnectUpstream(block, connection, lastLocalConnector.type)
      return
    }
    throw new Error(
      `Connection does not point to this block (block#${this.id}, from:${connection.from.parentBlock?.id}, to:${connection.to.parentBlock?.id})`
    )
  }

  private handleConnectUpstream(
    block: AnyBlock,
    connection: Connection,
    localType: ConnectorType,
    atPosition?: Coordinates
  ) {
    if (localType === ConnectorType.Before) {
      if (block.connectors.before && this.upstream?.connectors.after) {
        this.upstream.silentConnect(
          block,
          new Connection(this.upstream.connectors.after, block.connectors.before),
          atPosition
        )
        return
      } else {
        block.lastAfter.silentConnect(this.disconnectSelf(null), connection)
        this.insertOnRoot(block, curr => atPosition ?? curr)
        return
      }
    } else
      throw new Error(`Connecting to upstream connector type "${localType}" is not implemented`)
  }

  //#region Connected Blocks

  connectedBlocks = new ConnectedBlocks()

  get upstream() {
    return this.connectedBlocks.byConnector(this.upstreamConnectorInUse)
  }
  get downstreamWithConnectors(): BlockAndConnector[] {
    return [...this.connectedBlocks.blocks]
      .filter(([connector, _block]) => connector.isDownstram)
      .map(([connector, block]) => ({ block, connector }))
  }

  get before() {
    return this.connectedBlocks.byConnector(this.connectors.before)
  }
  get after() {
    return this.connectedBlocks.byConnector(this.connectors.after)
  }
  get lastAfter(): Block<any> {
    if (!this.after) return this
    let lastNode: Block<any> = this.after
    while (lastNode.after) lastNode = lastNode.after
    return lastNode
  }

  get inners(): AnyBlock[] {
    return this.connectors.inners
      .map(connector => this.connectedBlocks.byConnector(connector))
      .filter(block => block !== null) as AnyBlock[]
  }

  get extensions(): AnyBlock[] {
    return this.connectors.inputExtensions
      .map(connector => this.connectedBlocks.byConnector(connector))
      .filter(block => block !== null) as AnyBlock[]
  }

  get inputs() {
    return this.connectors
      .byRole(ConnectorRole.Input)
      .map(connection => this.connectedBlocks.byConnector(connection))
  }

  get conditional(): Block<T> | null {
    return (
      this.connectors
        .byRole(ConnectorRole.Conditional)
        .firstOrNull()
        ?.let(c => this.connectedBlocks.byConnector(c)) ?? null
    )
  }

  get output(): AnyBlock | null {
    return this.connectors.outputExtension?.let(c => this.connectedBlocks.byConnector(c)) ?? null
  }

  get allConnectedRecursive(): AnyBlock[] {
    return [
      this,
      ...this.downstreamWithConnectors.flatMap(({ block }) => block.allConnectedRecursive),
    ]
  }

  //#region Connectors

  connectors = new BlockConnectors()

  get upstreamConnectorInUse(): Connector | null {
    if (this.before) return this.connectors.before
    return this.connectors.internal
  }

  get upstreamConnector(): Connector {
    return this.connectors.before ?? this.connectors.internal
  }

  disconnectSelf(registry: BlockRInterface | null): AnyBlock {
    const upstreamConnector = this.upstreamConnectorInUse
    if (!upstreamConnector) throw new Error(`Block has no upstream connector (block#${this.id})`)
    const upstream = this.connectedBlocks.popForConnector(upstreamConnector)
    if (!upstream) throw new Error(`Block has no upstream block (block#${this.id})`)

    registry?.notifyDisconnected(this, upstream)
    return upstream.silentDisconnectBlock(this) ?? this
  }

  silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    const popped = this.connectedBlocks.popBlock(block)?.block ?? null
    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    return popped
  }
}
