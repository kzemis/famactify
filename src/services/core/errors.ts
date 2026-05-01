interface ErrorLike {
  message?: string;
  code?: string;
}

export class ServiceError extends Error {
  readonly service: string;
  readonly cause?: unknown;

  constructor(service: string, message: string, cause?: unknown) {
    super(message);
    this.name = 'ServiceError';
    this.service = service;
    this.cause = cause;
  }
}

export function toServiceError(service: string, error: unknown, fallback = 'Service request failed'): ServiceError {
  const errorLike = error as ErrorLike;
  const message = errorLike?.message || fallback;
  console.error(`[${service}]`, message, error);
  return new ServiceError(service, message, error);
}

export function throwIfError(service: string, error: unknown): void {
  if (error) throw toServiceError(service, error);
}
