/**
 * Generic Clerk API error structure.
 */
export interface ClerkAPIError {
  code: string;
  message: string;
  longMessage?: string;
  meta?: {
    paramName?: string;
    sessionId?: string;
    emailAddresses?: string[];
  };
}

/**
 * Pagination params
 */
export interface ClerkPaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * Pagination params
 */
export interface ClerkPaginationResponse<T> {
  data: T[];
  total_count: number;
}
