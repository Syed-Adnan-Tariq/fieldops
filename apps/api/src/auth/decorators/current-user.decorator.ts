import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@fieldops/shared';

export interface CurrentUserData {
  id: string;
  email: string;
  role: UserRole;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserData => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserData }>();
    return request.user;
  },
);
