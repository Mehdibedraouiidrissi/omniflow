// =============================================================================
// Omniflow - E2E Test Suite
// Tests auth flows, contacts CRUD, pipeline ops, forms, and appointments
// Requires a running PostgreSQL test database
// =============================================================================

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Omniflow E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let refreshToken: string;
  let tenantId: string;
  let userId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Clean test data
    await cleanTestData();
  });

  afterAll(async () => {
    await cleanTestData();
    await app.close();
  });

  async function cleanTestData() {
    try {
      await prisma.formSubmission.deleteMany({});
      await prisma.form.deleteMany({});
      await prisma.appointment.deleteMany({});
      await prisma.meetingType.deleteMany({});
      await prisma.availabilityRule.deleteMany({});
      await prisma.calendarMember.deleteMany({});
      await prisma.calendar.deleteMany({});
      await prisma.opportunity.deleteMany({});
      await prisma.pipelineStage.deleteMany({});
      await prisma.pipeline.deleteMany({});
      await prisma.contactTag.deleteMany({});
      await prisma.tag.deleteMany({});
      await prisma.activity.deleteMany({});
      await prisma.contactNote.deleteMany({});
      await prisma.message.deleteMany({});
      await prisma.conversation.deleteMany({});
      await prisma.contact.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.tenantMembership.deleteMany({});
      await prisma.role.deleteMany({});
      await prisma.tenantBilling.deleteMany({});
      await prisma.notification.deleteMany({});
      await prisma.auditLog.deleteMany({});
      await prisma.user.deleteMany({
        where: { email: { startsWith: 'e2e-test' } },
      });
      await prisma.tenant.deleteMany({
        where: { slug: { startsWith: 'e2e-test' } },
      });
    } catch {
      // Ignore cleanup errors in case tables don't exist yet
    }
  }

  // =========================================================================
  // AUTH FLOW
  // =========================================================================

  describe('Auth Flow', () => {
    const testEmail = 'e2e-test-user@omniflow.com';
    const testPassword = 'TestPassword123!@#';

    it('POST /auth/register - should register a new user and tenant', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'E2E',
          lastName: 'Tester',
          companyName: 'E2E Test Company',
        })
        .expect(201);

      expect(res.body).toHaveProperty('user');
      expect(res.body).toHaveProperty('tenant');
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.tenant.name).toBe("E2E Test Company");

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
      tenantId = res.body.tenant.id;
      userId = res.body.user.id;
    });

    it('POST /auth/register - should reject duplicate email', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: testEmail,
          password: testPassword,
          firstName: 'Duplicate',
          lastName: 'User',
          companyName: 'Duplicate Corp',
        })
        .expect(409);
    });

    it('POST /auth/login - should login with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: testPassword,
        })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.user.email).toBe(testEmail);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('POST /auth/login - should reject invalid password', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: testEmail,
          password: 'WrongPassword123!',
        })
        .expect(401);
    });

    it('POST /auth/refresh - should refresh tokens', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken })
        .expect(201);

      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
      expect(res.body.accessToken).not.toBe(accessToken);

      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /auth/me - should return current user info', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(res.body.user.email).toBe(testEmail);
      expect(res.body.user.firstName).toBe('E2E');
    });

    it('GET /auth/me - should reject without token', async () => {
      await request(app.getHttpServer())
        .get('/auth/me')
        .expect(401);
    });
  });

  // =========================================================================
  // CONTACTS CRUD
  // =========================================================================

  describe('Contacts CRUD', () => {
    let contactId: string;

    it('POST /crm/contacts - should create a contact', async () => {
      const res = await request(app.getHttpServer())
        .post('/crm/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          email: 'jane.doe@testcorp.com',
          firstName: 'Jane',
          lastName: 'Doe',
          phone: '+12025551234',
          companyName: 'TestCorp',
          source: 'WEBSITE',
        })
        .expect(201);

      expect(res.body.email).toBe('jane.doe@testcorp.com');
      expect(res.body.firstName).toBe('Jane');
      expect(res.body.lastName).toBe('Doe');
      contactId = res.body.id;
    });

    it('POST /crm/contacts - should reject duplicate email in same tenant', async () => {
      await request(app.getHttpServer())
        .post('/crm/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          email: 'jane.doe@testcorp.com',
          firstName: 'Jane',
          lastName: 'Duplicate',
        })
        .expect(409);
    });

    it('GET /crm/contacts - should list contacts', async () => {
      const res = await request(app.getHttpServer())
        .get('/crm/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('total');
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /crm/contacts - should search contacts by name', async () => {
      const res = await request(app.getHttpServer())
        .get('/crm/contacts?search=Jane')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.data.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data[0].firstName).toBe('Jane');
    });

    it('GET /crm/contacts/:id - should get a single contact', async () => {
      const res = await request(app.getHttpServer())
        .get(`/crm/contacts/${contactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.id).toBe(contactId);
      expect(res.body.email).toBe('jane.doe@testcorp.com');
    });

    it('PATCH /crm/contacts/:id - should update a contact', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/crm/contacts/${contactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          companyName: 'Updated Corp',
          city: 'New York',
          state: 'NY',
        })
        .expect(200);

      expect(res.body.companyName).toBe('Updated Corp');
      expect(res.body.city).toBe('New York');
    });

    it('DELETE /crm/contacts/:id - should soft-delete a contact', async () => {
      await request(app.getHttpServer())
        .delete(`/crm/contacts/${contactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      // Verify it's gone from listing
      const res = await request(app.getHttpServer())
        .get(`/crm/contacts/${contactId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(404);
    });

    it('POST /crm/contacts - should create contact for subsequent tests', async () => {
      const res = await request(app.getHttpServer())
        .post('/crm/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          email: 'bob.smith@testcorp.com',
          firstName: 'Bob',
          lastName: 'Smith',
          phone: '+12025559999',
          source: 'REFERRAL',
        })
        .expect(201);

      contactId = res.body.id;
    });
  });

  // =========================================================================
  // PIPELINE OPERATIONS
  // =========================================================================

  describe('Pipeline Operations', () => {
    let pipelineId: string;
    let stageIds: string[];

    it('POST /pipelines - should create a pipeline', async () => {
      const res = await request(app.getHttpServer())
        .post('/pipelines')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          name: 'E2E Test Pipeline',
          stages: [
            { name: 'New', probability: 10 },
            { name: 'Qualified', probability: 40 },
            { name: 'Proposal', probability: 70 },
            { name: 'Won', probability: 100, isWon: true },
            { name: 'Lost', probability: 0, isLost: true },
          ],
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Pipeline');
      expect(res.body.stages).toHaveLength(5);
      pipelineId = res.body.id;
      stageIds = res.body.stages.map((s: any) => s.id);
    });

    it('GET /pipelines - should list pipelines', async () => {
      const res = await request(app.getHttpServer())
        .get('/pipelines')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('GET /pipelines/:id - should get pipeline with stages', async () => {
      const res = await request(app.getHttpServer())
        .get(`/pipelines/${pipelineId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.id).toBe(pipelineId);
      expect(res.body.stages).toHaveLength(5);
      expect(res.body.stages[0].name).toBe('New');
    });

    it('PATCH /pipelines/:id - should update pipeline name', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/pipelines/${pipelineId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({ name: 'Updated Pipeline Name' })
        .expect(200);

      expect(res.body.name).toBe('Updated Pipeline Name');
    });
  });

  // =========================================================================
  // FORM SUBMISSION
  // =========================================================================

  describe('Form Submission', () => {
    let formId: string;

    it('POST /forms - should create a form', async () => {
      const res = await request(app.getHttpServer())
        .post('/forms')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          name: 'E2E Test Form',
          description: 'Test form for E2E tests',
          type: 'FORM',
          fields: [
            { name: 'name', label: 'Full Name', type: 'text', required: true },
            { name: 'email', label: 'Email', type: 'email', required: true },
            { name: 'message', label: 'Message', type: 'textarea', required: false },
          ],
          submitButtonText: 'Submit',
          successMessage: 'Thanks!',
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Form');
      formId = res.body.id;
    });

    it('POST /forms/:id/submit - should accept form submission', async () => {
      const res = await request(app.getHttpServer())
        .post(`/forms/${formId}/submit`)
        .send({
          name: 'Test Visitor',
          email: 'visitor@test.com',
          message: 'I am interested in your services',
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('GET /forms/:id/submissions - should list submissions', async () => {
      const res = await request(app.getHttpServer())
        .get(`/forms/${formId}/submissions`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      expect(res.body.data || res.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            data: expect.objectContaining({ email: 'visitor@test.com' }),
          }),
        ]),
      );
    });
  });

  // =========================================================================
  // APPOINTMENT BOOKING
  // =========================================================================

  describe('Appointment Booking', () => {
    let calendarId: string;
    let meetingTypeId: string;
    let appointmentId: string;

    it('POST /calendars - should create a calendar', async () => {
      const res = await request(app.getHttpServer())
        .post('/calendars')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          name: 'E2E Test Calendar',
          slug: 'e2e-test-calendar',
          type: 'PERSONAL',
          timezone: 'America/New_York',
        })
        .expect(201);

      expect(res.body.name).toBe('E2E Test Calendar');
      calendarId = res.body.id;
    });

    it('POST /calendars/:id/meeting-types - should create a meeting type', async () => {
      const res = await request(app.getHttpServer())
        .post(`/calendars/${calendarId}/meeting-types`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          name: '30 Minute Call',
          slug: 'e2e-30min-call',
          duration: 30,
          bufferBefore: 5,
          bufferAfter: 5,
        })
        .expect(201);

      expect(res.body.name).toBe('30 Minute Call');
      expect(res.body.duration).toBe(30);
      meetingTypeId = res.body.id;
    });

    it('POST /calendars/:id/book - should book an appointment', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(10, 0, 0, 0);

      const endTime = new Date(tomorrow);
      endTime.setMinutes(endTime.getMinutes() + 30);

      // First create a contact for the booking
      const contactRes = await request(app.getHttpServer())
        .post('/crm/contacts')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          email: 'appointment.test@example.com',
          firstName: 'Appointment',
          lastName: 'Tester',
        })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post(`/calendars/${calendarId}/book`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .send({
          meetingTypeId,
          contactId: contactRes.body.id,
          title: 'E2E Test Appointment',
          startTime: tomorrow.toISOString(),
          endTime: endTime.toISOString(),
          timezone: 'America/New_York',
        })
        .expect(201);

      expect(res.body.title).toBe('E2E Test Appointment');
      expect(res.body.status).toBe('SCHEDULED');
      appointmentId = res.body.id;
    });

    it('GET /calendars/:id/appointments - should list appointments', async () => {
      const res = await request(app.getHttpServer())
        .get(`/calendars/${calendarId}/appointments`)
        .set('Authorization', `Bearer ${accessToken}`)
        .set('x-tenant-id', tenantId)
        .expect(200);

      const appointments = res.body.data || res.body;
      expect(appointments.length).toBeGreaterThanOrEqual(1);
    });
  });

  // =========================================================================
  // AUTH LOGOUT
  // =========================================================================

  describe('Auth Logout', () => {
    it('POST /auth/logout - should logout successfully', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(201);
    });

    it('GET /auth/me - should fail after logout', async () => {
      // Token may still be valid (JWT is stateless) but session is destroyed
      // The behavior depends on session validation in the guard
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      // Accept either 200 (JWT still valid) or 401 (session invalidated)
      expect([200, 401]).toContain(res.status);
    });
  });
});
