import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class BasicAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const header = request.headers['authorization'] || '';

    if (!header.startsWith('Basic ')) {
      throw new UnauthorizedException('Missing Basic auth');
    }

    const base64 = header.slice(6);
    let decoded = '';
    try {
      decoded = Buffer.from(base64, 'base64').toString('utf8');
    } catch {
      throw new UnauthorizedException('Invalid auth header');
    }

    const [user, pass] = decoded.split(':');
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

    if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
      return true;
    }

    throw new UnauthorizedException('Invalid credentials');
  }
}
