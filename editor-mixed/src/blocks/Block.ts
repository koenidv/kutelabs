import type { Connection } from "../connections/Connection";
import type { Connector } from "../connections/Connector";
import type { Coordinates } from "../util/Coordinates";
import { IdGenerator } from "../util/IdGenerator";
import { BlockConnectors } from "./BlockConnectors";
import type { BlockContract } from "./BlockContract";
import type { BlockType } from "./BlockType";
import { ConnectedBlocks } from "./ConnectedBlocks";

export class Block implements BlockContract {
  readonly id: string = IdGenerator.instance.next
  readonly type: BlockType
  readonly draggable: boolean
  renderStale: boolean = false

  constructor(previous: Block | null, type: BlockType, connectors: Connector[], draggable: boolean) {
    this.type = type
    this.draggable = draggable

    this.connectors.addConnector(...connectors)

    // todo not implemented
    // if (previous) {
    //   if (this.beforeConnector === null) throw new Error("Block must have before connector to be initialized with previous block")
    //   if (previous.afterConnector === null) throw new Error("Previous block must have after connector to be initialized as before block")
    //   previous.connect(this, { from: previous.afterConnector, to: this.beforeConnector }, zeroCoordinates)
    // }

    // BlockRegistry.instance.register(this) todo not implemented
  }

  
  // Connected Blocks

  connectedBlocks = new ConnectedBlocks()

  connect(block: Block, connection: Connection, atPosition: Coordinates, isOppositeAction = false) {
    const localConnector = connection.localConnector(this)

    if (!localConnector) throw new Error("no local connector handling not implemented")
    // if (!localConnector) return this.handleNoLocalConnector(block, connection, atPosition) // todo not implemented

    if (!isOppositeAction && !localConnector?.isDownstram) {
      // return this.handleConnectUpstream(block, connection, atPosition, localConnector.type) // todo not implemented
    }

    this.connectedBlocks.insertForConnector(block, localConnector)
    if (isOppositeAction) return

    // todo invalidate position
  }

  get before() { return this.connectedBlocks.byConnector(this.connectors.before) }

  get after() { return this.connectedBlocks.byConnector(this.connectors.after) }
  get lastAfter(): Block {
    if (!this.after) return this
    let lastNode: Block = this.after
    while (lastNode.after) lastNode = lastNode.after
    return lastNode
  }
    

  // Connectors
  
  connectors = new BlockConnectors()

  get upstreamConnectorInUse(): Connector | null {
    if (this.before) return this.connectors.before
    return this.connectors.internal
  }


  disconnect(block: Block): Block | null {
    const popped = this.connectedBlocks.popBlock(block)?.block ?? null
    if (block.connectedBlocks.isConnected(this)) block.disconnect(this)
    return popped
  }

  disconnectSelf(): Block {
    const upstreamConnector = this.upstreamConnectorInUse
    if (!upstreamConnector) throw new Error(`Block has no upstream connector (block#${this.id})`)
    const upstream = this.connectedBlocks.popForConnector(upstreamConnector)
    if (!upstream) throw new Error(`Block has no upstream block (block#${this.id})`)

    return upstream.disconnect(this) ?? this
  }


}