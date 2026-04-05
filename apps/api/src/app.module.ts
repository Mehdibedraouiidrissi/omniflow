import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { UsersModule } from './users/users.module';
import { CrmModule } from './crm/crm.module';
import { PipelinesModule } from './pipelines/pipelines.module';
import { ConversationsModule } from './conversations/conversations.module';
import { FormsModule } from './forms/forms.module';
import { CalendarsModule } from './calendars/calendars.module';
import { WorkflowsModule } from './workflows/workflows.module';
import { PaymentsModule } from './payments/payments.module';
import { MembershipsModule } from './memberships/memberships.module';
import { FunnelsModule } from './funnels/funnels.module';
import { SocialModule } from './social/social.module';
import { ReportingModule } from './reporting/reporting.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { AdminModule } from './admin/admin.module';
import { ReputationModule } from './reputation/reputation.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { SocketModule } from './socket/socket.module';
import { FilesModule } from './files/files.module';
import { HealthController } from './health/health.controller';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { TenantGuard } from './common/guards/tenant.guard';
import { TenantResolverMiddleware } from './common/middleware/tenant-resolver.middleware';
import { CommonServicesModule } from './common/services/common-services.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisPassword = configService.get<string>('REDIS_PASSWORD');
        const redisConfig: Record<string, unknown> = {
          host: configService.get<string>('REDIS_HOST', 'localhost'),
          port: configService.get<number>('REDIS_PORT', 6379),
        };
        if (redisPassword) {
          redisConfig.password = redisPassword;
        }
        return { redis: redisConfig } as any;
      },
      inject: [ConfigService],
    }),
    PrismaModule,
    CommonServicesModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    CrmModule,
    PipelinesModule,
    ConversationsModule,
    FormsModule,
    CalendarsModule,
    WorkflowsModule,
    PaymentsModule,
    MembershipsModule,
    FunnelsModule,
    SocialModule,
    ReportingModule,
    IntegrationsModule,
    AdminModule,
    ReputationModule,
    WebhooksModule,
    NotificationsModule,
    SocketModule,
    FilesModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PermissionsGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantResolverMiddleware).forRoutes('*');
  }
}
