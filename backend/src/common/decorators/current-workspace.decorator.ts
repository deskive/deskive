import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface WorkspaceContext {
  id: string;
  membershipRole: string;
  permissions: string[];
}

export const CurrentWorkspace = createParamDecorator(
  (data: keyof WorkspaceContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const workspace = request.workspace;

    if (!workspace) {
      return null;
    }

    return data ? workspace[data] : workspace;
  },
);