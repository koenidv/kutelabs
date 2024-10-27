import { Connection } from "../connections/Connection"
import { Connector, type BlockAndConnector } from "../connections/Connector"
import { ConnectorType } from "../connections/ConnectorType"
import { BlockRegistry } from "../registries/BlockRegistry"
import { Coordinates } from "../util/Coordinates"
import { IdGenerator } from "../util/IdGenerator"
import { BlockConnectors } from "./BlockConnectors"
import type { BlockContract } from "./BlockContract"
import {
  type BlockDataByType,
} from "./BlockData"
import type { BlockType } from "./BlockType"
import { ConnectedBlocks } from "./ConnectedBlocks"

export class Block<T extends BlockType> implements BlockContract {
  readonly id: string = IdGenerator.instance.next
  readonly type: BlockType
  readonly draggable: boolean
  renderStale: boolean = false
  data: BlockDataByType<T>

  constructor(
    previous: Block<BlockType> | null,
    type: T,
    data: BlockDataByType<T>,
    connectors: Connector[],
    draggable: boolean
  ) {
    this.type = type
    this.draggable = draggable

    this.data = data

    this.connectors.addConnector(this, Connector.internal(), ...connectors)

    if (previous) {
      if (this.connectors.before === null)
        throw new Error(
          "Block must have before connector to be initialized with previous block"
        )
      if (previous.connectors.after === null)
        throw new Error(
          "Previous block must have after connector to be initialized as before block"
        )
      previous.connect(
        this,
        new Connection(previous.connectors.after, this.connectors.before)
      )
    }

    BlockRegistry.instance.register(this)
  }

  //#region Connect/Disconnect

  connect(
    block: Block<BlockType>,
    connection: Connection,
    atPosition?: Coordinates,
    isOppositeAction = false
  ): void {
    const localConnector = connection.localConnector(this)

    if (!localConnector) return this.handleNoLocalConnector(block, connection)

    if (!isOppositeAction && !localConnector?.isDownstram) {
      return this.handleConnectUpstream(
        block,
        connection,
        localConnector.type,
        atPosition
      )
    }

    this.connectedBlocks.insertForConnector(block, localConnector)
    if (isOppositeAction) return

    // todo invalidate position

    block.connect(this, connection, undefined, true)
  }

  private handleNoLocalConnector(block: Block<BlockType>, connection: Connection) {
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
    block: Block<BlockType>,
    connection: Connection,
    localType: ConnectorType,
    atPosition?: Coordinates
  ) {
    if (localType === ConnectorType.Before) {
      if (block.connectors.before && this.upstream?.connectors.after) {
        this.upstream.connect(
          block,
          new Connection(
            this.upstream.connectors.after,
            block.connectors.before
          ),
          atPosition
        )
        return
      } else {
        block.lastAfter.connect(this.disconnectSelf(), connection)
        BlockRegistry.instance.attachToRoot(block, curr => atPosition ?? curr)
        return
      }
    } else
      throw new Error(
        `Connecting to upstream connector type "${ConnectorType[localType]}" is not implemented`
      )
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

  get inners(): Block<BlockType>[] {
    return this.connectors.inners
      .map(connector => this.connectedBlocks.byConnector(connector))
      .filter(block => block !== null) as Block<BlockType>[]
  }

  get extensions(): Block<BlockType>[] {
    return this.connectors.extensions
      .map(connector => this.connectedBlocks.byConnector(connector))
      .filter(block => block !== null) as Block<BlockType>[]
  }

  get allConnectedRecursive(): Block<BlockType>[] {
    return [
      this,
      ...this.downstreamWithConnectors.flatMap(
        ({ block }) => block.allConnectedRecursive
      ),
    ]
  }

  //#region Connectors

  connectors = new BlockConnectors()

  get upstreamConnectorInUse(): Connector | null {
    if (this.before) return this.connectors.before
    return this.connectors.internal
  }

  disconnect(block: Block<BlockType>): Block<BlockType> | null {
    const popped = this.connectedBlocks.popBlock(block)?.block ?? null
    if (block.connectedBlocks.isConnected(this)) block.disconnect(this)
    return popped
  }

  disconnectSelf(): Block<BlockType> {
    const upstreamConnector = this.upstreamConnectorInUse
    if (!upstreamConnector)
      throw new Error(`Block has no upstream connector (block#${this.id})`)
    const upstream = this.connectedBlocks.popForConnector(upstreamConnector)
    if (!upstream)
      throw new Error(`Block has no upstream block (block#${this.id})`)

    return upstream.disconnect(this) ?? this
  }
}
