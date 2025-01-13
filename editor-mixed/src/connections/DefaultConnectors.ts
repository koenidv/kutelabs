import {
  ComparisonOperatorTypeCompatibility,
  LogicComparisonOperator,
  type BlockDataVariable,
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
        return [DefaultConnectors.inner(), DefaultConnectors.output()]
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
        return [DefaultConnectors.extender()]
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

  static conditionalExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Conditional, [
      remote => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false
        const remoteType = this.getValueOrVariableType(remote.parentBlock?.data)
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
        const remoteType = this.getValueOrVariableType(remote.parentBlock?.data)
        return remoteType === DataType.Boolean || remoteType === DataType.Dynamic
      },
    ])
  }

  static comparisonInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      (remote, local) => {
        if (remote.type !== ConnectorType.Before || remote.role !== ConnectorRole.Input)
          return false

        const remoteType = this.getValueOrVariableType(remote.parentBlock?.data)
        if (remoteType == null) return false

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
        return compat.includes(remoteType)
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
      remote =>
        remote.type === ConnectorType.Before &&
        remote.role === ConnectorRole.Input &&
        remote.parentBlock?.type === BlockType.Variable,
    ])
  }

  static root() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Root)
  }
  static drawer() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Drawer)
  }

  static getValueOrVariableType(data: any): DataType | null {
    if (data == null) return null
    if ("type" in data) return data.type
    if ("variableHelper" in data) {
      return data.variableHelper?.deref()?.getVariableType(data.name)
    }
    return null
  }
}
