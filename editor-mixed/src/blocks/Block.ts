import { IdGenerator } from "@kutelabs/shared"
import { Connection } from "../connections/Connection"
import { Connector, type BlockAndConnector } from "../connections/Connector"
import { ConnectorRole } from "../connections/ConnectorRole"
import { ConnectorType } from "../connections/ConnectorType"
import { DefaultConnectors } from "../connections/DefaultConnectors"
import { BlockRegistry } from "../registries/BlockRegistry"
import type { BlockRegisterOptions, BlockRInterface } from "../registries/BlockRInterface"
import type { ConnectorRInterface } from "../registries/ConnectorRInterface"
import type { SizeProps } from "../render/SizeProps"
import { Coordinates } from "../util/Coordinates"
import { Emitter } from "../util/Emitter"
import { clone1d, deepClone } from "../util/ObjectUtils"
import { BlockConnectors } from "./BlockConnectors"
import type { BlockContract, BlockEvents } from "./BlockContract"
import { type BlockDataByType } from "./configuration/BlockData"
import { BlockType } from "./configuration/BlockType"
import { ConnectedBlocks } from "./ConnectedBlocks"
import type { DataType } from "../schema/blocks"

export type AnyBlock = Block<BlockType, any>

export class Block<T extends BlockType, S extends DataType | never = never>
  extends Emitter<BlockEvents<T, S>>
  implements BlockContract
{
  readonly id: string = IdGenerator.next
  readonly type: BlockType
  readonly draggable: boolean
  renderStale: boolean = false
  isInDrawer: boolean = false
  private _data: BlockDataByType<T, S>
  private readonly insertOnRoot: typeof BlockRegistry.prototype.attachToRoot

  constructor(
    type: T,
    data: BlockDataByType<T, S>,
    connectors: { connector: Connector; connected?: AnyBlock | undefined }[],
    draggable: boolean,
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRInterface,
    position?: Coordinates,
    size?: SizeProps,
    registerOptions?: BlockRegisterOptions
  ) {
    super()
    this.type = type
    this.draggable = draggable

    this._data = data

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

    blockRegistry.register(this, position, size, registerOptions)
    this.insertOnRoot = blockRegistry.attachToRoot.bind(blockRegistry)
  }

  //#region Connect/Disconnect

  public connect(
    registry: BlockRInterface,
    block: AnyBlock,
    connection: Connection,
    atPosition?: Coordinates
  ): void {
    registry.notifyConnecting(block, this)
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

    if (!isOppositeAction && !localConnector?.isDownstream) {
      return this.handleConnectUpstream(block, connection, localConnector.type, atPosition)
    }

    this.connectedBlocks.insertForConnector(block, localConnector, this.insertOnRoot)
    if (isOppositeAction) return

    // todo invalidate position

    block.silentConnect(this, connection, undefined, true)
    if (block.type === BlockType.Variable) this.reevaluateBlocks()
  }

  private handleNoLocalConnector(block: AnyBlock, connection: Connection) {
    const lastLocalConnector = connection.localConnector(this.lastAfter)
    if (lastLocalConnector && !lastLocalConnector.isDownstream) {
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

  public reevaluateBlocks(): boolean {
    return this.connectedBlocks.reevaluateConnections(this.insertOnRoot)
  }

  //#region Connected Blocks

  connectedBlocks = new ConnectedBlocks()

  get upstream() {
    return this.connectedBlocks.byConnector(this.upstreamConnectorInUse)
  }
  get downstreamWithConnectors(): BlockAndConnector[] {
    return this.connectedBlocks.downstream
  }

  get before() {
    return this.connectedBlocks.byConnector(this.connectors.before)
  }
  get after() {
    return this.connectedBlocks.byConnector(this.connectors.after)
  }
  get lastAfter(): AnyBlock {
    if (!this.after) return this
    let lastNode: AnyBlock = this.after
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
      .filter(connector => connector.isDownstream)
      .map(connection => this.connectedBlocks.byConnector(connection))
  }

  get conditional(): Block<BlockType.Conditional, undefined> | null {
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

  get countAfterRecursive(): number {
    let count = 0
    let block: AnyBlock | null = this
    while (block) {
      count++
      block = block.after
    }
    return count
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

  disconnectSelf(registry: BlockRInterface | null): AnyBlock {
    const upstreamConnector = this.upstreamConnectorInUse
    if (!upstreamConnector) throw new Error(`Block has no upstream connector (block#${this.id})`)
    const upstream = this.connectedBlocks.popForConnector(upstreamConnector)
    if (!upstream) throw new Error(`Block has no upstream block (block#${this.id})`)

    registry?.notifyDisconnecting(this, upstream)
    return upstream.silentDisconnectBlock(this) ?? this
  }

  silentDisconnectBlock(block: AnyBlock): AnyBlock | null {
    const popped = this.connectedBlocks.popBlock(block)?.block ?? null
    if (block.connectedBlocks.isConnected(this)) block.silentDisconnectBlock(this)
    return popped
  }

  //#region Internals

  public get data(): BlockDataByType<T, S> {
    // return copy of data to prevent mutation,
    return clone1d(this._data) // not using structuredClone because it will throw on weakRefs
  }
  public set data(value: BlockDataByType<T, S>) {
    this._data = value
    this.reevaluateBlocks()
    this.emit("dataChanged", this)
  }
  public updateData(update: (current: BlockDataByType<T, S>) => BlockDataByType<T, S>) {
    this.data = update(this._data)
  }

  /**
   * Creates a clone of this block and registers it with its current position and size
   * @returns new cloned block instance
   */
  registerClone(
    blockRegistry: BlockRInterface,
    connectorRegistry: ConnectorRInterface
  ): Block<T, S> {
    const registered = blockRegistry.getRegistered(this)
    // new blocks register themselves
    const clone = new Block(
      this.type,
      deepClone(this._data),
      this.connectors.all.map(connector => ({
        connector: new Connector(
          connector.type,
          connector.role,
          connector.connectPredicates.predicates,
          connector.globalPosition
        ),
      })),
      this.isInDrawer,
      blockRegistry,
      connectorRegistry,
      registered?.globalPosition,
      registered?.size ?? undefined,
      {
        cloned: true,
      }
    )
    clone.isInDrawer = this.isInDrawer
    this.emit("cloned", clone)
    return clone
  }

  /**
   * Removes this block from the block and connector registries, assumes that it has been disconnected from other blocks
   */
  public removed = false
  remove(blockRegistry: BlockRInterface, connectorRegistry: ConnectorRInterface): void {
    if (this.connectedBlocks.blocks.size > 0)
      console.error("Removing block with connected blocks", this, this.connectedBlocks.blocks)
    blockRegistry.deregister(this)
    connectorRegistry.deregisterForBlock(this)
    this.data = null as any
    this.connectedBlocks = null as any
    this.connectors = null as any
    this.removed = true
  }
}
