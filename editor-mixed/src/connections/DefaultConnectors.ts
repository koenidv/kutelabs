import type { AnyBlock, Block } from "../blocks/Block"
import {
  ComparisonOperatorTypeCompatibility,
  LogicComparisonOperator,
  type BlockDataVariable
} from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import {
  DefinedExpressionData,
  type DefinedExpression,
} from "../blocks/configuration/DefinedExpression"
import { Connector } from "./Connector"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"

export class DefaultConnectors {
  private static beforeAfter() {
    return [this.before(), this.after()]
  }
  static byBlockType(type: BlockType, expression?: DefinedExpression): Connector[] {
    switch (type) {
      case BlockType.Function:
        return [DefaultConnectors.inner()]
      case BlockType.Expression:
        if (!expression) return this.beforeAfter()
        const expressionInputs = DefinedExpressionData[expression].inputs
        return [
          ...this.beforeAfter(),
          ...expressionInputs.map(() => DefaultConnectors.inputExtension()), // todo type checking
        ]
      case BlockType.VarInit:
        return [...this.beforeAfter(), DefaultConnectors.variableInitInput()]
      case BlockType.VarSet:
        return [
          ...this.beforeAfter(),
          DefaultConnectors.innerVariable(),
          DefaultConnectors.variableSetInput(),
        ]
      case BlockType.Conditional:
        return [
          ...this.beforeAfter(),
          DefaultConnectors.conditionalExtension(),
          DefaultConnectors.conditionalTrue(),
        ]
      case BlockType.Loop:
        return [
          ...this.beforeAfter(),
          DefaultConnectors.inner(),
          DefaultConnectors.conditionalExtension(),
        ]
      case BlockType.Value:
      case BlockType.Variable:
      case BlockType.FunctionInvoke:
        return [DefaultConnectors.extender()] // fixme function invokes cannot be used for type-checked inputs (logic) yet
      case BlockType.LogicNot:
        return [DefaultConnectors.extender(), DefaultConnectors.conditionalExtension()]
      case BlockType.LogicJunction:
        return [
          DefaultConnectors.extender(),
          DefaultConnectors.conditionalInput(),
          DefaultConnectors.conditionalInput(),
        ]
      case BlockType.LogicComparison:
        return [
          DefaultConnectors.extender(),
          DefaultConnectors.comparisonInput(),
          DefaultConnectors.comparisonInput(),
        ]
      case BlockType.MathOperation:
        return [
          DefaultConnectors.extender(),
          DefaultConnectors.inputExtension(),
          DefaultConnectors.inputExtension(),
        ]
      default:
        return []
    }
  }

  static internal() {
    return new Connector(ConnectorType.Internal)
  }

  static before() {
    return new Connector(ConnectorType.Before, ConnectorRole.Default, [
      remote => remote.type === ConnectorType.After && remote.role === ConnectorRole.Default,
      remote => remote.type === ConnectorType.Inner,
      (remote, local) => local.role === ConnectorRole.Input && remote.role === ConnectorRole.Input,
    ])
  }

