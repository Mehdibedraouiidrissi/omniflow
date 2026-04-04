// ============================================================================
// Omniflow Worker - Email Transport (SES via Nodemailer)
// ============================================================================

import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config';
import { createChildLogger } from '../logger';

const log = createChildLogger('email-transport');

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailSendResult {
  messageId: string;
  accepted: string[];
  rejected: string[];
}

let transporter: Transporter | null = null;

/**
 * Get or lazily create the Nodemailer transporter.
 * Uses SES SMTP interface when SMTP_HOST is configured.
 */
function getTransporter(): Transporter {
  if (transporter) return transporter;

  transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpSecure,
    auth:
      config.smtpUser && config.smtpPass
        ? {
            user: config.smtpUser,
            pass: config.smtpPass,
          }
        : undefined,
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
  });

  log.info(
    { host: config.smtpHost, port: config.smtpPort },
    'Email transporter initialized',
  );

  return transporter;
}

/**
 * Send an email through the configured SES/SMTP transport.
 */
export async function sendEmail(message: EmailMessage): Promise<EmailSendResult> {
  const transport = getTransporter();
  const defaultFrom = `${config.emailFromName} <${config.emailFrom}>`;

  const result = await transport.sendMail({
    from: message.from || defaultFrom,
    to: message.to,
    subject: message.subject,
    html: message.html,
    text: message.text,
    replyTo: message.replyTo,
    attachments: message.attachments,
  });

  log.info(
    { messageId: result.messageId, to: message.to },
    'Email sent successfully',
  );

  return {
    messageId: result.messageId,
    accepted: Array.isArray(result.accepted)
      ? result.accepted.map(String)
      : [],
    rejected: Array.isArray(result.rejected)
      ? result.rejected.map(String)
      : [],
  };
}

/**
 * Close the transport pool. Called during graceful shutdown.
 */
export async function closeEmailTransport(): Promise<void> {
  if (transporter) {
    transporter.close();
    transporter = null;
    log.info('Email transporter closed');
  }
}
