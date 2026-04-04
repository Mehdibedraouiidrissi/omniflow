import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parsePagination, buildPaginatedResponse } from '../common/pipes/parse-pagination.pipe';

@Injectable()
export class CrmService {
  private readonly logger = new Logger(CrmService.name);

  constructor(private prisma: PrismaService) {}

  async createContact(
    tenantId: string,
    data: {
      email?: string;
      phone?: string;
      firstName?: string;
      lastName?: string;
      companyName?: string;
      source?: string;
      ownerId?: string;
      tags?: string[];
      customFields?: Record<string, unknown>;
    },
  ) {
    // Duplicate detection by email or phone
    if (data.email) {
      const existing = await this.prisma.contact.findFirst({
        where: { tenantId, email: data.email.toLowerCase(), deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Contact with email ${data.email} already exists`);
      }
    }

    if (data.phone) {
      const existing = await this.prisma.contact.findFirst({
        where: { tenantId, phone: data.phone, deletedAt: null },
      });
      if (existing) {
        throw new ConflictException(`Contact with phone ${data.phone} already exists`);
      }
    }

    const contact = await this.prisma.contact.create({
      data: {
        tenantId,
        email: data.email?.toLowerCase(),
        phone: data.phone,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        source: data.source,
        ownerId: data.ownerId,
        customFields: data.customFields || {},
      },
      include: {
        contactTags: { include: { tag: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    // Assign tags
    if (data.tags && data.tags.length > 0) {
      for (const tagName of data.tags) {
        const tag = await this.prisma.tag.upsert({
          where: { tenantId_name: { tenantId, name: tagName } },
          update: {},
          create: { tenantId, name: tagName },
        });

        await this.prisma.contactTag.create({
          data: { contactId: contact.id, tagId: tag.id, tenantId },
        });
      }
    }

    // Log activity
    await this.logActivity(tenantId, contact.id, null, 'CUSTOM', 'Contact created');

    return this.findContact(tenantId, contact.id);
  }

  async listContacts(tenantId: string, query: Record<string, string>) {
    const params = parsePagination(query);
    const where: Record<string, any> = { tenantId, deletedAt: null };

    if (params.search) {
      where.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { firstName: { contains: params.search, mode: 'insensitive' } },
        { lastName: { contains: params.search, mode: 'insensitive' } },
        { phone: { contains: params.search } },
        { companyName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (query.status) where.status = query.status as any;
    if (query.ownerId) where.ownerId = query.ownerId;
    if (query.source) where.source = query.source;

    if (query.tag) {
      where.contactTags = {
        some: { tag: { name: query.tag } },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.contact.findMany({
        where,
        skip: params.skip,
        take: params.limit,
        orderBy: { [params.sortBy]: params.sortOrder },
        include: {
          contactTags: { include: { tag: { select: { id: true, name: true, color: true } } } },
          owner: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { opportunities: true, conversations: true, tasks: true } },
        },
      }),
      this.prisma.contact.count({ where }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  async findContact(tenantId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
      include: {
        contactTags: { include: { tag: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        _count: {
          select: {
            opportunities: true,
            conversations: true,
            tasks: true,
            formSubmissions: true,
            appointments: true,
            orders: true,
          },
        },
      },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return contact;
  }

  async updateContact(
    tenantId: string,
    contactId: string,
    data: Partial<{
      email: string;
      phone: string;
      firstName: string;
      lastName: string;
      companyName: string;
      website: string;
      address: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
      timezone: string;
      source: string;
      ownerId: string;
      status: string;
      customFields: Record<string, unknown>;
    }>,
  ) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.contact.update({
      where: { id: contactId },
      data: {
        ...data,
        email: data.email?.toLowerCase(),
        lastActivityAt: new Date(),
      },
      include: {
        contactTags: { include: { tag: true } },
        owner: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });
  }

  async deleteContact(tenantId: string, contactId: string) {
    const contact = await this.prisma.contact.findFirst({
      where: { id: contactId, tenantId, deletedAt: null },
    });

    if (!contact) {
      throw new NotFoundException('Contact not found');
    }

    return this.prisma.contact.update({
      where: { id: contactId },
      data: { deletedAt: new Date() },
    });
  }

  // --- CSV Import ---

  async importContacts(tenantId: string, csvContent: string, mapping?: Record<string, string>) {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) return { imported: 0, skipped: 0, errors: [] };

    const headers = lines[0]!.split(',').map((h) => h.trim().toLowerCase());
    const fieldMap = mapping || this.autoMapColumns(headers);

    const results = { imported: 0, skipped: 0, errors: [] as string[] };

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCsvLine(lines[i]!);
      const contactData: Record<string, string> = {};

      headers.forEach((header, idx) => {
        const field = fieldMap[header];
        if (field && values[idx]) {
          contactData[field] = values[idx]!.trim();
        }
      });

      try {
        // Skip if no email and no phone
        if (!contactData.email && !contactData.phone) {
          results.skipped++;
          continue;
        }

        // Check for duplicates
        if (contactData.email) {
          const exists = await this.prisma.contact.findFirst({
            where: { tenantId, email: contactData.email.toLowerCase(), deletedAt: null },
          });
          if (exists) {
            results.skipped++;
            continue;
          }
        }

        await this.prisma.contact.create({
          data: {
            tenantId,
            email: contactData.email?.toLowerCase(),
            phone: contactData.phone,
            firstName: contactData.firstName,
            lastName: contactData.lastName,
            companyName: contactData.companyName,
            source: 'csv_import',
          },
        });
        results.imported++;
      } catch (error) {
        results.errors.push(`Row ${i + 1}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  // --- CSV Export ---

  async exportContacts(tenantId: string, filters?: Record<string, string>) {
    const where: Record<string, any> = { tenantId, deletedAt: null };
    if (filters?.status) where.status = filters.status;
    if (filters?.tag) where.contactTags = { some: { tag: { name: filters.tag } } };

    const contacts = await this.prisma.contact.findMany({
      where,
      include: {
        contactTags: { include: { tag: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const headers = ['email', 'phone', 'firstName', 'lastName', 'companyName', 'source', 'status', 'tags', 'createdAt'];
    const rows = contacts.map((c) => [
      c.email || '',
      c.phone || '',
      c.firstName || '',
      c.lastName || '',
      c.companyName || '',
      c.source || '',
      c.status,
      c.contactTags.map((ct) => ct.tag.name).join(';'),
      c.createdAt.toISOString(),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))].join('\n');
    return { csv, count: contacts.length };
  }

  // --- Activities ---

  async getActivities(tenantId: string, contactId: string, query: Record<string, string>) {
    const params = parsePagination(query);

    const [data, total] = await Promise.all([
      this.prisma.activity.findMany({
        where: { tenantId, contactId },
        skip: params.skip,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      this.prisma.activity.count({ where: { tenantId, contactId } }),
    ]);

    return buildPaginatedResponse(data, total, params);
  }

  // --- Merge Contacts ---

  async mergeContacts(tenantId: string, primaryId: string, secondaryIds: string[]) {
    const primary = await this.prisma.contact.findFirst({
      where: { id: primaryId, tenantId, deletedAt: null },
    });
    if (!primary) throw new NotFoundException('Primary contact not found');

    return this.prisma.$transaction(async (tx) => {
      for (const secondaryId of secondaryIds) {
        const secondary = await tx.contact.findFirst({
          where: { id: secondaryId, tenantId, deletedAt: null },
        });
        if (!secondary) continue;

        // Move conversations
        await tx.conversation.updateMany({
          where: { contactId: secondaryId, tenantId },
          data: { contactId: primaryId },
        });

        // Move opportunities
        await tx.opportunity.updateMany({
          where: { contactId: secondaryId, tenantId },
          data: { contactId: primaryId },
        });

        // Move notes
        await tx.contactNote.updateMany({
          where: { contactId: secondaryId, tenantId },
          data: { contactId: primaryId },
        });

        // Move tasks
        await tx.task.updateMany({
          where: { contactId: secondaryId, tenantId },
          data: { contactId: primaryId },
        });

        // Move activities
        await tx.activity.updateMany({
          where: { contactId: secondaryId, tenantId },
          data: { contactId: primaryId },
        });

        // Copy tags (skip duplicates)
        const secondaryTags = await tx.contactTag.findMany({
          where: { contactId: secondaryId },
        });
        for (const tag of secondaryTags) {
          const exists = await tx.contactTag.findFirst({
            where: { contactId: primaryId, tagId: tag.tagId },
          });
          if (!exists) {
            await tx.contactTag.create({
              data: { contactId: primaryId, tagId: tag.tagId, tenantId },
            });
          }
        }

        // Fill in empty fields on primary from secondary
        const updateData: Record<string, string> = {};
        if (!primary.phone && secondary.phone) updateData.phone = secondary.phone;
        if (!primary.firstName && secondary.firstName) updateData.firstName = secondary.firstName;
        if (!primary.lastName && secondary.lastName) updateData.lastName = secondary.lastName;
        if (!primary.companyName && secondary.companyName) updateData.companyName = secondary.companyName;

        if (Object.keys(updateData).length > 0) {
          await tx.contact.update({ where: { id: primaryId }, data: updateData });
        }

        // Soft-delete secondary
        await tx.contact.update({
          where: { id: secondaryId },
          data: { deletedAt: new Date() },
        });
      }

      return tx.contact.findFirst({
        where: { id: primaryId },
        include: {
          contactTags: { include: { tag: true } },
          owner: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      });
    });
  }

  // --- Bulk Actions ---

  async bulkAction(tenantId: string, action: string, contactIds: string[], data?: Record<string, string>) {
    const results = { processed: 0, failed: 0 };

    switch (action) {
      case 'delete':
        const deleteResult = await this.prisma.contact.updateMany({
          where: { id: { in: contactIds }, tenantId, deletedAt: null },
          data: { deletedAt: new Date() },
        });
        results.processed = deleteResult.count;
        break;

      case 'tag':
        if (!data?.tagName) break;
        const tag = await this.prisma.tag.upsert({
          where: { tenantId_name: { tenantId, name: data.tagName } },
          update: {},
          create: { tenantId, name: data.tagName },
        });
        for (const contactId of contactIds) {
          try {
            await this.prisma.contactTag.create({
              data: { contactId, tagId: tag.id, tenantId },
            });
            results.processed++;
          } catch {
            // Duplicate tag assignment, skip
            results.processed++;
          }
        }
        break;

      case 'assign':
        if (!data?.assigneeId) break;
        const assignResult = await this.prisma.contact.updateMany({
          where: { id: { in: contactIds }, tenantId, deletedAt: null },
          data: { ownerId: data.assigneeId },
        });
        results.processed = assignResult.count;
        break;
    }

    return results;
  }

  // --- Tags ---

  async listTags(tenantId: string) {
    return this.prisma.tag.findMany({
      where: { tenantId },
      include: {
        _count: { select: { contactTags: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createTag(tenantId: string, name: string, color?: string) {
    return this.prisma.tag.create({
      data: { tenantId, name, color },
    });
  }

  async updateTag(tenantId: string, tagId: string, data: { name?: string; color?: string }) {
    const tag = await this.prisma.tag.findFirst({ where: { id: tagId, tenantId } });
    if (!tag) throw new NotFoundException('Tag not found');

    return this.prisma.tag.update({
      where: { id: tagId },
      data,
    });
  }

  async deleteTag(tenantId: string, tagId: string) {
    const tag = await this.prisma.tag.findFirst({
      where: { id: tagId, tenantId },
    });

    if (!tag) {
      throw new NotFoundException('Tag not found');
    }

    await this.prisma.contactTag.deleteMany({ where: { tagId } });
    return this.prisma.tag.delete({ where: { id: tagId } });
  }

  async addTagToContact(tenantId: string, contactId: string, tagId: string) {
    return this.prisma.contactTag.create({
      data: { contactId, tagId, tenantId },
      include: { tag: true },
    });
  }

  async removeTagFromContact(contactId: string, tagId: string) {
    return this.prisma.contactTag.deleteMany({
      where: { contactId, tagId },
    });
  }

  // --- Custom Fields ---

  async listCustomFields(tenantId: string) {
    return this.prisma.customField.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createCustomField(
    tenantId: string,
    data: { name: string; label: string; entityType: string; fieldType: string; options?: string[]; required?: boolean },
  ) {
    return this.prisma.customField.create({
      data: {
        tenantId,
        entityType: data.entityType,
        name: data.name,
        label: data.label,
        fieldType: data.fieldType as any,
        options: data.options || [],
        required: data.required || false,
      },
    });
  }

  async updateCustomField(
    tenantId: string,
    fieldId: string,
    data: { label?: string; options?: string[]; required?: boolean },
  ) {
    const field = await this.prisma.customField.findFirst({ where: { id: fieldId, tenantId } });
    if (!field) throw new NotFoundException('Custom field not found');

    return this.prisma.customField.update({
      where: { id: fieldId },
      data,
    });
  }

  // --- Notes ---

  async addNote(tenantId: string, contactId: string, userId: string, content: string) {
    const note = await this.prisma.contactNote.create({
      data: {
        tenantId,
        contactId,
        userId,
        content,
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Log activity
    await this.logActivity(tenantId, contactId, userId, 'NOTE', 'Note added');

    return note;
  }

  async listNotes(tenantId: string, contactId: string) {
    return this.prisma.contactNote.findMany({
      where: { tenantId, contactId },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // --- Helpers ---

  private async logActivity(
    tenantId: string,
    contactId: string,
    userId: string | null,
    type: string,
    title: string,
    metadata?: Record<string, unknown>,
  ) {
    try {
      await this.prisma.activity.create({
        data: {
          tenantId,
          contactId,
          userId,
          type: type as any,
          title,
          metadata,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to log activity: ${error}`);
    }
  }

  private autoMapColumns(headers: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    const mappings: Record<string, string> = {
      email: 'email',
      'e-mail': 'email',
      phone: 'phone',
      'phone number': 'phone',
      'first name': 'firstName',
      'firstname': 'firstName',
      'first_name': 'firstName',
      'last name': 'lastName',
      'lastname': 'lastName',
      'last_name': 'lastName',
      company: 'companyName',
      'company name': 'companyName',
      'company_name': 'companyName',
      source: 'source',
    };

    for (const header of headers) {
      const mapped = mappings[header.toLowerCase()];
      if (mapped) map[header] = mapped;
    }

    return map;
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
