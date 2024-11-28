/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Block
 */
export type MixedContentEditorBlock = AnyBlock
/**
 * A block. Use "type" to determine the type of block
 */
export type AnyBlock = (FunctionBlock | ExpressionBlock | ValueBlock | VariableBlock) & {
  /**
   * Connected Blocks
   */
  connectedBlocks?: ({
    on: MixedContentEditorConnector
    [k: string]: unknown
  } & AnyBlock1)[]
  [k: string]: unknown
} & {
  type?: unknown
  data?: unknown
  connectedBlocks?: unknown
  on?: unknown
}
/**
 * Connector on this block
 */
export type MixedContentEditorConnector =
  | "before"
  | "after"
  | "inputExtension"
  | "conditionalExtension"
  | "extender"
  | "innerLoop"
/**
 * Connected Block
 */
export type AnyBlock1 = (FunctionBlock | ExpressionBlock | ValueBlock | VariableBlock) & {
  /**
   * Connected Blocks
   */
  connectedBlocks?: ({
    on: MixedContentEditorConnector
    [k: string]: unknown
  } & AnyBlock1)[]
  [k: string]: unknown
} & {
  type?: unknown
  data?: unknown
  connectedBlocks?: unknown
  on?: unknown
}
/**
 * Block within the mixed content editor
 */
export type MixedContentEditorBlock1 = AnyBlock

/**
 * Configuration for the mixed content editor within a kutelabs challenge
 */
export interface MixedContentEditorConfiguration {
  /**
   * Defines this editor as a mixed content editor
   */
  type: "mixed"
  /**
   * Initial blocks to be loaded into the editor
   */
  initialBlocks: {
    block: MixedContentEditorBlock
    /**
     * Coordinates of the block
     */
    coordinates: {
      x: number
      y: number
    }
  }[]
  /**
   * Initial blocks to be loaded into the editor
   */
  initialDrawerBlocks: MixedContentEditorBlock1[]
}
/**
 * Function Block
 */
export interface FunctionBlock {
  /**
   * Defines this block as a function block
   */
  type: "function"
  /**
   * Function Block Data
   */
  data: {
    /**
     * Name of the function
     */
    name: string
  }
  [k: string]: unknown
}
/**
 * Expression Block
 */
export interface ExpressionBlock {
  /**
   * Defines this block as an expression block
   */
  type: "expression"
  /**
   * Expression Block Data
   */
  data: {
    /**
     * Standard expression to be evaluated or Custom to use customExpression
     */
    expression: "Custom" | "Println"
    /**
     * Custom expression to be evaluated
     */
    customExpression?: {
      kt?: string
      js?: string
      [k: string]: string
    }
    editable?:
      | false
      | {
          lang: string
          linesHeight?: number
          maxLines?: number
        }
  }
  [k: string]: unknown
}
/**
 * Value Block
 */
export interface ValueBlock {
  /**
   * Defines this block as an value block
   */
  type: "value"
  /**
   * Value Block Data
   */
  data: {
    [k: string]: unknown
  }
  [k: string]: unknown
}
/**
 * Variable Block
 */
export interface VariableBlock {
  /**
   * Defines this block as an variable block
   */
  type: "variable"
  /**
   * Variable Block Data
   */
  data: {
    /**
     * Name of the variable
     */
    name: string
    /**
     * Variable type (from ValueDataType)
     */
    type: "int" | "float" | "string" | "boolean" | "array<int>" | "array<float>" | "array<string>" | "array<boolean>"
  }
  [k: string]: unknown
}
