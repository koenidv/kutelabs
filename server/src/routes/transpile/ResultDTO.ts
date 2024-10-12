export enum TranspilatonError {
  compilationError = "compilationError",
  timeout = "timeout",
  noCode = "noCode",
  unknown = "unknown"
}

export class ResultDTO {
  transpiledCode: string | null;
  cached: boolean | null;
  error: TranspilatonError | null;

  private constructor(transpiledCode: string | null, cached: boolean | null, error: TranspilatonError | null) {
    this.transpiledCode = transpiledCode;
    this.cached = cached;
    this.error = error;
  }

  public static compiled(transpiledCode: string): ResultDTO {
    return new ResultDTO(transpiledCode, false, null);
  }

  public static cached(transpiledCode: string): ResultDTO {
    return new ResultDTO(transpiledCode, true, null);
  }

  public static error(error: TranspilatonError): ResultDTO {
    return new ResultDTO(null, null, error);
  }
}