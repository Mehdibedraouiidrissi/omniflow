import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// eslint-disable-next-line @typescript-eslint/no-var-requires
let twilioClient: any = null;
try {
  // Dynamic import to avoid hard failure if twilio is not installed
  twilioClient = require('twilio');
} catch {
  // Twilio not available
}

export interface SendSmsOptions {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SmsResult {
  sid: string;
  status: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private client: any = null;
  private readonly defaultFrom: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.defaultFrom = this.configService.get<string>('TWILIO_PHONE_NUMBER', '');

    if (accountSid && accountSid.startsWith('AC') && authToken && twilioClient) {
      this.client = twilioClient(accountSid, authToken);
      this.logger.log('Twilio SMS client initialized');
    } else {
      this.logger.warn('Twilio credentials not configured - SMS sending disabled');
    }
  }

  async sendSms(options: SendSmsOptions): Promise<SmsResult> {
    if (!this.client) {
      this.logger.warn(`SMS not sent (Twilio not configured): ${options.to}`);
      return { sid: 'mock-sid', status: 'skipped' };
    }

    const message = await this.client.messages.create({
      to: options.to,
      from: options.from || this.defaultFrom,
      body: options.body,
      mediaUrl: options.mediaUrl,
    });

    this.logger.log(`SMS sent to ${options.to}: ${message.sid}`);

    return {
      sid: message.sid,
      status: message.status,
    };
  }

  async sendVerificationSms(phone: string, code: string): Promise<SmsResult> {
    return this.sendSms({
      to: phone,
      body: `Your Omniflow verification code is: ${code}. Valid for 10 minutes.`,
    });
  }
}
