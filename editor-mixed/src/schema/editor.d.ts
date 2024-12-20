/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Configuration for the mixed content editor within a kutelabs challenge
 */
export type MixedContentEditorConfiguration = {
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
  initialDrawerBlocks?: AnyBlockSingle[]
  /**
   * Hides the drawer
   */
  hideDrawer?: true
  /**
   * Additional code to include (raw) in compiled code but not show in the editor
   */
  invisibleCode?: {
    kt?: string
    js?: string
    [k: string]: string
  }
  /**
   * Name of the function that should be called on execution
   */
  mainFunction?: string
} & {
  [k: string]: unknown
}
/**
 * Block
 */
export type MixedContentEditorBlock = AnyBlockConnected
/**
 * A block. Use "type" to determine the type of block
 */
export type AnyBlockConnected = AnyBlock & {
  /**
   * Connected Blocks
   */
  connectedBlocks?: ({
    on: MixedContentEditorConnector
    [k: string]: unknown
  } & AnyBlockConnected1)[]
  [k: string]: unknown
} & {
  type?: unknown
  data?: unknown
  connectedBlocks?: unknown
  on?: unknown
  elsebranch?: unknown
}
export type AnyBlock =
  | FunctionBlock
  | ExpressionBlock
  | ValueBlock
  | VariableInitBlock
  | VariableBlock
  | ConditionalBlock
/**
 * Connector on this block
 */
export type MixedContentEditorConnector =
  | "before"
  | "after"
  | "inputExtension"
  | "conditionalExtension"
  | "output"
  | "extender"
  | "inner"
  | "ifTrue"
  | "ifFalse"
/**
 * Connected Block
 */
export type AnyBlockConnected1 = AnyBlock & {
  /**
   * Connected Blocks
   */
  connectedBlocks?: ({
    on: MixedContentEditorConnector
    [k: string]: unknown
  } & AnyBlockConnected1)[]
  [k: string]: unknown
} & {
  type?: unknown
  data?: unknown
  connectedBlocks?: unknown
  on?: unknown
  elsebranch?: unknown
}
/**
 * A block without connected Blocks. Use "type" to determine the type of block
 */
export type AnyBlockSingle = {
  type?: unknown
  data?: unknown
  elsebranch?: unknown
} & (FunctionBlock | ExpressionBlock | ValueBlock | VariableInitBlock | VariableBlock | ConditionalBlock)

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
 * Variable Init Block
 */
export interface VariableInitBlock {
  /**
   * Defines this block as an variable block
   */
  type: "variable_init"
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
    /**
     * If the variable is mutable, defaults to true
     */
    isMutable?: boolean
  }
  [k: string]: unknown
}
/**
 * Variable Block. You must include a Variable Init Block to initialize the variable
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
/**
 * Conditional Block
 */
export interface ConditionalBlock {
  /**
   * Defines this block as a conditional block
   */
  type: "conditional"
  /**
   * Include else branch?
   */
  elsebranch?: boolean
  [k: string]: unknown
}
