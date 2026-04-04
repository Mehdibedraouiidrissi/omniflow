// ============================================================================
// Omniflow Worker - Appointment Reminder Worker
// Queue: 'reminders'
// ============================================================================

import { Worker, Job, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import dayjs from 'dayjs';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('reminder-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface ReminderJobData {
  tenantId: string;
  appointmentId: string;
  reminderType: 'email' | 'sms' | 'both';
}

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createReminderWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const emailQueue = new Queue('email', { connection });
  const smsQueue = new Queue('sms', { connection });

  const worker = new Worker<ReminderJobData>(
    'reminders',
    async (job: Job<ReminderJobData>) => {
      const { tenantId, appointmentId, reminderType } = job.data;

      log.info({ jobId: job.id, appointmentId, reminderType, tenantId }, 'Processing reminder');

      // ---- Load appointment with contact and meeting type ----
      const appointment = await prisma.appointment.findFirst({
        where: { id: appointmentId, tenantId },
        include: {
          contact: true,
          meetingType: true,
          calendar: true,
        },
      });

      if (!appointment) {
        log.warn({ appointmentId }, 'Appointment not found');
        return { status: 'skipped', reason: 'appointment_not_found' };
      }

      // Skip reminders for cancelled or completed appointments
      if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
        log.info(
          { appointmentId, status: appointment.status },
          'Skipping reminder for non-active appointment',
        );
        return { status: 'skipped', reason: `appointment_${appointment.status.toLowerCase()}` };
      }

      // Skip if appointment has already passed
      if (dayjs(appointment.startTime).isBefore(dayjs())) {
        log.info({ appointmentId }, 'Skipping reminder for past appointment');
        return { status: 'skipped', reason: 'appointment_past' };
      }

      const contact = appointment.contact;
      const startTimeFormatted = dayjs(appointment.startTime).format('MMMM D, YYYY [at] h:mm A');
      const results: { channel: string; status: string }[] = [];

      // ---- Send email reminder ----
      if ((reminderType === 'email' || reminderType === 'both') && contact.email) {
        await emailQueue.add('appointment-reminder', {
          tenantId,
          to: contact.email,
          subject: `Reminder: ${appointment.title} - ${startTimeFormatted}`,
          html: buildReminderEmailHtml(appointment, contact, startTimeFormatted),
          text: buildReminderEmailText(appointment, contact, startTimeFormatted),
          variables: {
            contactFirstName: contact.firstName,
            contactLastName: contact.lastName,
            appointmentTitle: appointment.title,
            appointmentTime: startTimeFormatted,
            appointmentLocation: appointment.location || appointment.meetingUrl || 'TBD',
            meetingTypeName: appointment.meetingType.name,
            calendarName: appointment.calendar.name,
          },
        }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        });

        results.push({ channel: 'email', status: 'queued' });
        log.info({ appointmentId, to: contact.email }, 'Reminder email queued');
      }

      // ---- Send SMS reminder ----
      if ((reminderType === 'sms' || reminderType === 'both') && contact.phone) {
        const smsBody = [
          `Reminder: ${appointment.title}`,
          `When: ${startTimeFormatted}`,
          appointment.location ? `Where: ${appointment.location}` : '',
          appointment.meetingUrl ? `Join: ${appointment.meetingUrl}` : '',
        ]
          .filter(Boolean)
          .join('\n');

        await smsQueue.add('appointment-reminder', {
          tenantId,
          to: contact.phone,
          body: smsBody,
        }, {
          attempts: 2,
          backoff: { type: 'exponential', delay: 5000 },
        });

        results.push({ channel: 'sms', status: 'queued' });
        log.info({ appointmentId, to: contact.phone }, 'Reminder SMS queued');
      }

      return { status: 'sent', results };
    },
    {
      connection,
      concurrency: config.workerConcurrency,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 1000 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message },
      'Reminder job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Reminder worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// HTML / Text builders
// ---------------------------------------------------------------------------

function buildReminderEmailHtml(
  appointment: any,
  contact: any,
  startTimeFormatted: string,
): string {
  const location = appointment.location || appointment.meetingUrl || '';
  const locationHtml = appointment.meetingUrl
    ? `<a href="${appointment.meetingUrl}" style="color: #4F46E5;">${appointment.meetingUrl}</a>`
    : location;

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #1F2937;">Appointment Reminder</h2>
      <p>Hi ${contact.firstName || 'there'},</p>
      <p>This is a friendly reminder about your upcoming appointment:</p>
      <div style="background: #F9FAFB; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="margin: 4px 0;"><strong>${appointment.title}</strong></p>
        <p style="margin: 4px 0; color: #6B7280;">${startTimeFormatted}</p>
        ${locationHtml ? `<p style="margin: 4px 0; color: #6B7280;">${locationHtml}</p>` : ''}
      </div>
      ${appointment.notes ? `<p style="color: #6B7280;">Notes: ${appointment.notes}</p>` : ''}
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px;">
        If you need to reschedule or cancel, please contact us.
      </p>
    </div>
  `;
}

function buildReminderEmailText(
  appointment: any,
  contact: any,
  startTimeFormatted: string,
): string {
  const lines = [
    `Hi ${contact.firstName || 'there'},`,
    '',
    'This is a reminder about your upcoming appointment:',
    '',
    `  ${appointment.title}`,
    `  ${startTimeFormatted}`,
  ];

  if (appointment.location) {
    lines.push(`  Location: ${appointment.location}`);
  }
  if (appointment.meetingUrl) {
    lines.push(`  Join: ${appointment.meetingUrl}`);
  }
  if (appointment.notes) {
    lines.push('', `Notes: ${appointment.notes}`);
  }

  lines.push('', 'If you need to reschedule or cancel, please contact us.');

  return lines.join('\n');
}
