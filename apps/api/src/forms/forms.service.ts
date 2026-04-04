import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class FormsService {
  private readonly logger = new Logger(FormsService.name);

  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, data: {
    name: string;
    type?: string;
    fields?: Record<string, unknown>[];
    settings?: Record<string, unknown>;
  }) {
    return this.prisma.form.create({
      data: {
        tenantId,
        name: data.name,
        type: (data.type as any) || 'FORM',
        fields: data.fields || [],
        settings: data.settings || {},
        status: 'DRAFT',
      },
    });
  }

  async list(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, unknown> = { tenantId, deletedAt: null };

    if (query.status) where.status = query.status;
    if (query.type) where.type = query.type;
    if (params.search) {
      where.name = { contains: params.search, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.form.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: { _count: { select: { submissions: true } } },
      }),
      this.prisma.form.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findOne(tenantId: string, id: string) {
    const form = await this.prisma.form.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: { _count: { select: { submissions: true } } },
    });
    if (!form) throw new NotFoundException('Form not found');
    return form;
  }

  async update(tenantId: string, id: string, data: Record<string, unknown>) {
    const form = await this.prisma.form.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!form) throw new NotFoundException('Form not found');

    return this.prisma.form.update({ where: { id }, data });
  }

  async delete(tenantId: string, id: string) {
    const form = await this.prisma.form.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!form) throw new NotFoundException('Form not found');

    return this.prisma.form.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async publish(tenantId: string, id: string) {
    const form = await this.prisma.form.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!form) throw new NotFoundException('Form not found');

    return this.prisma.form.update({
      where: { id },
      data: { status: 'PUBLISHED' },
    });
  }

  async archive(tenantId: string, id: string) {
    const form = await this.prisma.form.findFirst({ where: { id, tenantId, deletedAt: null } });
    if (!form) throw new NotFoundException('Form not found');

    return this.prisma.form.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
  }

  async submitForm(
    tenantId: string,
    formId: string,
    data: Record<string, unknown>,
    contactId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const form = await this.prisma.form.findFirst({
      where: { id: formId, tenantId, status: 'PUBLISHED' },
    });
    if (!form) throw new NotFoundException('Form not found or not published');

    // Anti-spam: honeypot check
    if (data._honeypot) {
      throw new BadRequestException('Spam detected');
    }

    // Clean honeypot field from submitted data
    const cleanData = { ...data };
    delete cleanData._honeypot;

    const submission = await this.prisma.formSubmission.create({
      data: {
        tenantId,
        formId,
        contactId: contactId || null,
        data: cleanData,
        ipAddress,
        userAgent,
      },
    });

    // Increment submission count
    await this.prisma.form.update({
      where: { id: formId },
      data: { submissionCount: { increment: 1 } },
    });

    // If no contactId provided, try to create/link contact from form data
    if (!contactId && (cleanData.email || cleanData.phone)) {
      try {
        const email = cleanData.email as string;
        const phone = cleanData.phone as string;

        let contact = null;
        if (email) {
          contact = await this.prisma.contact.findFirst({
            where: { tenantId, email: email.toLowerCase(), deletedAt: null },
          });
        }

        if (!contact) {
          contact = await this.prisma.contact.create({
            data: {
              tenantId,
              email: email?.toLowerCase(),
              phone,
              firstName: cleanData.firstName as string,
              lastName: cleanData.lastName as string,
              source: 'form',
              sourceId: formId,
            },
          });
        }

        // Link submission to contact
        await this.prisma.formSubmission.update({
          where: { id: submission.id },
          data: { contactId: contact.id },
        });
      } catch (error) {
        this.logger.error(`Failed to create/link contact from form submission: ${error}`);
      }
    }

    return submission;
  }

  async listSubmissions(tenantId: string, formId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.formSubmission.findMany({
        where: { tenantId, formId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.formSubmission.count({ where: { tenantId, formId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async getSubmission(tenantId: string, formId: string, submissionId: string) {
    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, formId, tenantId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        form: { select: { id: true, name: true, fields: true } },
      },
    });
    if (!submission) throw new NotFoundException('Submission not found');
    return submission;
  }

  async getAnalytics(tenantId: string, formId: string) {
    const form = await this.prisma.form.findFirst({ where: { id: formId, tenantId, deletedAt: null } });
    if (!form) throw new NotFoundException('Form not found');

    const [totalSubmissions, last30Days, last7Days, today] = await Promise.all([
      this.prisma.formSubmission.count({ where: { formId, tenantId } }),
      this.prisma.formSubmission.count({
        where: {
          formId, tenantId,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.formSubmission.count({
        where: {
          formId, tenantId,
          createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),
      this.prisma.formSubmission.count({
        where: {
          formId, tenantId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      form: { id: form.id, name: form.name, status: form.status },
      totalSubmissions,
      last30Days,
      last7Days,
      today,
      averagePerDay: last30Days > 0 ? (last30Days / 30).toFixed(1) : '0',
    };
  }
}
