/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

/**
 * Use and configure the mixed content editor
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
      [k: string]: unknown
    }
    [k: string]: unknown
  }[]
  /**
   * Initial blocks to be loaded into the editor
   */
  initialDrawerBlocks?: (AnyBlockSingle & {
    /**
     * Number of times this block can be used, -1 for infinite
     */
    count?: number
    [k: string]: unknown
  })[]
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
  connectedBlocks?: (
    | {
        on: MixedContentEditorConnector
        [k: string]: unknown
      }
    | AnyBlockConnected1
  )[]
  [k: string]: unknown
}
export type AnyBlock = (
  | FunctionBlock
  | FunctionInvokeBlock
  | ExpressionBlock
  | ValueBlock
  | VariableInitBlock
  | VariableSetBlock
  | VariableBlock
  | ConditionalBlock
  | LoopBlock
  | LogicNotBlock
  | LogicJunctionBlock
  | LogicComparisonBlock
  | MathOperationBlock
) & {
  /**
   * Set to false to disable dragging this block
   */
  draggable?: boolean
  [k: string]: unknown
}
/**
 * Connector on this block
 */
export type MixedContentEditorConnector =
  | "before"
  | "after"
  | "input"
  | "conditional"
  | "conditionalInput"
  | "comparisonInput"
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
  connectedBlocks?: (
    | {
        on: MixedContentEditorConnector
        [k: string]: unknown
      }
    | AnyBlockConnected1
  )[]
  [k: string]: unknown
}
/**
 * A block without connected Blocks. Use "type" to determine the type of block
 */
export type AnyBlockSingle = (
  | FunctionBlock
  | FunctionInvokeBlock
  | ExpressionBlock
  | ValueBlock
  | VariableInitBlock
  | VariableSetBlock
  | VariableBlock
  | ConditionalBlock
  | LoopBlock
  | LogicNotBlock
  | LogicJunctionBlock
  | LogicComparisonBlock
  | MathOperationBlock
) & {
  /**
   * Set to false to disable dragging this block
   */
  draggable?: boolean
  [k: string]: unknown
}

/**
 * A challenge along the kutelabs learning journey
 */