  static after() {
    return new Connector(ConnectorType.After, ConnectorRole.Default, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Default,
    ])
  }

  static inputExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Input,
    ])
  }

  static variableInitInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      (remote, local) => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false
        if (remote.parentBlock?.type === BlockType.Variable) return false
        if (!local.parentBlock || !remote.parentBlock) return false

        const localType = (
          local.parentBlock.data != null && "type" in local.parentBlock.data
            ? local.parentBlock.data.type
            : null
        ) as DataType | null

        if (localType == null)
          return remote.parentBlock.data == null || !("type" in remote.parentBlock.data)

        if (remote.parentBlock.data != null && "type" in remote.parentBlock.data) {
          return (
            localType === remote.parentBlock.data.type ||
            remote.parentBlock.data.type === DataType.Dynamic
          )
        }
        return false
      },
    ])
  }

  static variableSetInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      (remote, local) => {
        if (
          remote.type !== ConnectorType.Before ||
          remote.role !== ConnectorRole.Input ||
          !local.parentBlock ||
          !remote.parentBlock
        )
          return false

        const variableData = local.parentBlock.inners[0]?.data as BlockDataVariable
        if (!variableData || !variableData.name) return true

        const localType = variableData.variableHelper?.deref()?.getVariableType(variableData.name)
        if (!localType) return false
        const remoteType = this.getValueOrVariableType(remote.parentBlock)
        if (remoteType === null) return false

        return (
          localType === remoteType || remoteType === DataType.Dynamic || remoteType === undefined
        )
      },
    ])
  }

  static conditionalExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Conditional, [
      remote => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false
        const remoteType = this.getValueOrVariableType(remote.parentBlock)
        return remoteType === DataType.Boolean || remoteType === DataType.Dynamic
      },
    ])
  }

  /** This input has the same functionality as @see conditionalExtension, but functions as input instead of Conditional role */
  static conditionalInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      remote => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false
        const remoteType = this.getValueOrVariableType(remote.parentBlock)
        return remoteType === DataType.Boolean || remoteType === DataType.Dynamic
      },
    ])
  }

  static comparisonInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      (remote, local) => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false

        const remoteType = this.getValueOrVariableType(remote.parentBlock)
        if (remoteType === null) return false

        if (
          !local.parentBlock?.data ||
          !("mode" in local.parentBlock.data) ||
          !local.parentBlock.data.mode
        )
          return false
        const compat =
          ComparisonOperatorTypeCompatibility[
            local.parentBlock.data.mode as LogicComparisonOperator
          ]
        if (!compat) return true
        return remoteType === undefined || compat.includes(remoteType) || remoteType === DataType.Dynamic
      },
    ])
  }

  static output() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Output, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Input,
    ])
  }

  static conditionalTrue() {
    return new Connector(ConnectorType.Inner, ConnectorRole.If_True, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Default,
    ])
  }

  static conditionalFalse() {
    return new Connector(ConnectorType.Inner, ConnectorRole.If_False, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Default,
    ])
  }

  static extender() {
    return new Connector(ConnectorType.Before, ConnectorRole.Input, [
      remote => remote.role === ConnectorRole.Input && remote.type !== ConnectorType.Before,
      remote => remote.role === ConnectorRole.Conditional && remote.type !== ConnectorType.Before,
      remote => remote.role === ConnectorRole.Output,
    ])
  }

  static inner() {
    return new Connector(ConnectorType.Inner, ConnectorRole.Inner, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Default,
    ])
  }

  static innerVariable() {
    return new Connector(ConnectorType.Inner, ConnectorRole.Input, [
      remote => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input || remote.parentBlock?.type !== BlockType.Variable)
          return false
        const data = remote.parentBlock.data as BlockDataVariable
        if (!data.variableHelper) return true // this should only occur on initialization
        return data.variableHelper.deref()?.getVariableMutable(data.name) ?? false
      }
    ])
  }

  static root() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Root)
  }
  static drawer() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Drawer)
  }

  static getValueOrVariableType(block: AnyBlock | null): DataType | null | undefined {
    if (block == null) return null
    const data = block.data
    if (data == null) return null
    if ("type" in data) return data.type
    if ("variableHelper" in data) {
      return data.variableHelper?.deref()?.getVariableType(data.name) ?? null
    }
    if (block.type === BlockType.MathOperation) {
      return DefaultConnectors.determineMathBlockVariableType(
        block as Block<BlockType.MathOperation>
      )
    }
    return null
  }

  static determineMathBlockVariableType(
    block: Block<BlockType.MathOperation>
  ): DataType | undefined {
    const typeA = block.inputs[0]?.let(it => this.getValueOrVariableType(it)) ?? null
    const typeB = block.inputs[1]?.let(it => this.getValueOrVariableType(it)) ?? null

    if (typeA == null || typeB == null) return undefined
    if (typeA === typeB) return typeA
    if (typeA === DataType.Float || typeB === DataType.Float) return DataType.Float
    if (typeA === DataType.Dynamic || typeB === DataType.Dynamic) return DataType.Dynamic
    return DataType.Int
  }
}
