import { v7 as uuidv7 } from "uuid"

export class IdGenerator {
  static get next() {
    return uuidv7()
  }
}
