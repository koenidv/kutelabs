import { Connector } from "./Connector"
import { ConnectorRole } from "./ConnectorRole"
import { ConnectorType } from "./ConnectorType"

export class DefaultConnectors {
  static internal() {
    return new Connector(ConnectorType.Internal)
  }

  static before() {
    return new Connector(ConnectorType.Before, ConnectorRole.Default, [
      remote =>
        remote.type === ConnectorType.After &&
        remote.role === ConnectorRole.Default,
      remote => remote.type === ConnectorType.Inner,
      (remote, local) =>
        local.role === ConnectorRole.Input &&
        remote.role === ConnectorRole.Input,
    ])
  }

  static after() {
    return new Connector(ConnectorType.After, ConnectorRole.Default, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.role === ConnectorRole.Default,
    ])
  }

  static inputExtension() {
    return new Connector(ConnectorType.Extension, ConnectorRole.Input, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.role === ConnectorRole.Input,
    ])
  }

  static extender() {
    return new Connector(ConnectorType.Before, ConnectorRole.Input, [
      remote => remote.type === ConnectorType.Extension,
    ])
  }

  static innerLoop() {
    return new Connector(ConnectorType.Inner, ConnectorRole.Loop_Inner, [
      remote =>
        remote.type === ConnectorType.Before &&
        remote.role === ConnectorRole.Default,
    ])
  }

  static Root = new Connector(ConnectorType.Internal)
}
