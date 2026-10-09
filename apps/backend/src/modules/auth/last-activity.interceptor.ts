import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { LastActivityService } from './last-activity.service';

/**
 * Global interceptor (runs after guards): records activity for authenticated
 * API requests without ever delaying or failing the request itself.
 */
@Injectable()
export class LastActivityInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LastActivityInterceptor.name);

  constructor(private readonly lastActivity: LastActivityService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() === 'http') {
      const userId = context.switchToHttp().getRequest()?.user?.sub;
      if (typeof userId === 'number') {
        try {
          void Promise.resolve(this.lastActivity.record(userId)).catch(
            (error) => this.logger.warn(`Last activity update failed: ${error}`),
          );
        } catch (error) {
          this.logger.warn(`Last activity update failed: ${error}`);
        }
      }
    }
    return next.handle();
  }
}
