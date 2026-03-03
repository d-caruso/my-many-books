// src/common/ApiResponse.ts

export interface ApiErrorPayload {
  code?: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T = unknown> {
  statusCode: number;
  success: boolean;
  data?: T;
  error?: string | ApiErrorPayload;
  details?: unknown;
  message?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
  pagination?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}
