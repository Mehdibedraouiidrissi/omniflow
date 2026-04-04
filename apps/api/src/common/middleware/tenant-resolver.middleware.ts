import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantSlug?: string;
    }
  }
}

@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  constructor(private prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Priority 1: X-Tenant-ID header (direct tenant ID)
    const headerTenantId = req.headers['x-tenant-id'] as string;
    if (headerTenantId) {
      req.tenantId = headerTenantId;
      return next();
    }

    // Priority 2: Resolve from subdomain
    const host = req.headers.host;
    if (host) {
      const subdomain = this.extractSubdomain(host);
      if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
        const tenant = await this.prisma.tenant.findFirst({
          where: {
            OR: [{ slug: subdomain }, { customDomain: host }],
            deletedAt: null,
          },
          select: { id: true, slug: true, status: true },
        });

        if (tenant && tenant.status !== 'CANCELLED' && tenant.status !== 'SUSPENDED') {
          req.tenantId = tenant.id;
          req.tenantSlug = tenant.slug;
        }
      }
    }

    next();
  }

  private extractSubdomain(host: string): string | null {
    // Remove port
    const hostname = host.split(':')[0];
    if (!hostname) return null;

    const parts = hostname.split('.');
    // e.g., tenant.omniflow.com => 3 parts, subdomain = tenant
    if (parts.length >= 3) {
      return parts[0] || null;
    }

    return null;
  }
}
