export type ErrorCategory =
  | "NETWORK_ERROR"
  | "RATE_LIMIT"
  | "AUTH_ERROR"
  | "MODEL_ERROR"
  | "BROWSER_ERROR"
  | "SELECTOR_ERROR"
  | "DATABASE_ERROR"
  | "VALIDATION_ERROR"
  | "PERMISSION_ERROR"
  | "TIMEOUT_ERROR"
  | "UNKNOWN_ERROR";

export interface AppErrorOptions {
  category: ErrorCategory;
  message: string;
  userMessage?: string;
  statusCode?: number;
  retryable?: boolean;
  details?: any;
  traceId?: string;
}

export class AppError extends Error {
  public readonly category: ErrorCategory;
  public readonly userMessage: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details: any;
  public readonly traceId?: string;

  constructor(options: AppErrorOptions) {
    super(options.message);
    this.name = "AppError";
    this.category = options.category;
    this.userMessage = options.userMessage || this.getDefaultUserMessage(options.category);
    this.statusCode = options.statusCode || this.getDefaultStatusCode(options.category);
    this.retryable = options.retryable ?? this.getDefaultRetryable(options.category);
    this.details = options.details;
    this.traceId = options.traceId;
  }

  private getDefaultUserMessage(category: ErrorCategory): string {
    switch (category) {
      case "RATE_LIMIT":
        return "AI capacity is temporarily busy. Automatically retrying...";
      case "NETWORK_ERROR":
        return "Network connection issue. Please check your internet connection.";
      case "AUTH_ERROR":
        return "Authentication required. Please sign in to continue.";
      case "BROWSER_ERROR":
      case "SELECTOR_ERROR":
        return "The browser task encountered an unexpected page state. Auto-recovering...";
      case "DATABASE_ERROR":
        return "Database is temporarily reconnecting. Your session is protected.";
      case "TIMEOUT_ERROR":
        return "The requested operation timed out. Retrying with alternative strategy...";
      case "VALIDATION_ERROR":
        return "Invalid request parameters provided.";
      default:
        return "An unexpected error occurred. Please try again.";
    }
  }

  private getDefaultStatusCode(category: ErrorCategory): number {
    switch (category) {
      case "AUTH_ERROR":
      case "PERMISSION_ERROR":
        return 401;
      case "VALIDATION_ERROR":
        return 400;
      case "RATE_LIMIT":
        return 429;
      case "TIMEOUT_ERROR":
        return 504;
      case "DATABASE_ERROR":
      case "MODEL_ERROR":
      case "BROWSER_ERROR":
        return 502;
      default:
        return 500;
    }
  }

  private getDefaultRetryable(category: ErrorCategory): boolean {
    return ["RATE_LIMIT", "NETWORK_ERROR", "TIMEOUT_ERROR", "BROWSER_ERROR", "SELECTOR_ERROR"].includes(category);
  }

  toJSON() {
    return {
      success: false,
      error: {
        category: this.category,
        message: this.message,
        userMessage: this.userMessage,
        statusCode: this.statusCode,
        retryable: this.retryable,
        traceId: this.traceId,
      },
    };
  }
}
