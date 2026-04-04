// =============================================================================
// CrmService Unit Tests
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CrmService } from '../../crm/crm.service';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockPrisma = {
  contact: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
  tag: {
    upsert: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  contactTag: {
    create: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    deleteMany: jest.fn(),
  },
  contactNote: {
    create: jest.fn(),
    findMany: jest.fn(),
  },
  activity: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  customField: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
  conversation: {
    updateMany: jest.fn(),
  },
  opportunity: {
    updateMany: jest.fn(),
  },
  task: {
    updateMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const TENANT_ID = 'tenant_test_1';
const USER_ID = 'user_test_1';

describe('CrmService', () => {
  let service: CrmService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CrmService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<CrmService>(CrmService);

    jest.clearAllMocks();
  });

  // =========================================================================
  // createContact - with tenant scoping
  // =========================================================================

  describe('createContact', () => {
    it('should create a contact scoped to the tenant', async () => {
      const contactData = {
        email: 'new@example.com',
        firstName: 'Alice',
        lastName: 'Johnson',
        phone: '+12025551234',
        companyName: 'Acme Corp',
        source: 'WEBSITE',
      };

      // No duplicate
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const createdContact = {
        id: 'contact_1',
        tenantId: TENANT_ID,
        ...contactData,
        email: 'new@example.com',
        customFields: {},
        contactTags: [],
        owner: null,
      };

      mockPrisma.contact.create.mockResolvedValue(createdContact);

      // Activity log
      mockPrisma.activity.create.mockResolvedValue({});

      // findContact called at the end
      mockPrisma.contact.findFirst
        .mockResolvedValueOnce(null) // email check
        .mockResolvedValueOnce(null) // phone check (if phone provided)
        .mockResolvedValueOnce(createdContact); // findContact at end

      const result = await service.createContact(TENANT_ID, contactData);

      expect(mockPrisma.contact.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            email: 'new@example.com',
            firstName: 'Alice',
            lastName: 'Johnson',
          }),
        }),
      );

      expect(result.tenantId).toBe(TENANT_ID);
    });

    it('should reject duplicate email within the same tenant', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'existing_contact',
        tenantId: TENANT_ID,
        email: 'dup@example.com',
      });

      await expect(
        service.createContact(TENANT_ID, { email: 'dup@example.com', firstName: 'Dup' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should reject duplicate phone within the same tenant', async () => {
      // Email check passes
      mockPrisma.contact.findFirst
        .mockResolvedValueOnce(null) // no email dup
        .mockResolvedValueOnce({    // phone dup exists
          id: 'existing_contact',
          tenantId: TENANT_ID,
          phone: '+12025551234',
        });

      await expect(
        service.createContact(TENANT_ID, {
          email: 'unique@example.com',
          phone: '+12025551234',
          firstName: 'PhoneDup',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should assign tags when provided', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const createdContact = {
        id: 'contact_tagged',
        tenantId: TENANT_ID,
        email: 'tagged@example.com',
        contactTags: [],
        owner: null,
        customFields: {},
      };

      mockPrisma.contact.create.mockResolvedValue(createdContact);
      mockPrisma.tag.upsert.mockResolvedValue({ id: 'tag_1', name: 'Hot Lead' });
      mockPrisma.contactTag.create.mockResolvedValue({});
      mockPrisma.activity.create.mockResolvedValue({});

      // findContact at the end
      mockPrisma.contact.findFirst
        .mockResolvedValueOnce(null) // initial dup check
        .mockResolvedValueOnce({ ...createdContact, contactTags: [{ tag: { name: 'Hot Lead' } }] });

      await service.createContact(TENANT_ID, {
        email: 'tagged@example.com',
        firstName: 'Tagged',
        tags: ['Hot Lead'],
      });

      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_name: { tenantId: TENANT_ID, name: 'Hot Lead' } },
        }),
      );
      expect(mockPrisma.contactTag.create).toHaveBeenCalled();
    });
  });

  // =========================================================================
  // listContacts - search/filter
  // =========================================================================

  describe('listContacts', () => {
    it('should return paginated contacts for the tenant', async () => {
      const contacts = [
        { id: 'c1', email: 'a@test.com', firstName: 'Alice', tenantId: TENANT_ID, contactTags: [], owner: null, _count: {} },
        { id: 'c2', email: 'b@test.com', firstName: 'Bob', tenantId: TENANT_ID, contactTags: [], owner: null, _count: {} },
      ];

      mockPrisma.contact.findMany.mockResolvedValue(contacts);
      mockPrisma.contact.count.mockResolvedValue(2);

      const result = await service.listContacts(TENANT_ID, {});

      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: TENANT_ID, deletedAt: null }),
        }),
      );
    });

    it('should filter by search term across name, email, phone', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([
        { id: 'c1', firstName: 'Alice', email: 'alice@test.com', tenantId: TENANT_ID, contactTags: [], owner: null, _count: {} },
      ]);
      mockPrisma.contact.count.mockResolvedValue(1);

      const result = await service.listContacts(TENANT_ID, { search: 'alice' });

      expect(result.data).toHaveLength(1);
      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: { contains: 'alice', mode: 'insensitive' } }),
              expect.objectContaining({ firstName: { contains: 'alice', mode: 'insensitive' } }),
            ]),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.listContacts(TENANT_ID, { status: 'ACTIVE' });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'ACTIVE' }),
        }),
      );
    });

    it('should filter by tag', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.listContacts(TENANT_ID, { tag: 'VIP' });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contactTags: { some: { tag: { name: 'VIP' } } },
          }),
        }),
      );
    });

    it('should filter by owner', async () => {
      mockPrisma.contact.findMany.mockResolvedValue([]);
      mockPrisma.contact.count.mockResolvedValue(0);

      await service.listContacts(TENANT_ID, { ownerId: 'owner_1' });

      expect(mockPrisma.contact.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ ownerId: 'owner_1' }),
        }),
      );
    });
  });

  // =========================================================================
  // findContact
  // =========================================================================

  describe('findContact', () => {
    it('should return a contact when found', async () => {
      const contact = {
        id: 'c1',
        tenantId: TENANT_ID,
        email: 'found@test.com',
        contactTags: [],
        owner: null,
        _count: { opportunities: 2, conversations: 1, tasks: 0, formSubmissions: 0, appointments: 0, orders: 0 },
      };

      mockPrisma.contact.findFirst.mockResolvedValue(contact);

      const result = await service.findContact(TENANT_ID, 'c1');

      expect(result.id).toBe('c1');
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1', tenantId: TENANT_ID, deletedAt: null },
        }),
      );
    });

    it('should throw NotFoundException when contact does not exist', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.findContact(TENANT_ID, 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // Duplicate Detection (additional coverage)
  // =========================================================================

  describe('duplicate detection', () => {
    it('should detect email-based duplicates across contacts in tenant', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'existing',
        tenantId: TENANT_ID,
        email: 'duplicate@test.com',
        deletedAt: null,
      });

      await expect(
        service.createContact(TENANT_ID, { email: 'DUPLICATE@TEST.COM', firstName: 'Test' }),
      ).rejects.toThrow(ConflictException);

      // Should check with lowercased email
      expect(mockPrisma.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            email: 'duplicate@test.com',
            deletedAt: null,
          }),
        }),
      );
    });

    it('should allow same email in different tenants', async () => {
      // For TENANT_ID, no duplicate
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      const created = {
        id: 'new_contact',
        tenantId: TENANT_ID,
        email: 'shared@example.com',
        contactTags: [],
        owner: null,
        customFields: {},
      };
      mockPrisma.contact.create.mockResolvedValue(created);
      mockPrisma.activity.create.mockResolvedValue({});
      mockPrisma.contact.findFirst
        .mockResolvedValueOnce(null) // dup check
        .mockResolvedValueOnce(created); // findContact

      const result = await service.createContact(TENANT_ID, {
        email: 'shared@example.com',
        firstName: 'Shared',
      });

      expect(result.email).toBe('shared@example.com');
    });
  });

  // =========================================================================
  // Bulk Operations
  // =========================================================================

  describe('bulkAction', () => {
    it('should bulk delete contacts', async () => {
      mockPrisma.contact.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkAction(TENANT_ID, 'delete', ['c1', 'c2', 'c3']);

      expect(result.processed).toBe(3);
      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['c1', 'c2', 'c3'] }, tenantId: TENANT_ID, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('should bulk tag contacts', async () => {
      mockPrisma.tag.upsert.mockResolvedValue({ id: 'tag_1', name: 'VIP' });
      mockPrisma.contactTag.create.mockResolvedValue({});

      const result = await service.bulkAction(
        TENANT_ID,
        'tag',
        ['c1', 'c2'],
        { tagName: 'VIP' },
      );

      expect(result.processed).toBe(2);
      expect(mockPrisma.tag.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId_name: { tenantId: TENANT_ID, name: 'VIP' } },
        }),
      );
    });

    it('should bulk assign contacts to an owner', async () => {
      mockPrisma.contact.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkAction(
        TENANT_ID,
        'assign',
        ['c1', 'c2'],
        { assigneeId: 'user_1' },
      );

      expect(result.processed).toBe(2);
      expect(mockPrisma.contact.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { ownerId: 'user_1' },
        }),
      );
    });

    it('should handle empty action gracefully', async () => {
      const result = await service.bulkAction(TENANT_ID, 'unknown', ['c1']);
      expect(result.processed).toBe(0);
    });
  });

  // =========================================================================
  // updateContact
  // =========================================================================

  describe('updateContact', () => {
    it('should update contact fields', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c1',
        tenantId: TENANT_ID,
        deletedAt: null,
      });

      mockPrisma.contact.update.mockResolvedValue({
        id: 'c1',
        tenantId: TENANT_ID,
        companyName: 'Updated Corp',
        city: 'NYC',
        contactTags: [],
        owner: null,
      });

      const result = await service.updateContact(TENANT_ID, 'c1', {
        companyName: 'Updated Corp',
        city: 'NYC',
      });

      expect(result.companyName).toBe('Updated Corp');
      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: expect.objectContaining({
            companyName: 'Updated Corp',
            city: 'NYC',
            lastActivityAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(
        service.updateContact(TENANT_ID, 'nonexistent', { firstName: 'New' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // =========================================================================
  // deleteContact
  // =========================================================================

  describe('deleteContact', () => {
    it('should soft-delete a contact', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue({
        id: 'c1',
        tenantId: TENANT_ID,
        deletedAt: null,
      });

      mockPrisma.contact.update.mockResolvedValue({
        id: 'c1',
        deletedAt: new Date(),
      });

      const result = await service.deleteContact(TENANT_ID, 'c1');

      expect(result.deletedAt).toBeDefined();
      expect(mockPrisma.contact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: { deletedAt: expect.any(Date) },
        }),
      );
    });

    it('should throw NotFoundException if contact not found', async () => {
      mockPrisma.contact.findFirst.mockResolvedValue(null);

      await expect(service.deleteContact(TENANT_ID, 'ghost')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // =========================================================================
  // Tags
  // =========================================================================

  describe('tags', () => {
    it('should list tags for a tenant', async () => {
      mockPrisma.tag.findMany.mockResolvedValue([
        { id: 't1', name: 'VIP', tenantId: TENANT_ID, _count: { contactTags: 5 } },
        { id: 't2', name: 'Hot Lead', tenantId: TENANT_ID, _count: { contactTags: 12 } },
      ]);

      const result = await service.listTags(TENANT_ID);

      expect(result).toHaveLength(2);
      expect(mockPrisma.tag.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: TENANT_ID },
        }),
      );
    });

    it('should create a new tag', async () => {
      mockPrisma.tag.create.mockResolvedValue({
        id: 'new_tag',
        tenantId: TENANT_ID,
        name: 'New Tag',
        color: '#ff0000',
      });

      const result = await service.createTag(TENANT_ID, 'New Tag', '#ff0000');

      expect(result.name).toBe('New Tag');
    });
  });

  // =========================================================================
  // Notes
  // =========================================================================

  describe('notes', () => {
    it('should add a note to a contact', async () => {
      mockPrisma.contactNote.create.mockResolvedValue({
        id: 'note_1',
        tenantId: TENANT_ID,
        contactId: 'c1',
        userId: USER_ID,
        content: 'Test note content',
        user: { id: USER_ID, firstName: 'Test', lastName: 'User' },
      });
      mockPrisma.activity.create.mockResolvedValue({});

      const result = await service.addNote(TENANT_ID, 'c1', USER_ID, 'Test note content');

      expect(result.content).toBe('Test note content');
      expect(mockPrisma.contactNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            contactId: 'c1',
            userId: USER_ID,
            content: 'Test note content',
          }),
        }),
      );
    });
  });
});
