export interface BlockContract {
  connect(block: Block, connection: Connection, atPosition: Coordinates): void;
  disconnect(block: Block): Block | null;
}