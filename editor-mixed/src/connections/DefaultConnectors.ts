import type { BlockDataVariable } from "../blocks/configuration/BlockData"
import { BlockType } from "../blocks/configuration/BlockType"
import { DataType } from "../blocks/configuration/DataType"
import { Connector } from "./Connector"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"

export class DefaultConnectors {
  private static beforeAfter() {
    return [this.before(), this.after()]
  }
  static byBlockType(type: BlockType): Connector[] {
    switch (type) {
      case BlockType.Function:
        return [DefaultConnectors.inner(), DefaultConnectors.output()]
      case BlockType.Expression:
        return [
          ...this.beforeAfter(),
          DefaultConnectors.inputExtension(), // todo variable input count
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
          return localType === remote.parentBlock.data.type
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
          return localType === remote.parentBlock.data.type
        }

        return false
      },
    ])
  }

  static conditionalExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Conditional, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.parentBlock?.data != null &&
        "type" in remote.parentBlock?.data &&
        (remote.parentBlock?.data.type as unknown) === DataType.Boolean,
    ])
  }

  /** This input has the same functionality as @see conditionalExtension, but functions as input instead of Conditional role */
  static conditionalInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.parentBlock?.data != null &&
        "type" in remote.parentBlock?.data &&
        (remote.parentBlock?.data.type as unknown) === DataType.Boolean,
    ])
  }

  static comparisonInput() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      (remote, local) => true, // todo check type against compatibility
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
      (remote, local) =>
        local.parentBlock?.data != null &&
        "type" in local.parentBlock.data &&
        local.parentBlock.data.type == DataType.Boolean &&
        remote.role === ConnectorRole.Conditional &&
        remote.type !== ConnectorType.Before,
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
}
