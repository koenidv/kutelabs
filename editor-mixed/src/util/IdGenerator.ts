export class IdGenerator {
  
  private static _instance: IdGenerator
  public static get instance(): IdGenerator {
    if (!IdGenerator._instance) IdGenerator._instance = new IdGenerator()
    return IdGenerator._instance
  }

  private _lastId = 0

  public get next(): string {
    return (++this._lastId).toString()
  }
}