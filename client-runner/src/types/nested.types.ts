import type { Callback } from "../callbacks/Callback"

export interface NestedCallbacks {
  [key: string]: Callback | NestedCallbacks
}

export interface NestedFunctions {
  [key: string]: ((...data: any[]) => void) | NestedFunctions
}

export interface NestedStrings {
  [key: string]: string | NestedStrings
}
