import type { BlockContract } from "./BlockContract";

export class Block implements BlockContract {


  connect(block: Block, connection: Connection, atPosition: Coordinates): void {
    throw new Error("Method not implemented.");
  }


  disconnect(block: Block) {
    throw new Error("Method not implemented.");
  }


}