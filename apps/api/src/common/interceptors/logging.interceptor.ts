// apps/api/src/common/interceptors/logging.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
  HttpException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const req = ctx.getRequest<Request>();
    const { method, originalUrl, ip } = req;
    const startTime = Date.now();

    return next.handle().pipe(
      tap(() => {
        const res = ctx.getResponse<Response>();
        const statusCode = res.statusCode;
        const duration = Date.now() - startTime;
        this.logger.log(`🟢 [${method}] ${originalUrl} ${statusCode} - ${duration}ms [${ip}]`);
      }),
      catchError((err) => {
        const duration = Date.now() - startTime;
        const status = err instanceof HttpException ? err.getStatus() : 500;
        const message = err.response?.message || err.message || 'Internal server error';
        this.logger.error(
          `🔴 [${method}] ${originalUrl} ${status} - ${duration}ms [${ip}] -> Error: ${JSON.stringify(
            message,
          )}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