export interface Challenge {
  story: {
    /**
     * The order of this story in the parent section
     */
    order: number
    /**
     * The title of the story
     */
    title: string
    /**
     * The description of the story
     */
    description?: string
    /**
     * The dialog of the story
     */
    dialog: {
      /**
       * Static text shown next to the editor
       */
      static: string
      [k: string]: unknown
    }
    /**
     * The date and time the story was published. When unset or in the future, the story is not published
     */
    published: string
    /**
     * Hex color for the story box
     */
    color?: string
    imageStart?: Image
    imageEnd?: Image
    /**
     * Show confetti when the story is completed
     */
    confetti?: boolean
  }
  environment: {
    /**
     * Compile language for this challenge
     */
    language: "js" | "kt" | "unset"
    /**
     * App-level features (app callbacks) to enable for this challenge
     */
    appFeatures?: "setUsername"[]
  }
  /**
   * Tests to run on the code, all must pass
   */
  tests: {
    /**
     * Sets of arguments to pass to the tested function
     */
    args: unknown[][]
    /**
     * Tests to run on the result of the tested function, key is the test id
     */
    run: {
      /**
       * This interface was referenced by `undefined`'s JSON-Schema definition
       * via the `patternProperty` "^[a-zA-Z_][a-zA-Z0-9_]*$".
       */
      [k: string]: {
        /**
         * Lambda notation. Must return true if test passed. Arguments are passed as first argument args[], tested function result is passed as second argument. String returns will be used as error messages.
         */
        function: string
        /**
         * Description of the test, will be used as error message if test fails but no message is returned.
         */
        description: string
      }
    }
  }[]
  editor: MixedContentEditorConfiguration | CodeEditorConfiguration
  [k: string]: unknown
}
export interface Image {
  /**
   * The URL of the image
   */
  src: string
  /**
   * The alt text of the image
   */
  alt: string
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
    /**
     * Function parameters
     */
    params?: {
      /**
       * Name of the parameter
       */
      name?: string
      /**
       * Value type (from ValueDataType)
       */
      type?:
        | "int"
        | "float"
        | "string"
        | "boolean"
        | "array<int>"
        | "array<float>"
        | "array<string>"
        | "array<boolean>"
        | "dynamic"
      [k: string]: unknown
    }[]
    /**
     * If the name is editable, defaults to true
     */
    nameEditable?: boolean
    /**
     * If the parameters are editable, defaults to true
     */
    paramsEditable?: boolean
    [k: string]: unknown
  }
  connectedBlocks?: {
    on: "inner" | "input" | "output"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Function Invokation Block
 */
export interface FunctionInvokeBlock {
  /**
   * Defines this block as a function invocation block
   */
  type: "function_invoke"
  /**
   * Function Invocation Block Data
   */
  data: {
    /**
     * Name of the function to invoke
     */
    name: string
    [k: string]: unknown
  }
  /**
   * Function invocation blocks can't have downstream connected blocks
   */
  connectedBlocks?: null
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
  connectedBlocks?: {
    on: "after" | "input"
    [k: string]: unknown
  }[]
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
  /**
   * Value blocks can't have downstream connected blocks
   */
  connectedBlocks?: null
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
     * Value type (from ValueDataType)
     */
    type:
      | "int"
      | "float"
      | "string"
      | "boolean"
      | "array<int>"
      | "array<float>"
      | "array<string>"
      | "array<boolean>"
      | "dynamic"
    /**
     * If the variable is mutable, defaults to true
     */
    mutable?: boolean
    /**
     * If the name is editable, defaults to true
     */
    nameEditable?: boolean
    /**
     * If the type is editable, defaults to true
     */
    typeEditable?: boolean
  }
  connectedBlocks?: {
    on: "after" | "input"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Variable Set Block
 */
export interface VariableSetBlock {
  /**
   * Defines this block as an variable block
   */
  type: "variable_set"
  connectedBlocks?: {
    [k: string]: unknown
  }[]
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
  }
  /**
   * Variable blocks can't have downstream connected blocks
   */
  connectedBlocks?: null
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
  connectedBlocks?: {
    on: "conditional" | "ifTrue" | "ifFalse" | "after"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Loop Block
 */
export interface LoopBlock {
  /**
   * Defines this block as a loop block
   */
  type: "loop"
  connectedBlocks?: {
    on?: "inner" | "input"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * "Not" Logic Block
 */
export interface LogicNotBlock {
  /**
   * Defines this block as a Logic Not block
   */
  type: "logic_not"
  connectedBlocks?: {
    on?: "conditional"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Junction Logic Block
 */
export interface LogicJunctionBlock {
  /**
   * Defines this block as a Logic Junction block
   */
  type: "logic_junction"
  /**
   * Junction Logic Block Data
   */
  data?: {
    /**
     * Mode of junction
     */
    mode: "and" | "or"
    /**
     * If the mode is editable, defaults to true
     */
    editable?: boolean
    [k: string]: unknown
  }
  connectedBlocks?: {
    on?: "conditionalInput"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Comparison Logic Block
 */
export interface LogicComparisonBlock {
  /**
   * Defines this block as a Logic Comparison block
   */
  type: "logic_comparison"
  /**
   * Comparison Logic Block Data
   */
  data?: {
    /**
     * Mode of comparison
     */
    mode: "==" | "!=" | "<" | "<=" | ">" | ">="
    /**
     * If the mode is editable, defaults to true
     */
    editable?: boolean
    [k: string]: unknown
  }
  connectedBlocks?: {
    on?: "comparisonInput"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Math Operation Block
 */
export interface MathOperationBlock {
  /**
   * Defines this block as a Math Operation block
   */
  type: "math_operation"
  /**
   * Math Operation Block Data
   */
  data?: {
    /**
     * Operator
     */
    operator: "+" | "-" | "*" | "/" | "%" | ">="
    /**
     * If the operator is editable, defaults to true
     */
    editable?: boolean
    [k: string]: unknown
  }
  connectedBlocks?: {
    on?: "input"
    [k: string]: unknown
  }[]
  [k: string]: unknown
}
/**
 * Use and configure the code editor
 */
export interface CodeEditorConfiguration {
  /**
   * Defines this editor as a code editor
   */
  type: "code"
  /**
   * The initial value of the editor
   */
  initialValue?: string
  /**
   * Additional code not visible to the user
   */
  invisibleCode?: string
  /**
   * Entrypoint to the user code, defaults to `main`
   */
  entrypoint?: string
  /**
   * Names of the arguments to the user code
   */
  argnames?: string[]
  [k: string]: unknown
}
