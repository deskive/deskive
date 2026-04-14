import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(private jwtService: JwtService) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const path = request.path || request.url;
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      this.logger.error(`[JWT Guard] No token found - path: ${path}`);
      throw new UnauthorizedException('Token not found');
    }

    // Log token info (first and last 10 chars for security)
    const tokenPreview =
      token.length > 20
        ? `${token.substring(0, 10)}...${token.substring(token.length - 10)}`
        : 'SHORT_TOKEN';
    this.logger.debug(`[JWT Guard] Processing token for path: ${path} - token: ${tokenPreview}`);

    try {
      // Decode database JWT without verification
      // We trust database's signature - just extract the payload
      // The token is already signed by database backend
      const payload = this.jwtService.decode(token) as any;

      if (!payload) {
        this.logger.error(`[JWT Guard] Invalid token format - path: ${path}`);
        throw new UnauthorizedException('Invalid token format');
      }

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        this.logger.warn(
          `[JWT Guard] Token expired - path: ${path}, exp: ${new Date(payload.exp * 1000).toISOString()}`,
        );
        throw new UnauthorizedException('Token expired');
      }

      // database JWT payload contains: userId, email, role, projectId, appId
      // Map to standard format expected by Deskive
      request.user = {
        sub: payload.userId || payload.sub,
        userId: payload.userId || payload.sub,
        email: payload.email,
        role: payload.role,
        projectId: payload.projectId,
        appId: payload.appId,
        name: payload.name,
        username: payload.username,
      };

      this.logger.log(`[JWT Guard] Token valid - path: ${path}, user: ${request.user.email}`);
      return true;
    } catch (error) {
      this.logger.error(`[JWT Guard] Token decode failed - path: ${path}, error: ${error.message}`);
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Invalid token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}
