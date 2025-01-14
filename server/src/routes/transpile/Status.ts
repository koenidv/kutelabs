
export enum TranspilationStatus {
  Success = "success",
  CompilationError = "compilationError",
  Timeout = "timeout",
  EmptyInput = "emptyInput",
  InvalidOptions = "invalidOptions",
  CacheError = "cacheError",
  UnknownError = "unknownError"
}

export enum RequestError {
  Unauthorized = "unauthorized",
}