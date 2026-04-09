export interface ErrorResponse {
  success: false;
  status: number;
  message: string;
  timestamp: string;
  path: string;
  method: string;
  correlationId?: string;
  details?: any;
  stack?: string; // Only in development
}

export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  timestamp: string;
  correlationId?: string;
}

export interface PaginatedResponse<T = any> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  timestamp: string;
  correlationId?: string;
}