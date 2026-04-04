import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as Handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  template?: string;
  context?: Record<string, unknown>;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  private readonly defaultFrom: string;
  private templateCache = new Map<string, Handlebars.TemplateDelegate>();

  constructor(private configService: ConfigService) {
    this.defaultFrom = this.configService.get<string>(
      'EMAIL_FROM',
      'Omniflow <noreply@omniflow.app>',
    );

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'localhost'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendEmail(options: SendEmailOptions): Promise<{ messageId: string }> {
    let htmlContent = options.html || '';

    if (options.template) {
      htmlContent = this.renderTemplate(options.template, options.context || {});
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: options.from || this.defaultFrom,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: htmlContent,
      text: options.text,
      replyTo: options.replyTo,
      attachments: options.attachments,
    };

    const result = await this.transporter.sendMail(mailOptions);
    this.logger.log(`Email sent to ${options.to}: ${result.messageId}`);

    return { messageId: result.messageId };
  }

  async sendVerificationEmail(email: string, token: string, name?: string): Promise<void> {
    const verifyUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/verify-email?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      template: 'verify-email',
      context: {
        name: name || 'there',
        verifyUrl,
        appName: 'Omniflow',
      },
    });
  }

  async sendPasswordResetEmail(email: string, token: string, name?: string): Promise<void> {
    const resetUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/reset-password?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      template: 'reset-password',
      context: {
        name: name || 'there',
        resetUrl,
        appName: 'Omniflow',
        expiresIn: '1 hour',
      },
    });
  }

  async sendInviteEmail(
    email: string,
    inviterName: string,
    tenantName: string,
    token: string,
  ): Promise<void> {
    const inviteUrl = `${this.configService.get('APP_URL', 'http://localhost:3000')}/auth/accept-invite?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: `You've been invited to join ${tenantName}`,
      template: 'invite',
      context: {
        inviterName,
        tenantName,
        inviteUrl,
        appName: 'Omniflow',
      },
    });
  }

  private renderTemplate(templateName: string, context: Record<string, unknown>): string {
    let compiledTemplate = this.templateCache.get(templateName);

    if (!compiledTemplate) {
      const templatePath = path.join(
        __dirname,
        '..',
        '..',
        'templates',
        'emails',
        `${templateName}.hbs`,
      );

      let source: string;
      try {
        source = fs.readFileSync(templatePath, 'utf-8');
      } catch {
        // Fallback to inline template if file not found
        source = this.getDefaultTemplate(templateName);
      }

      compiledTemplate = Handlebars.compile(source);
      this.templateCache.set(templateName, compiledTemplate);
    }

    return compiledTemplate(context);
  }

  private getDefaultTemplate(templateName: string): string {
    const templates: Record<string, string> = {
      'verify-email': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to {{appName}}!</h2>
          <p>Hi {{name}},</p>
          <p>Please verify your email address by clicking the button below:</p>
          <a href="{{verifyUrl}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Verify Email</a>
          <p style="margin-top: 20px; color: #666;">If you didn't create this account, you can safely ignore this email.</p>
        </div>`,
      'reset-password': `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi {{name}},</p>
          <p>We received a request to reset your password. Click the button below to set a new password:</p>
          <a href="{{resetUrl}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Reset Password</a>
          <p style="margin-top: 20px; color: #666;">This link expires in {{expiresIn}}. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>`,
      invite: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>You're invited!</h2>
          <p>{{inviterName}} has invited you to join <strong>{{tenantName}}</strong> on {{appName}}.</p>
          <a href="{{inviteUrl}}" style="display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px;">Accept Invitation</a>
          <p style="margin-top: 20px; color: #666;">If you don't know the person who sent this invitation, you can safely ignore this email.</p>
        </div>`,
    };

    return templates[templateName] || `<p>{{appName}} notification</p>`;
  }
}
