import type { Connection } from "../connections/Connection";
import type { Coordinates } from "../util/Coordinates";
import type { AnyBlock, Block } from "./Block";

export interface BlockContract {
  connect(block: AnyBlock, connection: Connection, atPosition?: Coordinates, isOppositeAction?: boolean): void;
  disconnect(block: AnyBlock): AnyBlock | null;
}