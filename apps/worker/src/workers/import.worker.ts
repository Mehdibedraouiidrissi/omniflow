// ============================================================================
// Omniflow Worker - CSV Import Processor
// Queue: 'imports'
// ============================================================================

import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import { createChildLogger } from '../logger';
import { config } from '../config';

const log = createChildLogger('import-worker');

// ---------------------------------------------------------------------------
// Job data interface
// ---------------------------------------------------------------------------

export interface ImportJobData {
  tenantId: string;
  fileUrl: string;
  mapping: Record<string, string>; // CSV column -> Contact field
  userId: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BATCH_SIZE = 100;

// ---------------------------------------------------------------------------
// Worker factory
// ---------------------------------------------------------------------------

export function createImportWorker(
  prisma: PrismaClient,
  connection: { host: string; port: number; password?: string },
) {
  const worker = new Worker<ImportJobData>(
    'imports',
    async (job: Job<ImportJobData>) => {
      const { tenantId, fileUrl, mapping, userId } = job.data;

      log.info({ jobId: job.id, fileUrl, tenantId }, 'Processing CSV import');

      // ---- Download the CSV file ----
      let csvContent: string;
      try {
        const response = await fetch(fileUrl);
        if (!response.ok) {
          throw new Error(`Failed to download file: ${response.status}`);
        }
        csvContent = await response.text();
      } catch (err) {
        log.error({ fileUrl, error: (err as Error).message }, 'Failed to download CSV file');
        throw err;
      }

      // ---- Parse CSV ----
      const rows = parseCsv(csvContent);

      if (rows.length === 0) {
        log.warn({ fileUrl }, 'CSV file is empty');
        return { status: 'completed', processed: 0, failed: 0, total: 0 };
      }

      const headers = rows[0];
      const dataRows = rows.slice(1);
      const total = dataRows.length;
      let processed = 0;
      let failed = 0;
      let created = 0;
      let updated = 0;

      log.info({ total, columns: headers.length }, 'CSV parsed, starting import');

      // ---- Process in batches ----
      for (let i = 0; i < dataRows.length; i += BATCH_SIZE) {
        const batch = dataRows.slice(i, i + BATCH_SIZE);
        const batchResults = await processBatch(prisma, tenantId, headers, batch, mapping);

        processed += batchResults.processed;
        failed += batchResults.failed;
        created += batchResults.created;
        updated += batchResults.updated;

        // ---- Update job progress ----
        const progress = Math.round(((i + batch.length) / total) * 100);
        await job.updateProgress(progress);

        log.info(
          {
            progress: `${progress}%`,
            processed,
            failed,
            total,
            batchIndex: Math.floor(i / BATCH_SIZE),
          },
          'Import batch processed',
        );
      }

      // ---- Create notification for the user who triggered the import ----
      await prisma.notification.create({
        data: {
          tenantId,
          userId,
          type: 'import_complete',
          title: 'CSV Import Complete',
          body: `Imported ${created} new contacts, updated ${updated}, ${failed} failed out of ${total} total rows.`,
          data: { total, created, updated, failed },
        },
      });

      log.info({ total, processed, created, updated, failed }, 'CSV import completed');

      return { status: 'completed', total, processed, created, updated, failed };
    },
    {
      connection,
      concurrency: 2, // Limit concurrent imports
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 200 },
    },
  );

  worker.on('failed', (job, error) => {
    log.error(
      { jobId: job?.id, error: error.message },
      'Import job failed',
    );
  });

  worker.on('error', (error) => {
    log.error({ error: error.message }, 'Import worker error');
  });

  return worker;
}

// ---------------------------------------------------------------------------
// CSV Parser (simple, handles quoted fields)
// ---------------------------------------------------------------------------

function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    if (line.trim() === '') continue;

    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (inQuotes) {
        if (char === '"' && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else if (char === '"') {
          inQuotes = false;
        } else {
          current += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === ',') {
          fields.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
    }

    fields.push(current.trim());
    rows.push(fields);
  }

  return rows;
}

// ---------------------------------------------------------------------------
// Batch processor
// ---------------------------------------------------------------------------

async function processBatch(
  prisma: PrismaClient,
  tenantId: string,
  headers: string[],
  rows: string[][],
  mapping: Record<string, string>,
): Promise<{ processed: number; failed: number; created: number; updated: number }> {
  let processed = 0;
  let failed = 0;
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    try {
      const contactData: Record<string, string> = {};

      // Map CSV columns to contact fields
      for (const [csvColumn, contactField] of Object.entries(mapping)) {
        const colIndex = headers.indexOf(csvColumn);
        if (colIndex >= 0 && colIndex < row.length) {
          contactData[contactField] = row[colIndex];
        }
      }

      // Skip rows without email (primary identifier)
      const email = contactData.email;
      if (!email) {
        failed++;
        continue;
      }

      // Upsert contact
      const existing = await prisma.contact.findFirst({
        where: { tenantId, email },
      });

      const data = {
        firstName: contactData.firstName || undefined,
        lastName: contactData.lastName || undefined,
        phone: contactData.phone || undefined,
        companyName: contactData.companyName || undefined,
        website: contactData.website || undefined,
        address: contactData.address || undefined,
        city: contactData.city || undefined,
        state: contactData.state || undefined,
        country: contactData.country || undefined,
        postalCode: contactData.postalCode || undefined,
        timezone: contactData.timezone || undefined,
        source: contactData.source || 'csv_import',
      };

      if (existing) {
        // Update existing contact (only non-empty fields)
        const updateData: Record<string, string> = {};
        for (const [key, value] of Object.entries(data)) {
          if (value !== undefined && value !== '') {
            updateData[key] = value;
          }
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.contact.update({
            where: { id: existing.id },
            data: updateData,
          });
        }
        updated++;
      } else {
        // Create new contact
        await prisma.contact.create({
          data: {
            tenantId,
            email,
            ...data,
            source: data.source || 'csv_import',
          },
        });
        created++;
      }

      processed++;
    } catch (err) {
      failed++;
      log.debug({ error: (err as Error).message }, 'Failed to import row');
    }
  }

  return { processed, failed, created, updated };
}
