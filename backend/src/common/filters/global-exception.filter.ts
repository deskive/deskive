import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message = typeof exceptionResponse === 'string' 
        ? exceptionResponse 
        : (exceptionResponse as any).message || message;
      details = typeof exceptionResponse === 'object' ? exceptionResponse : null;
    } else if (exception instanceof Error) {
      // Handle known error patterns
      if (exception.message.includes('JWT')) {
        status = HttpStatus.UNAUTHORIZED;
        message = 'Authentication failed';
      } else if (exception.message.includes('duplicate key') || exception.message.includes('unique constraint')) {
        status = HttpStatus.CONFLICT;
        message = 'Resource already exists';
      } else if (exception.message.includes('not found')) {
        status = HttpStatus.NOT_FOUND;
        message = 'Resource not found';
      } else if (exception.message.includes('foreign key') || exception.message.includes('constraint')) {
        status = HttpStatus.BAD_REQUEST;
        message = 'Invalid data provided';
      } else {
        message = process.env.NODE_ENV === 'development' ? exception.message : 'Something went wrong';
      }
    }

    // Generate correlation ID for tracking
    const correlationId = request.headers['x-correlation-id'] || 
                         `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Log the error for monitoring
    this.logger.error(
      `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    const errorResponse = {
      success: false,
      status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      correlationId,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && exception instanceof Error && { 
        stack: exception.stack 
      }),
    };

    response.status(status).json(errorResponse);
  }
}