import { BlockType } from "../blocks/configuration/BlockType"
import { ValueDataType } from "../blocks/configuration/ValueDataType"
import { Connector } from "./Connector"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"

export class DefaultConnectors {
  static byBlockType(type: BlockType): Connector[] {
    switch (type) {
      case BlockType.Function:
        return [DefaultConnectors.inner()]
      case BlockType.Expression:
        return [
          DefaultConnectors.before(),
          DefaultConnectors.after(),
          DefaultConnectors.inputExtension(), // todo variable input count
        ]
      case BlockType.Conditional:
        return [
          DefaultConnectors.before(),
          DefaultConnectors.after(),
          DefaultConnectors.conditionalExtension(),
          DefaultConnectors.conditionalTrue(),
        ]
      case BlockType.Value:
      case BlockType.Variable:
        return [DefaultConnectors.extender()]
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

  static conditionalExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Conditional, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.parentBlock?.data != null &&
        "type" in remote.parentBlock?.data &&
        (remote.parentBlock?.data.type as unknown) === ValueDataType.Boolean,
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
      remote => remote.type === ConnectorType.Extension,
    ])
  }

  static inner() {
    return new Connector(ConnectorType.Inner, ConnectorRole.Inner, [
      remote => remote.type === ConnectorType.Before && remote.role === ConnectorRole.Default,
    ])
  }

  static root() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Root)
  }
  static drawer() {
    return new Connector(ConnectorType.Internal, ConnectorRole.Drawer)
  }
}
