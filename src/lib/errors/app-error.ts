import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'AUTHENTICATION_ERROR'
  | 'AUTHORIZATION_ERROR'
  | 'NOT_FOUND_ERROR'
  | 'CONFLICT_ERROR'
  | 'RATE_LIMIT_ERROR'
  | 'DATABASE_ERROR'
  | 'INTERNAL_SERVER_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, string[]>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode: number,
    details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, string[]>) {
    super(message, 'VALIDATION_ERROR', 400, details);
  }
}

export class AuthenticationError extends AppError {
  constructor(message = 'Please sign in to access this resource.') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class AuthorizationError extends AppError {
  constructor(message = 'You do not have permission to perform this action.') {
    super(message, 'AUTHORIZATION_ERROR', 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'The requested resource was not found.') {
    super(message, 'NOT_FOUND_ERROR', 404);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'A conflicting record already exists.') {
    super(message, 'CONFLICT_ERROR', 409);
  }
}

export class RateLimitError extends AppError {
  constructor(message = 'Too many attempts. Please wait a moment and try again.') {
    super(message, 'RATE_LIMIT_ERROR', 429);
  }
}

export function handleRouteError(error: unknown): NextResponse {
  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const key = issue.path.join('.') || 'form';
      if (!fieldErrors[key]) {
        fieldErrors[key] = [];
      }
      fieldErrors[key].push(issue.message);
    }
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: error.issues[0]?.message || 'Invalid request input.',
          details: fieldErrors,
        },
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
        },
      },
      { status: error.statusCode }
    );
  }

  console.error('[PlantifyPH Server Error]:', error);
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred while processing your request.',
      },
    },
    { status: 500 }
  );
}
