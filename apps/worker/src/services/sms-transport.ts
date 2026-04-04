// ============================================================================
// Omniflow Worker - SMS Transport (Twilio)
// ============================================================================

import { config } from '../config';
import { createChildLogger } from '../logger';

const log = createChildLogger('sms-transport');

export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SmsSendResult {
  sid: string;
  status: string;
}

let twilioClient: any = null;

/**
 * Get or lazily initialize the Twilio client.
 * Returns null if Twilio credentials are not configured.
 */
function getTwilioClient(): any {
  if (twilioClient !== null) return twilioClient;

  if (!config.twilioAccountSid || !config.twilioAuthToken) {
    log.warn('Twilio credentials not configured - SMS sending disabled');
    twilioClient = false; // sentinel to avoid re-checking
    return null;
  }

  try {
    // Dynamic require to avoid hard failure if twilio isn't installed
    const twilio = require('twilio');
    twilioClient = twilio(config.twilioAccountSid, config.twilioAuthToken);
    log.info('Twilio SMS client initialized');
    return twilioClient;
  } catch {
    log.warn('Twilio SDK not available - SMS sending disabled');
    twilioClient = false;
    return null;
  }
}

/**
 * Send an SMS message via Twilio.
 */
export async function sendSms(message: SmsMessage): Promise<SmsSendResult> {
  const client = getTwilioClient();

  if (!client) {
    log.warn({ to: message.to }, 'SMS skipped - Twilio not configured');
    return { sid: 'skipped', status: 'skipped' };
  }

  const createParams: Record<string, unknown> = {
    to: message.to,
    from: message.from || config.twilioPhoneNumber,
    body: message.body,
  };

  if (message.mediaUrl && message.mediaUrl.length > 0) {
    createParams.mediaUrl = message.mediaUrl;
  }

  if (config.twilioStatusCallbackUrl) {
    createParams.statusCallback = config.twilioStatusCallbackUrl;
  }

  const result = await client.messages.create(createParams);

  log.info(
    { sid: result.sid, to: message.to, status: result.status },
    'SMS sent successfully',
  );

  return {
    sid: result.sid,
    status: result.status,
  };
}
