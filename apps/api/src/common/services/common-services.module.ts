import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { SmsService } from './sms.service';
import { StorageService } from './storage.service';
import { QueueService } from './queue.service';
import { CryptoService } from './crypto.service';
import { TemplateService } from './template.service';
import { AnalyticsService } from './analytics.service';
import { BillingService } from './billing.service';

@Global()
@Module({
  providers: [
    EmailService,
    SmsService,
    StorageService,
    QueueService,
    CryptoService,
    TemplateService,
    AnalyticsService,
    BillingService,
  ],
  exports: [
    EmailService,
    SmsService,
    StorageService,
    QueueService,
    CryptoService,
    TemplateService,
    AnalyticsService,
    BillingService,
  ],
})
export class CommonServicesModule {}
