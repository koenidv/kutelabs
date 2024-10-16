import type { Connection } from "../connections/Connection";
import type { Coordinates } from "../util/Coordinates";
import type { Block } from "./Block";

export interface BlockContract {
  connect(block: Block, connection: Connection, atPosition?: Coordinates, isOppositeAction?: boolean): void;
  disconnect(block: Block): Block | null;
}