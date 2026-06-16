enum ErrorType {
  UNKNOWN,
  UNSOLVABLE,
}

class ErrorMessage {
  public code: ErrorType;
  public message: string;

  constructor(code: ErrorType, message: string) {
    this.code = code;
    this.message = message;
  }
}

export { ErrorMessage, ErrorType };
