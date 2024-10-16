export class BlockRegistry {
  private static _instance: BlockRegistry | null = null;
  static get instance(): BlockRegistry {
    if (!BlockRegistry._instance) BlockRegistry._instance = new BlockRegistry();
    return BlockRegistry._instance;
  }

  


}