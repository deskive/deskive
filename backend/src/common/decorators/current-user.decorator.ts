import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // If a specific field is requested, return that field
    if (data && user) {
      // Handle 'sub' with fallback to 'userId' for JWT compatibility
      if (data === 'sub') {
        return user.sub || user.userId;
      }
      return user[data];
    }

    // Otherwise return the whole user object
    return user;
  },
);
