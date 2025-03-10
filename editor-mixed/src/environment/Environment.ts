import type { EditorMixed } from "../editor"
import { BlockMarking } from "@kutelabs/editor-mixed"

export function generateCallbacks(editor: EditorMixed): { [name: string]: (...args: any) => any } {
  return {
    markBlock: ((blockId: string, marking = BlockMarking.Executing) => {
      editor.blockRegistry.markBlock(blockId, marking)
    }).bind(editor),
  }
}
