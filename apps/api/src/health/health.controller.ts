import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private redis: Redis | null = null;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const redisHost = this.configService.get<string>('REDIS_HOST');
    if (redisHost) {
      const redisConfig: Record<string, any> = {
        host: redisHost,
        port: this.configService.get<number>('REDIS_PORT', 6379),
        lazyConnect: true,
        maxRetriesPerRequest: 1,
      };
      const redisPassword = this.configService.get<string>('REDIS_PASSWORD');
      if (redisPassword) {
        redisConfig.password = redisPassword;
      }
      this.redis = new Redis(redisConfig);
    }
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is healthy' })
  @ApiResponse({ status: 503, description: 'Service is unhealthy' })
  async check() {
    const health: Record<string, unknown> = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: this.configService.get<string>('NODE_ENV', 'development'),
      checks: {} as Record<string, unknown>,
    };

    const checks = health.checks as Record<string, unknown>;

    // Database check
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'up' };
    } catch (err) {
      checks.database = {
        status: 'down',
        error: err instanceof Error ? err.message : 'Unknown error',
      };
      health.status = 'degraded';
    }

    // Redis check
    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = { status: 'up' };
      } catch (err) {
        checks.redis = {
          status: 'down',
          error: err instanceof Error ? err.message : 'Unknown error',
        };
        health.status = 'degraded';
      }
    } else {
      checks.redis = { status: 'not_configured' };
    }

    // Memory usage
    const memUsage = process.memoryUsage();
    checks.memory = {
      heapUsedMB: Math.round(memUsage.heapUsed / 1024 / 1024),
      heapTotalMB: Math.round(memUsage.heapTotal / 1024 / 1024),
      rssMB: Math.round(memUsage.rss / 1024 / 1024),
    };

    return health;
  }
}
