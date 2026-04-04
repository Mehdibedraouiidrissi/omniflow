// =============================================================================
// Omniflow - Complete Seed Script
// Creates realistic demo data for investor demo
// =============================================================================

import { PrismaClient, Prisma } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 3600_000);
}

function randomDate(startDaysAgo: number, endDaysAgo: number): Date {
  const start = daysAgo(startDaysAgo).getTime();
  const end = daysAgo(endDaysAgo).getTime();
  return new Date(start + Math.random() * (end - start));
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDecimal(min: number, max: number): Prisma.Decimal {
  const val = min + Math.random() * (max - min);
  return new Prisma.Decimal(val.toFixed(2));
}

function slug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
}

// ---------------------------------------------------------------------------
// Realistic data pools
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Charles', 'Karen', 'Daniel', 'Lisa', 'Matthew', 'Nancy',
  'Anthony', 'Betty', 'Mark', 'Margaret', 'Steven', 'Sandra', 'Paul', 'Ashley',
  'Andrew', 'Emily', 'Joshua', 'Donna', 'Kenneth', 'Michelle', 'Kevin', 'Carol',
  'Brian', 'Amanda', 'George', 'Melissa', 'Timothy', 'Deborah', 'Ronald', 'Stephanie',
  'Edward', 'Rebecca',
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const COMPANIES = [
  'Acme Corp', 'Globex Industries', 'Soylent Corp', 'Initech', 'Umbrella Corp',
  'Stark Industries', 'Wayne Enterprises', 'Cyberdyne Systems', 'Weyland-Yutani',
  'Massive Dynamic', 'Pied Piper', 'Hooli', 'Dunder Mifflin', 'Sterling Cooper',
  'Prestige Worldwide', 'Vandelay Industries', 'Bluth Company', 'TechVault',
  'DataStream Inc', 'CloudNine Solutions', 'BrightPath Consulting', 'NovaTech Labs',
  'Zenith Digital', 'Apex Solutions', 'Summit Partners',
];

const SOURCES = ['WEBSITE', 'REFERRAL', 'SOCIAL', 'ADVERTISING', 'ORGANIC'];

const TAG_NAMES = ['Hot Lead', 'Cold Lead', 'Customer', 'VIP', 'Nurture'];
const TAG_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6'];

const EMAIL_SUBJECTS = [
  'Following up on our conversation',
  'Quick question about your project',
  'Proposal for your review',
  'Meeting confirmation',
  'Thank you for your inquiry',
  'Your account setup is complete',
  'New features available',
  'Monthly update',
  'Invoice attached',
  'Reminder: Upcoming appointment',
];

const SMS_BODIES = [
  'Hi! Just checking in to see if you had any questions.',
  'Your appointment is confirmed for tomorrow at 10am.',
  'Thanks for signing up! Reply YES to confirm.',
  'Reminder: Your free consultation is in 1 hour.',
  'We have a special offer for you! Check your email.',
];

const NOTIFICATION_TYPES = [
  'new_lead', 'appointment_booked', 'form_submitted', 'payment_received',
  'task_assigned', 'message_received', 'workflow_completed', 'review_received',
  'deal_won', 'deal_lost',
];

// ---------------------------------------------------------------------------
// Main seed function
// ---------------------------------------------------------------------------

async function main() {
  console.log('Seeding Omniflow demo data...\n');

  // Clean existing data
  console.log('Cleaning existing data...');
  await cleanDatabase();

  // =========================================================================
  // 1. Hash password
  // =========================================================================
  const passwordHash = await bcrypt.hash('Demo123!@#', 12);

  // =========================================================================
  // 2. Billing Plans
  // =========================================================================
  console.log('Creating billing plans...');
  const billingPlans = await createBillingPlans();

  // =========================================================================
  // 3. Feature Flags
  // =========================================================================
  console.log('Creating feature flags...');
  await createFeatureFlags();

  // =========================================================================
  // 4. Agency Tenant
  // =========================================================================
  console.log('Creating agency tenant...');
  const agency = await prisma.tenant.create({
    data: {
      name: 'Apex Digital Agency',
      slug: 'apex-digital-agency',
      type: 'AGENCY',
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      logoUrl: 'https://ui-avatars.com/api/?name=Apex+Digital&background=6366f1&color=fff&size=128',
      primaryColor: '#6366f1',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        whiteLabel: {
          enabled: true,
          companyName: 'Apex Digital Agency',
          primaryColor: '#6366f1',
          accentColor: '#8b5cf6',
          logoUrl: 'https://ui-avatars.com/api/?name=Apex+Digital&background=6366f1&color=fff&size=128',
          faviconUrl: null,
          customDomain: 'app.apexdigital.com',
          emailFromName: 'Apex Digital',
          emailFromDomain: 'apexdigital.com',
          supportEmail: 'support@apexdigital.com',
        },
      },
    },
  });

  // Agency admin role
  const agencyAdminRole = await prisma.role.create({
    data: {
      tenantId: agency.id,
      name: 'admin',
      description: 'Full administrative access',
      isSystem: true,
      permissions: {
        contacts: ['create', 'read', 'update', 'delete'],
        pipelines: ['create', 'read', 'update', 'delete'],
        conversations: ['create', 'read', 'update', 'delete'],
        forms: ['create', 'read', 'update', 'delete'],
        calendars: ['create', 'read', 'update', 'delete'],
        workflows: ['create', 'read', 'update', 'delete'],
        payments: ['create', 'read', 'update', 'delete'],
        funnels: ['create', 'read', 'update', 'delete'],
        social: ['create', 'read', 'update', 'delete'],
        reporting: ['read'],
        settings: ['read', 'update'],
        members: ['create', 'read', 'update', 'delete'],
        integrations: ['create', 'read', 'update', 'delete'],
        billing: ['read', 'update'],
        subaccounts: ['create', 'read', 'update', 'delete'],
      },
    },
  });

  // Agency admin user
  console.log('Creating agency admin user...');
  const agencyAdmin = await prisma.user.create({
    data: {
      email: 'admin@demo.omniflow.com',
      passwordHash,
      firstName: 'Alex',
      lastName: 'Morgan',
      emailVerified: true,
      status: 'ACTIVE',
      lastLoginAt: hoursAgo(1),
    },
  });

  await prisma.tenantMembership.create({
    data: {
      tenantId: agency.id,
      userId: agencyAdmin.id,
      roleId: agencyAdminRole.id,
      status: 'ACTIVE',
    },
  });

  // Agency billing
  await prisma.tenantBilling.create({
    data: {
      tenantId: agency.id,
      billingPlanId: billingPlans.professional.id,
      status: 'ACTIVE',
      stripeCustomerId: 'cus_demo_apex',
      stripeSubscriptionId: 'sub_demo_apex',
      currentPeriodEnd: daysAgo(-30),
    },
  });

  // =========================================================================
  // 5. Sub-Account 1: Sunrise Dental Clinic
  // =========================================================================
  console.log('Creating sub-account: Sunrise Dental Clinic...');
  const dental = await prisma.tenant.create({
    data: {
      name: 'Sunrise Dental Clinic',
      slug: 'sunrise-dental-clinic',
      type: 'BUSINESS',
      parentId: agency.id,
      status: 'ACTIVE',
      plan: 'PROFESSIONAL',
      logoUrl: 'https://ui-avatars.com/api/?name=Sunrise+Dental&background=22c55e&color=fff&size=128',
      primaryColor: '#22c55e',
      settings: {
        timezone: 'America/New_York',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        industry: 'Healthcare',
      },
    },
  });

  const dentalRoles = await createSubAccountRoles(dental.id);
  const dentalUsers = await createSubAccountUsers(
    dental.id,
    dentalRoles,
    passwordHash,
    [
      { email: 'sarah@sunrisedental.com', firstName: 'Sarah', lastName: 'Chen', role: 'admin' },
      { email: 'mike@sunrisedental.com', firstName: 'Mike', lastName: 'Torres', role: 'sales' },
      { email: 'lisa@sunrisedental.com', firstName: 'Lisa', lastName: 'Park', role: 'support' },
    ],
  );

  // Agency admin also has membership in sub-account
  await prisma.tenantMembership.create({
    data: {
      tenantId: dental.id,
      userId: agencyAdmin.id,
      roleId: dentalRoles.admin.id,
      status: 'ACTIVE',
    },
  });

  // =========================================================================
  // 6. Sub-Account 2: Metro Real Estate Group
  // =========================================================================
  console.log('Creating sub-account: Metro Real Estate Group...');
  const realestate = await prisma.tenant.create({
    data: {
      name: 'Metro Real Estate Group',
      slug: 'metro-real-estate-group',
      type: 'BUSINESS',
      parentId: agency.id,
      status: 'ACTIVE',
      plan: 'STARTER',
      logoUrl: 'https://ui-avatars.com/api/?name=Metro+RE&background=3b82f6&color=fff&size=128',
      primaryColor: '#3b82f6',
      settings: {
        timezone: 'America/Chicago',
        dateFormat: 'MM/DD/YYYY',
        currency: 'USD',
        industry: 'Real Estate',
      },
    },
  });

  const realestateRoles = await createSubAccountRoles(realestate.id);
  const realestateUsers = await createSubAccountUsers(
    realestate.id,
    realestateRoles,
    passwordHash,
    [
      { email: 'jason@metrore.com', firstName: 'Jason', lastName: 'Rivera', role: 'admin' },
      { email: 'emma@metrore.com', firstName: 'Emma', lastName: 'Wright', role: 'sales' },
    ],
  );

  await prisma.tenantMembership.create({
    data: {
      tenantId: realestate.id,
      userId: agencyAdmin.id,
      roleId: realestateRoles.admin.id,
      status: 'ACTIVE',
    },
  });

  // =========================================================================
  // 7. Seed data for each sub-account
  // =========================================================================
  for (const { tenant, users, label } of [
    { tenant: dental, users: dentalUsers, label: 'Sunrise Dental' },
    { tenant: realestate, users: realestateUsers, label: 'Metro Real Estate' },
  ]) {
    console.log(`\nSeeding data for ${label}...`);

    // --- Tags ---
    console.log(`  Creating tags...`);
    const tags = await createTags(tenant.id);

    // --- Contacts ---
    console.log(`  Creating 50 contacts...`);
    const contacts = await createContacts(tenant.id, users, tags);

    // --- Pipelines ---
    console.log(`  Creating 3 pipelines...`);
    const pipelines = await createPipelines(tenant.id);

    // --- Opportunities ---
    console.log(`  Creating 20 opportunities...`);
    await createOpportunities(tenant.id, pipelines, contacts, users);

    // --- Conversations ---
    console.log(`  Creating 30 conversations...`);
    await createConversations(tenant.id, contacts, users);

    // --- Workflows ---
    console.log(`  Creating 5 workflows...`);
    await createWorkflows(tenant.id, users[0]!.id);

    // --- Forms ---
    console.log(`  Creating 5 forms with submissions...`);
    await createForms(tenant.id, contacts);

    // --- Calendars & Appointments ---
    console.log(`  Creating calendars and appointments...`);
    await createCalendarsAndAppointments(tenant.id, users, contacts);

    // --- Products, Orders, Subscriptions, Invoices, Payments ---
    console.log(`  Creating products and commerce data...`);
    await createCommerceData(tenant.id, contacts);

    // --- Courses ---
    console.log(`  Creating courses and enrollments...`);
    await createCourses(tenant.id, contacts);

    // --- Review campaigns ---
    console.log(`  Creating review campaigns...`);
    await createReviewCampaigns(tenant.id, contacts);

    // --- Social posts ---
    console.log(`  Creating social posts...`);
    await createSocialPosts(tenant.id);

    // --- Websites ---
    console.log(`  Creating websites...`);
    await createWebsites(tenant.id);

    // --- Funnels ---
    console.log(`  Creating funnels...`);
    await createFunnels(tenant.id);

    // --- Reports ---
    console.log(`  Creating report configs...`);
    await createReports(tenant.id);

    // --- Analytics Events ---
    console.log(`  Creating 100 analytics events...`);
    await createAnalyticsEvents(tenant.id, contacts);

    // --- Audit Logs ---
    console.log(`  Creating 50 audit logs...`);
    await createAuditLogs(tenant.id, users);

    // --- Notifications ---
    console.log(`  Creating notifications...`);
    await createNotifications(tenant.id, users);
  }

  console.log('\n============================================================');
  console.log('Seed completed successfully!');
  console.log('============================================================');
  console.log('Login credentials:');
  console.log('  Email: admin@demo.omniflow.com');
  console.log('  Password: Demo123!@#');
  console.log('============================================================');
}

// ===========================================================================
// Clean database
// ===========================================================================

async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }) => tablename)
    .filter((name) => name !== '_prisma_migrations')
    .map((name) => `"public"."${name}"`)
    .join(', ');

  if (tables.length > 0) {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  }
}

// ===========================================================================
// Billing Plans
// ===========================================================================

async function createBillingPlans() {
  const free = await prisma.billingPlan.create({
    data: {
      name: 'Free',
      description: 'Get started with the basics',
      type: 'BUSINESS',
      monthlyPrice: new Prisma.Decimal('0.00'),
      yearlyPrice: new Prisma.Decimal('0.00'),
      isActive: true,
      position: 0,
      features: {
        contacts: 100,
        emails: 500,
        sms: 0,
        workflows: 1,
        forms: 3,
        calendars: 1,
        funnels: 1,
        customDomain: false,
        whiteLabel: false,
        apiAccess: false,
      },
      limits: { contacts: 100, emails: 500, sms: 0, workflows: 1, pages: 5, storage: 500 },
    },
  });

  const starter = await prisma.billingPlan.create({
    data: {
      name: 'Starter',
      description: 'Perfect for small businesses getting started',
      type: 'BUSINESS',
      monthlyPrice: new Prisma.Decimal('97.00'),
      yearlyPrice: new Prisma.Decimal('970.00'),
      isActive: true,
      position: 1,
      features: {
        contacts: 2500,
        emails: 10000,
        sms: 500,
        workflows: 5,
        forms: 10,
        calendars: 3,
        funnels: 5,
        customDomain: false,
        whiteLabel: false,
        apiAccess: true,
      },
      limits: { contacts: 2500, emails: 10000, sms: 500, workflows: 5, pages: 20, storage: 2000 },
    },
  });

  const professional = await prisma.billingPlan.create({
    data: {
      name: 'Professional',
      description: 'For growing businesses that need more power',
      type: 'BUSINESS',
      monthlyPrice: new Prisma.Decimal('297.00'),
      yearlyPrice: new Prisma.Decimal('2970.00'),
      isActive: true,
      position: 2,
      features: {
        contacts: 25000,
        emails: 50000,
        sms: 5000,
        workflows: 25,
        forms: 50,
        calendars: 10,
        funnels: 20,
        customDomain: true,
        whiteLabel: false,
        apiAccess: true,
        advancedReporting: true,
      },
      limits: { contacts: 25000, emails: 50000, sms: 5000, workflows: 25, pages: 100, storage: 10000 },
    },
  });

  const enterprise = await prisma.billingPlan.create({
    data: {
      name: 'Enterprise',
      description: 'Unlimited power for agencies and large teams',
      type: 'AGENCY',
      monthlyPrice: new Prisma.Decimal('497.00'),
      yearlyPrice: new Prisma.Decimal('4970.00'),
      isActive: true,
      position: 3,
      features: {
        contacts: -1,
        emails: -1,
        sms: 25000,
        workflows: -1,
        forms: -1,
        calendars: -1,
        funnels: -1,
        customDomain: true,
        whiteLabel: true,
        apiAccess: true,
        advancedReporting: true,
        prioritySupport: true,
        subAccounts: -1,
      },
      limits: { contacts: -1, emails: -1, sms: 25000, workflows: -1, pages: -1, storage: -1 },
    },
  });

  return { free, starter, professional, enterprise };
}

// ===========================================================================
// Feature Flags
// ===========================================================================

async function createFeatureFlags() {
  await prisma.featureFlag.createMany({
    data: [
      {
        name: 'workflow_v2',
        description: 'Enable v2 workflow builder with visual editor',
        isEnabled: true,
        rules: { rollout: 100 },
      },
      {
        name: 'ai_assistant',
        description: 'Enable AI-powered assistant for content generation',
        isEnabled: false,
        rules: { rollout: 0, betaTenants: [] },
      },
      {
        name: 'advanced_reporting',
        description: 'Enable advanced reporting dashboard with custom widgets',
        isEnabled: true,
        rules: { rollout: 100, minPlan: 'PROFESSIONAL' },
      },
    ],
  });
}

// ===========================================================================
// Sub-account roles & users
// ===========================================================================

interface RoleSet {
  admin: { id: string };
  sales: { id: string };
  support: { id: string };
}

async function createSubAccountRoles(tenantId: string): Promise<RoleSet> {
  const admin = await prisma.role.create({
    data: {
      tenantId,
      name: 'admin',
      description: 'Full administrative access',
      isSystem: true,
      permissions: {
        contacts: ['create', 'read', 'update', 'delete'],
        pipelines: ['create', 'read', 'update', 'delete'],
        conversations: ['create', 'read', 'update', 'delete'],
        forms: ['create', 'read', 'update', 'delete'],
        calendars: ['create', 'read', 'update', 'delete'],
        workflows: ['create', 'read', 'update', 'delete'],
        payments: ['create', 'read', 'update', 'delete'],
        funnels: ['create', 'read', 'update', 'delete'],
        social: ['create', 'read', 'update', 'delete'],
        reporting: ['read'],
        settings: ['read', 'update'],
        members: ['create', 'read', 'update', 'delete'],
        integrations: ['create', 'read', 'update', 'delete'],
      },
    },
  });

  const sales = await prisma.role.create({
    data: {
      tenantId,
      name: 'sales',
      description: 'Sales representative access',
      isSystem: true,
      permissions: {
        contacts: ['create', 'read', 'update'],
        pipelines: ['read', 'update'],
        conversations: ['create', 'read', 'update'],
        forms: ['read'],
        calendars: ['read', 'update'],
        workflows: ['read'],
        payments: ['read'],
        reporting: ['read'],
      },
    },
  });

  const support = await prisma.role.create({
    data: {
      tenantId,
      name: 'support',
      description: 'Customer support access',
      isSystem: true,
      permissions: {
        contacts: ['read', 'update'],
        conversations: ['create', 'read', 'update'],
        forms: ['read'],
        calendars: ['read'],
        reporting: ['read'],
      },
    },
  });

  return { admin, sales, support };
}

interface UserSpec {
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'sales' | 'support';
}

async function createSubAccountUsers(
  tenantId: string,
  roles: RoleSet,
  passwordHash: string,
  specs: UserSpec[],
) {
  const users: Array<{ id: string; email: string; firstName: string; lastName: string }> = [];

  for (const spec of specs) {
    const user = await prisma.user.create({
      data: {
        email: spec.email,
        passwordHash,
        firstName: spec.firstName,
        lastName: spec.lastName,
        emailVerified: true,
        status: 'ACTIVE',
        lastLoginAt: randomDate(7, 0),
      },
    });

    await prisma.tenantMembership.create({
      data: {
        tenantId,
        userId: user.id,
        roleId: roles[spec.role].id,
        status: 'ACTIVE',
      },
    });

    users.push({ id: user.id, email: user.email, firstName: spec.firstName, lastName: spec.lastName });
  }

  return users;
}

// ===========================================================================
// Tags
// ===========================================================================

async function createTags(tenantId: string) {
  const tags: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < TAG_NAMES.length; i++) {
    const tag = await prisma.tag.create({
      data: { tenantId, name: TAG_NAMES[i]!, color: TAG_COLORS[i] },
    });
    tags.push(tag);
  }
  return tags;
}

// ===========================================================================
// Contacts (50 per sub-account)
// ===========================================================================

async function createContacts(
  tenantId: string,
  users: Array<{ id: string }>,
  tags: Array<{ id: string; name: string }>,
) {
  const contacts: Array<{ id: string; email: string; firstName: string; lastName: string }> = [];

  for (let i = 0; i < 50; i++) {
    const firstName = FIRST_NAMES[i % FIRST_NAMES.length]!;
    const lastName = LAST_NAMES[i % LAST_NAMES.length]!;
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@example.com`;
    const createdAt = randomDate(90, 1);

    const contact = await prisma.contact.create({
      data: {
        tenantId,
        email,
        phone: `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`,
        firstName,
        lastName,
        companyName: i < 25 ? COMPANIES[i % COMPANIES.length] : null,
        source: SOURCES[i % SOURCES.length],
        ownerId: users[i % users.length]!.id,
        score: randomInt(0, 100),
        status: i < 45 ? 'ACTIVE' : (i < 48 ? 'INACTIVE' : 'UNSUBSCRIBED'),
        website: i % 4 === 0 ? `https://www.example${i}.com` : null,
        address: i % 3 === 0 ? `${randomInt(100, 9999)} Main St` : null,
        city: i % 3 === 0 ? randomElement(['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix']) : null,
        state: i % 3 === 0 ? randomElement(['NY', 'CA', 'IL', 'TX', 'AZ']) : null,
        country: 'US',
        postalCode: i % 3 === 0 ? `${randomInt(10000, 99999)}` : null,
        timezone: 'America/New_York',
        customFields: {
          preferred_contact: randomElement(['email', 'phone', 'sms']),
          lead_quality: randomElement(['high', 'medium', 'low']),
          budget_range: randomElement(['$1k-$5k', '$5k-$15k', '$15k-$50k', '$50k+']),
        },
        lastActivityAt: randomDate(30, 0),
        createdAt,
      },
    });

    // Assign 1-2 random tags
    const numTags = randomInt(1, 2);
    const shuffled = [...tags].sort(() => Math.random() - 0.5);
    for (let t = 0; t < numTags; t++) {
      await prisma.contactTag.create({
        data: { contactId: contact.id, tagId: shuffled[t]!.id, tenantId },
      });
    }

    // Create 1-3 activities
    const numActivities = randomInt(1, 3);
    const activityTypes: Array<'NOTE' | 'EMAIL' | 'CALL' | 'MEETING' | 'FORM_SUBMITTED'> = [
      'NOTE', 'EMAIL', 'CALL', 'MEETING', 'FORM_SUBMITTED',
    ];
    for (let a = 0; a < numActivities; a++) {
      await prisma.activity.create({
        data: {
          tenantId,
          contactId: contact.id,
          userId: users[a % users.length]!.id,
          type: activityTypes[a % activityTypes.length]!,
          title: `Activity ${a + 1} for ${firstName}`,
          description: `Recorded activity of type ${activityTypes[a % activityTypes.length]}`,
          createdAt: randomDate(60, 0),
        },
      });
    }

    contacts.push({ id: contact.id, email, firstName, lastName });
  }

  return contacts;
}

// ===========================================================================
// Pipelines (3 per sub-account)
// ===========================================================================

interface PipelineWithStages {
  id: string;
  name: string;
  stages: Array<{ id: string; name: string; isWon: boolean; isLost: boolean }>;
}

async function createPipelines(tenantId: string): Promise<PipelineWithStages[]> {
  const pipelineConfigs = [
    {
      name: 'Sales Pipeline',
      stages: [
        { name: 'New Lead', probability: 10 },
        { name: 'Contacted', probability: 20 },
        { name: 'Qualified', probability: 40 },
        { name: 'Proposal Sent', probability: 60 },
        { name: 'Negotiation', probability: 80 },
        { name: 'Won', probability: 100, isWon: true },
        { name: 'Lost', probability: 0, isLost: true },
      ],
    },
    {
      name: 'Onboarding Pipeline',
      stages: [
        { name: 'Welcome', probability: 25 },
        { name: 'Setup', probability: 50 },
        { name: 'Training', probability: 75 },
        { name: 'Go Live', probability: 100, isWon: true },
      ],
    },
    {
      name: 'Renewal Pipeline',
      stages: [
        { name: '90 Days Out', probability: 20 },
        { name: '60 Days Out', probability: 40 },
        { name: '30 Days Out', probability: 60 },
        { name: 'Renewed', probability: 100, isWon: true },
        { name: 'Churned', probability: 0, isLost: true },
      ],
    },
  ];

  const pipelines: PipelineWithStages[] = [];

  for (let p = 0; p < pipelineConfigs.length; p++) {
    const config = pipelineConfigs[p]!;
    const pipeline = await prisma.pipeline.create({
      data: {
        tenantId,
        name: config.name,
        description: `${config.name} for managing deals`,
        isDefault: p === 0,
        position: p,
      },
    });

    const stages: PipelineWithStages['stages'] = [];
    for (let s = 0; s < config.stages.length; s++) {
      const sc = config.stages[s]!;
      const stage = await prisma.pipelineStage.create({
        data: {
          pipelineId: pipeline.id,
          tenantId,
          name: sc.name,
          color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          position: s,
          probability: sc.probability,
          isWon: sc.isWon || false,
          isLost: sc.isLost || false,
        },
      });
      stages.push({ id: stage.id, name: stage.name, isWon: stage.isWon, isLost: stage.isLost });
    }

    pipelines.push({ id: pipeline.id, name: pipeline.name, stages });
  }

  return pipelines;
}

// ===========================================================================
// Opportunities (20 per sub-account)
// ===========================================================================

async function createOpportunities(
  tenantId: string,
  pipelines: PipelineWithStages[],
  contacts: Array<{ id: string; firstName: string; lastName: string }>,
  users: Array<{ id: string }>,
) {
  const salesPipeline = pipelines[0]!;

  for (let i = 0; i < 20; i++) {
    const pipeline = i < 12 ? salesPipeline : pipelines[Math.min(i % pipelines.length, pipelines.length - 1)]!;
    const stage = pipeline.stages[Math.min(i % pipeline.stages.length, pipeline.stages.length - 1)]!;
    const contact = contacts[i % contacts.length]!;
    const value = randomDecimal(500, 50000);

    let status: 'OPEN' | 'WON' | 'LOST' | 'ABANDONED' = 'OPEN';
    let wonDate: Date | null = null;
    let lostDate: Date | null = null;
    let lostReason: string | null = null;

    if (stage.isWon) {
      status = 'WON';
      wonDate = randomDate(30, 1);
    } else if (stage.isLost) {
      status = 'LOST';
      lostDate = randomDate(30, 1);
      lostReason = randomElement(['Budget constraints', 'Chose competitor', 'Timeline mismatch', 'No longer needed']);
    }

    await prisma.opportunity.create({
      data: {
        tenantId,
        pipelineId: pipeline.id,
        stageId: stage.id,
        contactId: contact.id,
        name: `${contact.firstName} ${contact.lastName} - Deal #${i + 1}`,
        value,
        currency: 'USD',
        status,
        expectedCloseDate: daysAgo(-randomInt(7, 90)),
        assigneeId: users[i % users.length]!.id,
        lostReason,
        wonDate,
        lostDate,
        source: SOURCES[i % SOURCES.length],
        createdAt: randomDate(60, 1),
      },
    });
  }
}

// ===========================================================================
// Conversations (30 per sub-account)
// ===========================================================================

async function createConversations(
  tenantId: string,
  contacts: Array<{ id: string; email: string }>,
  users: Array<{ id: string }>,
) {
  const channels: Array<'EMAIL' | 'SMS'> = ['EMAIL', 'SMS'];
  const statuses: Array<'OPEN' | 'CLOSED' | 'SNOOZED'> = ['OPEN', 'CLOSED', 'SNOOZED'];

  for (let i = 0; i < 30; i++) {
    const contact = contacts[i % contacts.length]!;
    const channel = channels[i % channels.length]!;
    const status = i < 15 ? 'OPEN' : (i < 25 ? 'CLOSED' : 'SNOOZED');
    const conversationCreated = randomDate(60, 1);

    const conversation = await prisma.conversation.create({
      data: {
        tenantId,
        contactId: contact.id,
        channel,
        status,
        assigneeId: users[i % users.length]!.id,
        subject: channel === 'EMAIL' ? EMAIL_SUBJECTS[i % EMAIL_SUBJECTS.length] : null,
        lastMessageAt: randomDate(7, 0),
        unreadCount: status === 'OPEN' ? randomInt(0, 5) : 0,
        createdAt: conversationCreated,
      },
    });

    // 2-5 messages per conversation
    const numMessages = randomInt(2, 5);
    for (let m = 0; m < numMessages; m++) {
      const isInbound = m % 2 === 0;
      const messageTime = new Date(conversationCreated.getTime() + m * 3600_000);

      await prisma.message.create({
        data: {
          tenantId,
          conversationId: conversation.id,
          contactId: isInbound ? contact.id : null,
          userId: isInbound ? null : users[m % users.length]!.id,
          direction: isInbound ? 'INBOUND' : 'OUTBOUND',
          channel,
          body: channel === 'EMAIL'
            ? `This is message ${m + 1} in the conversation. ${isInbound ? 'Customer inquiry about services.' : 'Thank you for reaching out. We would be happy to help.'}`
            : (isInbound ? SMS_BODIES[m % SMS_BODIES.length] : 'Thank you for your message. We will follow up shortly.'),
          subject: channel === 'EMAIL' ? (m === 0 ? EMAIL_SUBJECTS[i % EMAIL_SUBJECTS.length] : `Re: ${EMAIL_SUBJECTS[i % EMAIL_SUBJECTS.length]}`) : null,
          status: isInbound ? 'DELIVERED' : randomElement(['SENT', 'DELIVERED', 'READ']),
          sentAt: messageTime,
          deliveredAt: new Date(messageTime.getTime() + randomInt(1, 30) * 60_000),
          createdAt: messageTime,
        },
      });
    }
  }
}

// ===========================================================================
// Workflows (5 per sub-account)
// ===========================================================================

async function createWorkflows(tenantId: string, createdById: string) {
  const workflowConfigs = [
    {
      name: 'New Lead Nurture',
      description: 'Automatically nurture new leads with a multi-step sequence',
      triggerType: 'CONTACT_CREATED' as const,
      triggerConfig: { conditions: { source: ['WEBSITE', 'SOCIAL'] } },
      steps: [
        { type: 'WAIT', config: { duration: 3600, unit: 'seconds' } },
        { type: 'SEND_EMAIL', config: { templateId: 'welcome-email', subject: 'Welcome to {{companyName}}!' } },
        { type: 'WAIT', config: { duration: 86400, unit: 'seconds' } },
        { type: 'IF_ELSE', config: { condition: { field: 'tags', operator: 'contains', value: 'hot' } } },
        { type: 'SEND_SMS', config: { message: 'Hi {{firstName}}, we noticed your interest! Can we schedule a call?' } },
        { type: 'CREATE_TASK', config: { title: 'Follow up with {{firstName}} {{lastName}}', assignTo: 'contact_owner' } },
      ],
      status: 'ACTIVE' as const,
    },
    {
      name: 'Appointment Reminder',
      description: 'Send confirmation and reminder for booked appointments',
      triggerType: 'APPOINTMENT_BOOKED' as const,
      triggerConfig: { calendarId: 'any' },
      steps: [
        { type: 'SEND_EMAIL', config: { templateId: 'appointment-confirmation', subject: 'Appointment Confirmed' } },
        { type: 'WAIT', config: { until: 'appointment_start', offset: -3600 } },
        { type: 'SEND_SMS', config: { message: 'Reminder: Your appointment is in 1 hour. Reply C to confirm or R to reschedule.' } },
      ],
      status: 'ACTIVE' as const,
    },
    {
      name: 'Win Notification',
      description: 'Celebrate wins and trigger onboarding when a deal is won',
      triggerType: 'STAGE_CHANGED' as const,
      triggerConfig: { toStage: 'Won' },
      steps: [
        { type: 'SEND_EMAIL', config: { templateId: 'congratulations', subject: 'Congratulations on your new partnership!' } },
        { type: 'CREATE_TASK', config: { title: 'Onboard {{firstName}} {{lastName}}', assignTo: 'contact_owner', dueIn: 48 } },
        { type: 'NOTIFICATION', config: { message: 'Deal won: {{opportunityName}} (${{opportunityValue}})', channel: 'team' } },
      ],
      status: 'ACTIVE' as const,
    },
    {
      name: 'Review Request',
      description: 'Request reviews after appointments are completed',
      triggerType: 'APPOINTMENT_BOOKED' as const,
      triggerConfig: { status: 'completed' },
      steps: [
        { type: 'WAIT', config: { duration: 86400, unit: 'seconds' } },
        { type: 'SEND_EMAIL', config: { templateId: 'review-request', subject: 'How was your experience?' } },
        { type: 'WAIT', config: { duration: 259200, unit: 'seconds' } },
        { type: 'IF_ELSE', config: { condition: { field: 'review_submitted', operator: 'equals', value: false } } },
        { type: 'SEND_SMS', config: { message: 'Hi {{firstName}}, we would love your feedback! Leave a quick review: {{reviewLink}}' } },
      ],
      status: 'ACTIVE' as const,
    },
    {
      name: 'Re-engagement',
      description: 'Re-engage cold contacts with a drip campaign',
      triggerType: 'TAG_ADDED' as const,
      triggerConfig: { tagName: 'Cold Lead' },
      steps: [
        { type: 'WAIT', config: { duration: 604800, unit: 'seconds' } },
        { type: 'SEND_EMAIL', config: { templateId: 'reengagement-1', subject: 'We miss you, {{firstName}}!' } },
        { type: 'WAIT', config: { duration: 259200, unit: 'seconds' } },
        { type: 'SEND_EMAIL', config: { templateId: 'reengagement-2', subject: 'Last chance: Special offer inside' } },
        { type: 'REMOVE_TAG', config: { tagName: 'Cold Lead' } },
      ],
      status: 'DRAFT' as const,
    },
  ];

  for (const wc of workflowConfigs) {
    const workflow = await prisma.workflow.create({
      data: {
        tenantId,
        name: wc.name,
        description: wc.description,
        status: wc.status,
        triggerType: wc.triggerType,
        triggerConfig: wc.triggerConfig,
        version: 1,
        publishedVersion: wc.status === 'ACTIVE' ? 1 : null,
        createdById: createdById,
        stats: {
          totalRuns: randomInt(10, 500),
          completedRuns: randomInt(5, 400),
          failedRuns: randomInt(0, 10),
          activeRuns: randomInt(0, 20),
        },
        createdAt: randomDate(60, 10),
      },
    });

    // Create version
    await prisma.workflowVersion.create({
      data: {
        workflowId: workflow.id,
        tenantId,
        version: 1,
        steps: wc.steps,
        publishedAt: wc.status === 'ACTIVE' ? randomDate(30, 5) : null,
      },
    });
  }
}

// ===========================================================================
// Forms (5 per sub-account, 20+ submissions each)
// ===========================================================================

async function createForms(
  tenantId: string,
  contacts: Array<{ id: string }>,
) {
  const formConfigs = [
    {
      name: 'Contact Us',
      description: 'General contact form for website visitors',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email Address', type: 'email', required: true },
        { name: 'phone', label: 'Phone Number', type: 'phone', required: false },
        { name: 'message', label: 'Message', type: 'textarea', required: true },
      ],
      submitButtonText: 'Send Message',
      successMessage: 'Thank you! We will get back to you within 24 hours.',
    },
    {
      name: 'Free Consultation',
      description: 'Book a free consultation with our team',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'phone', label: 'Phone', type: 'phone', required: true },
        { name: 'service', label: 'Service Interest', type: 'select', required: true, options: ['General Consultation', 'Teeth Whitening', 'Orthodontics', 'Implants'] },
        { name: 'preferredDate', label: 'Preferred Date', type: 'date', required: false },
      ],
      submitButtonText: 'Book Consultation',
      successMessage: 'Your consultation has been booked. We will confirm the date shortly.',
    },
    {
      name: 'Customer Satisfaction Survey',
      description: 'Measure customer satisfaction after service',
      type: 'SURVEY' as const,
      fields: [
        { name: 'rating', label: 'Overall Satisfaction (1-10)', type: 'number', required: true, min: 1, max: 10 },
        { name: 'feedback', label: 'Tell us more about your experience', type: 'textarea', required: false },
        { name: 'recommend', label: 'Would you recommend us?', type: 'select', required: true, options: ['Yes', 'No', 'Maybe'] },
      ],
      submitButtonText: 'Submit Feedback',
      successMessage: 'Thank you for your feedback!',
    },
    {
      name: 'Event Registration',
      description: 'Register for upcoming events and webinars',
      fields: [
        { name: 'name', label: 'Full Name', type: 'text', required: true },
        { name: 'email', label: 'Email', type: 'email', required: true },
        { name: 'company', label: 'Company', type: 'text', required: false },
        { name: 'role', label: 'Job Title', type: 'text', required: false },
        { name: 'attendeeCount', label: 'Number of Attendees', type: 'number', required: true },
      ],
      submitButtonText: 'Register Now',
      successMessage: 'You are registered! Check your email for details.',
    },
    {
      name: 'Newsletter Signup',
      description: 'Subscribe to our newsletter',
      fields: [
        { name: 'email', label: 'Email Address', type: 'email', required: true },
      ],
      submitButtonText: 'Subscribe',
      successMessage: 'Welcome aboard! Check your inbox for a confirmation.',
    },
  ];

  for (const fc of formConfigs) {
    const form = await prisma.form.create({
      data: {
        tenantId,
        name: fc.name,
        description: fc.description,
        type: (fc as any).type || 'FORM',
        status: 'PUBLISHED',
        fields: fc.fields,
        submitButtonText: fc.submitButtonText,
        successMessage: fc.successMessage,
        submissionCount: 0,
        createdAt: randomDate(60, 30),
        settings: {
          notifyOnSubmission: true,
          notifyEmails: ['admin@example.com'],
          captchaEnabled: true,
        },
      },
    });

    // Create 20-25 submissions per form
    const submissionCount = randomInt(20, 25);
    for (let s = 0; s < submissionCount; s++) {
      const contact = contacts[s % contacts.length]!;
      const submissionData: Record<string, string | number> = {};

      for (const field of fc.fields) {
        switch (field.type) {
          case 'text':
          case 'textarea':
            submissionData[field.name] = `Sample ${field.label} response ${s + 1}`;
            break;
          case 'email':
            submissionData[field.name] = `user${s}@example.com`;
            break;
          case 'phone':
            submissionData[field.name] = `+1${randomInt(200, 999)}${randomInt(100, 999)}${randomInt(1000, 9999)}`;
            break;
          case 'number':
            submissionData[field.name] = randomInt(1, 10);
            break;
          case 'select':
            submissionData[field.name] = (field as any).options
              ? randomElement((field as any).options)
              : 'Option 1';
            break;
          case 'date':
            submissionData[field.name] = daysAgo(-randomInt(1, 30)).toISOString().split('T')[0]!;
            break;
        }
      }

      await prisma.formSubmission.create({
        data: {
          formId: form.id,
          tenantId,
          contactId: s < contacts.length ? contact.id : null,
          data: submissionData,
          ipAddress: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
          source: randomElement(['website', 'landing_page', 'funnel', 'direct']),
          createdAt: randomDate(60, 0),
        },
      });
    }

    // Update submission count
    await prisma.form.update({
      where: { id: form.id },
      data: { submissionCount },
    });
  }
}

// ===========================================================================
// Calendars & Appointments
// ===========================================================================

async function createCalendarsAndAppointments(
  tenantId: string,
  users: Array<{ id: string }>,
  contacts: Array<{ id: string; firstName: string; lastName: string }>,
) {
  const calendarConfigs = [
    { name: 'Main Calendar', slug: 'main-calendar', type: 'PERSONAL' as const },
    { name: 'Team Calendar', slug: 'team-calendar', type: 'TEAM' as const },
    { name: 'Round Robin', slug: 'round-robin', type: 'ROUND_ROBIN' as const },
  ];

  const calendars: Array<{ id: string }> = [];
  const meetingTypes: Array<{ id: string; calendarId: string; duration: number }> = [];

  for (const cc of calendarConfigs) {
    const calendar = await prisma.calendar.create({
      data: {
        tenantId,
        name: cc.name,
        slug: cc.slug,
        type: cc.type,
        description: `${cc.name} for scheduling`,
        timezone: 'America/New_York',
        isActive: true,
        settings: {
          minNotice: 120,
          maxFutureDays: 60,
          bufferMinutes: 15,
        },
      },
    });
    calendars.push(calendar);

    // Add members
    for (const user of users) {
      await prisma.calendarMember.create({
        data: { calendarId: calendar.id, userId: user.id, priority: 0 },
      });
    }

    // Availability rules (Mon-Fri 9am-5pm)
    for (let day = 1; day <= 5; day++) {
      await prisma.availabilityRule.create({
        data: {
          calendarId: calendar.id,
          tenantId,
          dayOfWeek: day,
          startTime: '09:00',
          endTime: '17:00',
          isActive: true,
        },
      });
    }

    // Meeting types
    const meetingConfigs = [
      { name: 'Quick Chat', slug: `quick-chat-${cc.slug}`, duration: 15, buffer: 5 },
      { name: 'Consultation', slug: `consultation-${cc.slug}`, duration: 30, buffer: 15 },
      { name: 'Discovery Call', slug: `discovery-call-${cc.slug}`, duration: 60, buffer: 15 },
    ];

    for (const mc of meetingConfigs) {
      const mt = await prisma.meetingType.create({
        data: {
          calendarId: calendar.id,
          tenantId,
          name: mc.name,
          slug: mc.slug,
          description: `${mc.duration} minute ${mc.name.toLowerCase()}`,
          duration: mc.duration,
          bufferBefore: mc.buffer,
          bufferAfter: mc.buffer,
          color: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
          maxBookingsPerDay: 8,
          requiresConfirmation: mc.duration >= 60,
          confirmationMessage: `Your ${mc.name.toLowerCase()} has been confirmed.`,
          cancellationMessage: `Your ${mc.name.toLowerCase()} has been cancelled.`,
          reminderMinutes: [60, 15],
          isActive: true,
        },
      });
      meetingTypes.push({ id: mt.id, calendarId: calendar.id, duration: mc.duration });
    }
  }

  // 15 Appointments
  const appointmentStatuses: Array<'SCHEDULED' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'> = [
    'SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED',
  ];

  for (let i = 0; i < 15; i++) {
    const mt = meetingTypes[i % meetingTypes.length]!;
    const contact = contacts[i % contacts.length]!;
    const startTime = i < 5
      ? daysAgo(-randomInt(1, 14)) // Future
      : (i < 10 ? randomDate(14, 1) : randomDate(30, 14)); // Past
    const endTime = new Date(startTime.getTime() + mt.duration * 60_000);
    const status = i < 5
      ? randomElement(['SCHEDULED', 'CONFIRMED'] as const)
      : (i < 12 ? 'COMPLETED' : 'CANCELLED');

    await prisma.appointment.create({
      data: {
        tenantId,
        calendarId: mt.calendarId,
        meetingTypeId: mt.id,
        contactId: contact.id,
        assigneeId: users[i % users.length]!.id,
        title: `${contact.firstName} ${contact.lastName} - Appointment`,
        description: `Appointment with ${contact.firstName}`,
        startTime,
        endTime,
        timezone: 'America/New_York',
        status,
        location: i % 2 === 0 ? 'Office' : null,
        meetingUrl: i % 2 !== 0 ? `https://meet.omniflow.com/${Math.random().toString(36).substring(7)}` : null,
        cancelledAt: status === 'CANCELLED' ? randomDate(5, 0) : null,
        cancelReason: status === 'CANCELLED' ? 'Client rescheduled' : null,
        createdAt: randomDate(30, 1),
      },
    });
  }
}

// ===========================================================================
// Commerce: Products, Orders, Subscriptions, Invoices, Payments
// ===========================================================================

async function createCommerceData(
  tenantId: string,
  contacts: Array<{ id: string }>,
) {
  // --- Products ---
  const productConfigs = [
    { name: 'Starter Plan', type: 'RECURRING' as const, amount: 49, interval: 'MONTH' as const },
    { name: 'Professional Plan', type: 'RECURRING' as const, amount: 149, interval: 'MONTH' as const },
    { name: 'Enterprise Plan', type: 'RECURRING' as const, amount: 399, interval: 'MONTH' as const },
    { name: 'One-Time Setup', type: 'ONE_TIME' as const, amount: 999 },
    { name: 'Training Package', type: 'ONE_TIME' as const, amount: 299 },
  ];

  const products: Array<{ id: string; priceId: string; amount: number; type: string }> = [];

  for (const pc of productConfigs) {
    const product = await prisma.product.create({
      data: {
        tenantId,
        name: pc.name,
        description: `${pc.name} - ${pc.type === 'RECURRING' ? `$${pc.amount}/month` : `$${pc.amount} one-time`}`,
        type: pc.type,
        status: 'ACTIVE',
        metadata: { category: pc.type === 'RECURRING' ? 'subscription' : 'service' },
      },
    });

    const price = await prisma.price.create({
      data: {
        productId: product.id,
        tenantId,
        name: `${pc.name} Price`,
        amount: new Prisma.Decimal(pc.amount.toFixed(2)),
        currency: 'USD',
        type: pc.type === 'RECURRING' ? 'RECURRING' : 'ONE_TIME',
        interval: pc.type === 'RECURRING' ? (pc.interval ?? 'MONTH') : null,
        intervalCount: 1,
        isDefault: true,
        isActive: true,
      },
    });

    products.push({ id: product.id, priceId: price.id, amount: pc.amount, type: pc.type });
  }

  // --- Subscriptions (5) ---
  const subscriptions: Array<{ id: string; contactId: string }> = [];
  const recurringProducts = products.filter((p) => p.type === 'RECURRING');

  for (let i = 0; i < 5; i++) {
    const contact = contacts[i]!;
    const product = recurringProducts[i % recurringProducts.length]!;
    const startDate = randomDate(90, 30);

    const sub = await prisma.subscription.create({
      data: {
        tenantId,
        contactId: contact.id,
        productId: product.id,
        priceId: product.priceId,
        status: i < 4 ? 'ACTIVE' : 'CANCELLED',
        currentPeriodStart: startDate,
        currentPeriodEnd: new Date(startDate.getTime() + 30 * 86400_000),
        cancelledAt: i >= 4 ? randomDate(10, 1) : null,
        stripeSubscriptionId: `sub_demo_${i}`,
        createdAt: startDate,
      },
    });
    subscriptions.push({ id: sub.id, contactId: contact.id });
  }

  // --- Orders (10) ---
  const orders: Array<{ id: string; contactId: string; totalAmount: number }> = [];

  for (let i = 0; i < 10; i++) {
    const contact = contacts[i + 5]!;
    const product = products[i % products.length]!;
    const orderStatus = i < 7 ? 'PAID' : (i < 9 ? 'PENDING' : 'REFUNDED');

    const order = await prisma.order.create({
      data: {
        tenantId,
        contactId: contact.id,
        status: orderStatus,
        totalAmount: new Prisma.Decimal(product.amount.toFixed(2)),
        currency: 'USD',
        items: [
          {
            productId: product.id,
            name: productConfigs[i % productConfigs.length]!.name,
            quantity: 1,
            unitPrice: product.amount,
            totalPrice: product.amount,
          },
        ],
        paidAt: orderStatus === 'PAID' ? randomDate(30, 1) : null,
        createdAt: randomDate(60, 1),
      },
    });
    orders.push({ id: order.id, contactId: contact.id, totalAmount: product.amount });
  }

  // --- Invoices (10) ---
  for (let i = 0; i < 10; i++) {
    const contact = contacts[i + 10]!;
    const amount = products[i % products.length]!.amount;
    const invoiceStatus = i < 5 ? 'PAID' : (i < 8 ? 'OPEN' : 'DRAFT');

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        contactId: contact.id,
        subscriptionId: i < 5 ? subscriptions[i % subscriptions.length]!.id : null,
        orderId: i >= 5 && i < 10 ? orders[i % orders.length]!.id : null,
        status: invoiceStatus,
        totalAmount: new Prisma.Decimal(amount.toFixed(2)),
        currency: 'USD',
        dueDate: daysAgo(invoiceStatus === 'PAID' ? randomInt(5, 30) : -randomInt(5, 30)),
        paidAt: invoiceStatus === 'PAID' ? randomDate(30, 1) : null,
        lineItems: [
          {
            description: productConfigs[i % productConfigs.length]!.name,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          },
        ],
        createdAt: randomDate(60, 1),
      },
    });

    // --- Payments for paid invoices ---
    if (invoiceStatus === 'PAID' || i < 5) {
      await prisma.payment.create({
        data: {
          tenantId,
          invoiceId: invoice.id,
          contactId: contact.id,
          amount: new Prisma.Decimal(amount.toFixed(2)),
          currency: 'USD',
          status: 'SUCCEEDED',
          method: randomElement(['credit_card', 'debit_card', 'bank_transfer']),
          stripePaymentId: `pi_demo_${i}`,
          createdAt: randomDate(30, 1),
        },
      });
    }
  }

  // Additional payments without invoices
  for (let i = 0; i < 5; i++) {
    const order = orders[i]!;
    await prisma.payment.create({
      data: {
        tenantId,
        orderId: order.id,
        contactId: order.contactId,
        amount: new Prisma.Decimal(order.totalAmount.toFixed(2)),
        currency: 'USD',
        status: i < 4 ? 'SUCCEEDED' : 'FAILED',
        method: 'credit_card',
        stripePaymentId: `pi_demo_order_${i}`,
        createdAt: randomDate(30, 1),
      },
    });
  }
}

// ===========================================================================
// Courses (3 per sub-account)
// ===========================================================================

async function createCourses(
  tenantId: string,
  contacts: Array<{ id: string }>,
) {
  const courseConfigs = [
    {
      name: 'Social Media Marketing 101',
      slug: 'social-media-marketing-101',
      price: 49.99,
      modules: [
        { name: 'Getting Started', lessons: ['What is Social Media Marketing?', 'Setting Up Your Profiles', 'Understanding Your Audience'] },
        { name: 'Content Strategy', lessons: ['Content Types That Work', 'Creating a Content Calendar', 'Visual Content Best Practices'] },
        { name: 'Growth Tactics', lessons: ['Hashtag Strategy', 'Engagement Techniques', 'Influencer Partnerships'] },
        { name: 'Analytics & Optimization', lessons: ['Key Metrics to Track', 'A/B Testing Posts', 'Monthly Reporting'] },
      ],
    },
    {
      name: 'SEO Fundamentals',
      slug: 'seo-fundamentals',
      price: 79.99,
      modules: [
        { name: 'SEO Basics', lessons: ['What is SEO?', 'How Search Engines Work', 'Keyword Research'] },
        { name: 'On-Page SEO', lessons: ['Title Tags & Meta Descriptions', 'Content Optimization', 'Internal Linking'] },
        { name: 'Off-Page SEO', lessons: ['Link Building Strategies', 'Local SEO', 'Technical SEO Checklist'] },
      ],
    },
    {
      name: 'Email Marketing Mastery',
      slug: 'email-marketing-mastery',
      price: 99.99,
      modules: [
        { name: 'Email Foundations', lessons: ['Building Your List', 'Choosing an ESP', 'Deliverability Basics'] },
        { name: 'Writing Emails', lessons: ['Subject Line Formulas', 'Body Copy That Converts', 'Call-to-Action Design'] },
        { name: 'Automation', lessons: ['Welcome Sequences', 'Abandoned Cart Flows', 'Re-engagement Campaigns'] },
        { name: 'Segmentation', lessons: ['Behavioral Segmentation', 'Demographic Targeting', 'RFM Analysis'] },
        { name: 'Analytics', lessons: ['Open Rate Optimization', 'Click Rate Strategies', 'Revenue Attribution'] },
      ],
    },
  ];

  const courses: Array<{ id: string; lessonIds: string[] }> = [];

  for (const cc of courseConfigs) {
    const course = await prisma.course.create({
      data: {
        tenantId,
        name: cc.name,
        slug: cc.slug,
        description: `Master ${cc.name.toLowerCase()} with this comprehensive course.`,
        price: new Prisma.Decimal(cc.price.toFixed(2)),
        currency: 'USD',
        status: 'PUBLISHED',
        accessType: 'PAID',
        enrollmentCount: 0,
        settings: { allowReviews: true, certificateEnabled: true },
      },
    });

    const lessonIds: string[] = [];

    for (let m = 0; m < cc.modules.length; m++) {
      const mod = cc.modules[m]!;
      const module = await prisma.courseModule.create({
        data: {
          courseId: course.id,
          tenantId,
          name: mod.name,
          description: `Module ${m + 1}: ${mod.name}`,
          position: m,
        },
      });

      for (let l = 0; l < mod.lessons.length; l++) {
        const lesson = await prisma.lesson.create({
          data: {
            moduleId: module.id,
            courseId: course.id,
            tenantId,
            name: mod.lessons[l]!,
            description: `Lesson on ${mod.lessons[l]}`,
            contentType: l % 2 === 0 ? 'VIDEO' : 'TEXT',
            videoUrl: l % 2 === 0 ? `https://videos.omniflow.com/lesson-${m}-${l}.mp4` : null,
            duration: randomInt(300, 1800),
            position: l,
            isFree: m === 0 && l === 0,
            content: { body: `Full content for ${mod.lessons[l]}` },
          },
        });
        lessonIds.push(lesson.id);
      }
    }

    courses.push({ id: course.id, lessonIds });
  }

  // 8 Enrollments distributed across courses
  let enrollmentIdx = 0;
  for (const course of courses) {
    const numEnrollments = course === courses[0] ? 4 : 2;
    for (let e = 0; e < numEnrollments; e++) {
      const contact = contacts[enrollmentIdx % contacts.length]!;
      enrollmentIdx++;

      const enrollment = await prisma.enrollment.create({
        data: {
          courseId: course.id,
          tenantId,
          contactId: contact.id,
          status: e < numEnrollments - 1 ? 'ACTIVE' : 'COMPLETED',
          progress: { completedLessons: randomInt(0, course.lessonIds.length) },
          completedAt: e >= numEnrollments - 1 ? randomDate(10, 1) : null,
        },
      });

      // Create progress for some lessons
      const numProgress = randomInt(1, Math.min(5, course.lessonIds.length));
      for (let lp = 0; lp < numProgress; lp++) {
        await prisma.lessonProgress.create({
          data: {
            enrollmentId: enrollment.id,
            lessonId: course.lessonIds[lp]!,
            tenantId,
            status: lp < numProgress - 1 ? 'COMPLETED' : 'IN_PROGRESS',
            completedAt: lp < numProgress - 1 ? randomDate(20, 1) : null,
          },
        });
      }
    }

    // Update enrollment count
    await prisma.course.update({
      where: { id: course.id },
      data: { enrollmentCount: numEnrollments },
    });
  }
}

// ===========================================================================
// Review Campaigns
// ===========================================================================

async function createReviewCampaigns(
  tenantId: string,
  contacts: Array<{ id: string; firstName: string; lastName: string }>,
) {
  const campaigns = [
    { name: 'Post-Visit Review Campaign', status: 'ACTIVE' as const },
    { name: 'Quarterly Satisfaction Check', status: 'PAUSED' as const },
  ];

  for (const cc of campaigns) {
    const campaign = await prisma.reviewCampaign.create({
      data: {
        tenantId,
        name: cc.name,
        status: cc.status,
        redirectUrl: 'https://g.page/r/review',
        sentCount: 0,
        responseCount: 0,
        positiveCount: 0,
      },
    });

    // 10 review requests
    let sentCount = 0;
    let responseCount = 0;
    let positiveCount = 0;

    for (let i = 0; i < 10; i++) {
      const contact = contacts[i % contacts.length]!;
      const responded = i < 5;
      const rating = responded ? randomInt(3, 5) : null;

      await prisma.reviewRequest.create({
        data: {
          campaignId: campaign.id,
          tenantId,
          contactId: contact.id,
          status: responded ? 'RESPONDED' : (i < 7 ? 'OPENED' : 'SENT'),
          channel: i % 2 === 0 ? 'email' : 'sms',
          rating,
          feedback: responded ? `${contact.firstName} had a ${rating! >= 4 ? 'great' : 'good'} experience.` : null,
          sentAt: randomDate(30, 5),
          openedAt: i < 7 ? randomDate(29, 3) : null,
          respondedAt: responded ? randomDate(28, 1) : null,
        },
      });

      sentCount++;
      if (responded) responseCount++;
      if (rating && rating >= 4) positiveCount++;
    }

    // 5 actual reviews
    for (let i = 0; i < 5; i++) {
      const contact = contacts[i % contacts.length]!;
      const rating = randomInt(4, 5);

      await prisma.review.create({
        data: {
          tenantId,
          contactId: contact.id,
          platform: randomElement(['google', 'yelp', 'facebook']),
          rating,
          title: rating === 5 ? 'Excellent service!' : 'Great experience',
          body: rating === 5
            ? `${contact.firstName} had an amazing experience. Highly recommended!`
            : `Good service, ${contact.firstName} was satisfied with the results.`,
          authorName: `${contact.firstName} ${contact.lastName}`,
          reviewUrl: `https://review-platform.com/r/${Math.random().toString(36).substring(7)}`,
          createdAt: randomDate(60, 1),
        },
      });
    }

    await prisma.reviewCampaign.update({
      where: { id: campaign.id },
      data: { sentCount, responseCount, positiveCount },
    });
  }
}

// ===========================================================================
// Social Posts (10 per sub-account)
// ===========================================================================

async function createSocialPosts(tenantId: string) {
  const postContents = [
    'Excited to announce our new partnership! Stay tuned for big things.',
    'Check out our latest blog post on industry trends for 2025.',
    '5 tips to improve your morning routine. Thread below.',
    'We are hiring! Join our growing team. Link in bio.',
    'Happy Monday! What are your goals for this week?',
    'Behind the scenes look at our team retreat last weekend.',
    'Customer spotlight: See how @client achieved 200% growth.',
    'New feature alert! We just launched our dashboard redesign.',
    'Thank you for 10K followers! You make this community amazing.',
    'Weekend read: Our founder shares lessons from the past year.',
  ];

  for (let i = 0; i < 10; i++) {
    const status = i < 4 ? 'PUBLISHED' : (i < 7 ? 'SCHEDULED' : 'DRAFT');

    await prisma.socialPost.create({
      data: {
        tenantId,
        content: postContents[i]!,
        platforms: [randomElement(['FACEBOOK', 'INSTAGRAM', 'LINKEDIN', 'TWITTER'])],
        status,
        scheduledAt: status === 'SCHEDULED' ? daysAgo(-randomInt(1, 14)) : null,
        publishedAt: status === 'PUBLISHED' ? randomDate(30, 1) : null,
        approvalStatus: status === 'PUBLISHED' ? 'APPROVED' : 'PENDING',
        results: status === 'PUBLISHED'
          ? { likes: randomInt(10, 500), comments: randomInt(0, 50), shares: randomInt(0, 30), impressions: randomInt(500, 10000) }
          : null,
        createdAt: randomDate(30, 0),
      },
    });
  }
}

// ===========================================================================
// Websites (2 per sub-account)
// ===========================================================================

async function createWebsites(tenantId: string) {
  const websiteConfigs = [
    { name: 'Main Website', domain: 'www.example.com', published: true },
    { name: 'Landing Pages', domain: 'pages.example.com', published: false },
  ];

  for (const wc of websiteConfigs) {
    const website = await prisma.website.create({
      data: {
        tenantId,
        name: wc.name,
        domain: wc.domain,
        isPublished: wc.published,
        settings: {
          theme: 'modern',
          fontFamily: 'Inter',
          headerStyle: 'sticky',
          footerStyle: 'full',
        },
      },
    });

    // 5 pages per website
    const pageConfigs = [
      { name: 'Home', slug: 'home', path: '/' },
      { name: 'About', slug: 'about', path: '/about' },
      { name: 'Services', slug: 'services', path: '/services' },
      { name: 'Contact', slug: 'contact', path: '/contact' },
      { name: 'Blog', slug: 'blog', path: '/blog' },
    ];

    for (let p = 0; p < pageConfigs.length; p++) {
      const pc = pageConfigs[p]!;
      await prisma.page.create({
        data: {
          tenantId,
          websiteId: website.id,
          name: pc.name,
          slug: pc.slug,
          path: pc.path,
          title: `${pc.name} - ${wc.name}`,
          metaDescription: `${pc.name} page for ${wc.name}`,
          status: wc.published ? 'PUBLISHED' : 'DRAFT',
          position: p,
          content: {
            sections: [
              { type: 'hero', title: `Welcome to ${pc.name}`, subtitle: 'Your trusted partner' },
              { type: 'content', body: `Content for ${pc.name} page` },
            ],
          },
        },
      });
    }
  }
}

// ===========================================================================
// Funnels (2 per sub-account)
// ===========================================================================

async function createFunnels(tenantId: string) {
  const funnelConfigs = [
    {
      name: 'Free Consultation Funnel',
      type: 'LEAD' as const,
      pages: [
        { name: 'Landing Page', slug: 'consultation-landing' },
        { name: 'Booking Form', slug: 'consultation-form' },
        { name: 'Thank You', slug: 'consultation-thank-you' },
      ],
    },
    {
      name: 'Webinar Registration',
      type: 'WEBINAR' as const,
      pages: [
        { name: 'Webinar Landing', slug: 'webinar-landing' },
        { name: 'Registration', slug: 'webinar-registration' },
        { name: 'Confirmation', slug: 'webinar-confirmation' },
        { name: 'Replay', slug: 'webinar-replay' },
      ],
    },
  ];

  for (const fc of funnelConfigs) {
    const funnel = await prisma.funnel.create({
      data: {
        tenantId,
        name: fc.name,
        description: `${fc.name} - automated lead generation`,
        type: fc.type,
        status: 'PUBLISHED',
        stats: {
          views: randomInt(500, 5000),
          conversions: randomInt(50, 500),
          conversionRate: (Math.random() * 20 + 5).toFixed(1),
        },
        settings: {
          trackingEnabled: true,
          pixelId: null,
          customCss: '',
        },
      },
    });

    for (let p = 0; p < fc.pages.length; p++) {
      const page = fc.pages[p]!;
      await prisma.page.create({
        data: {
          tenantId,
          funnelId: funnel.id,
          name: page.name,
          slug: page.slug,
          title: page.name,
          metaDescription: `${page.name} - ${fc.name}`,
          status: 'PUBLISHED',
          position: p,
          content: {
            sections: [
              { type: 'hero', title: page.name, subtitle: fc.name },
              { type: 'form', formId: null },
              { type: 'cta', text: 'Get Started', url: '#' },
            ],
          },
        },
      });
    }
  }
}

// ===========================================================================
// Reports (3 per sub-account)
// ===========================================================================

async function createReports(tenantId: string) {
  const reportConfigs = [
    {
      name: 'Sales Dashboard',
      type: 'dashboard',
      config: {
        widgets: [
          { type: 'kpi', metric: 'total_revenue', label: 'Total Revenue' },
          { type: 'kpi', metric: 'deals_won', label: 'Deals Won' },
          { type: 'chart', chartType: 'line', metric: 'revenue_over_time', period: '30d' },
          { type: 'chart', chartType: 'bar', metric: 'deals_by_stage', pipeline: 'sales' },
          { type: 'table', metric: 'top_deals', limit: 10 },
        ],
      },
    },
    {
      name: 'Marketing Report',
      type: 'report',
      config: {
        widgets: [
          { type: 'kpi', metric: 'new_contacts', label: 'New Contacts' },
          { type: 'kpi', metric: 'form_submissions', label: 'Form Submissions' },
          { type: 'chart', chartType: 'pie', metric: 'contacts_by_source' },
          { type: 'chart', chartType: 'line', metric: 'website_visits', period: '30d' },
        ],
      },
      schedule: '0 8 * * 1',
    },
    {
      name: 'Team Performance',
      type: 'report',
      config: {
        widgets: [
          { type: 'table', metric: 'team_leaderboard' },
          { type: 'chart', chartType: 'bar', metric: 'tasks_completed_by_user' },
          { type: 'kpi', metric: 'avg_response_time', label: 'Avg Response Time' },
        ],
      },
    },
  ];

  for (const rc of reportConfigs) {
    await prisma.report.create({
      data: {
        tenantId,
        name: rc.name,
        type: rc.type,
        config: rc.config,
        schedule: (rc as any).schedule || null,
        lastRunAt: randomDate(7, 0),
      },
    });
  }
}

// ===========================================================================
// Analytics Events (100 per sub-account)
// ===========================================================================

async function createAnalyticsEvents(
  tenantId: string,
  contacts: Array<{ id: string }>,
) {
  const eventTypes = ['page_view', 'form_view', 'form_submit', 'button_click', 'link_click', 'video_play', 'scroll_depth'];
  const eventNames = ['Homepage Visit', 'Contact Form View', 'Form Submitted', 'CTA Clicked', 'Blog Link', 'Demo Video', 'Page Scrolled'];
  const utmSources = ['google', 'facebook', 'linkedin', 'twitter', 'email', null];
  const utmMediums = ['cpc', 'social', 'organic', 'email', null];
  const utmCampaigns = ['spring_promo', 'brand_awareness', 'retargeting', 'newsletter', null];
  const pages = ['/', '/about', '/services', '/contact', '/blog', '/pricing', '/demo'];

  const events = [];
  for (let i = 0; i < 100; i++) {
    events.push({
      tenantId,
      contactId: i < 60 ? contacts[i % contacts.length]!.id : null,
      sessionId: `sess_${Math.random().toString(36).substring(2, 10)}`,
      eventType: eventTypes[i % eventTypes.length]!,
      eventName: eventNames[i % eventNames.length]!,
      properties: { value: randomInt(1, 100), label: `event_${i}` },
      pageUrl: `https://www.example.com${pages[i % pages.length]}`,
      referrer: i % 3 === 0 ? 'https://www.google.com' : null,
      utmSource: utmSources[i % utmSources.length],
      utmMedium: utmMediums[i % utmMediums.length],
      utmCampaign: utmCampaigns[i % utmCampaigns.length],
      ipAddress: `${randomInt(1, 255)}.${randomInt(0, 255)}.${randomInt(0, 255)}.${randomInt(1, 255)}`,
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
      createdAt: randomDate(90, 0),
    });
  }

  await prisma.analyticsEvent.createMany({ data: events });
}

// ===========================================================================
// Audit Logs (50 per sub-account)
// ===========================================================================

async function createAuditLogs(
  tenantId: string,
  users: Array<{ id: string }>,
) {
  const actions = [
    'contact.created', 'contact.updated', 'contact.deleted',
    'pipeline.created', 'opportunity.created', 'opportunity.stage_changed',
    'form.created', 'form.published', 'workflow.activated',
    'appointment.booked', 'appointment.cancelled',
    'user.login', 'user.settings_changed',
    'payment.received', 'invoice.sent',
    'report.generated',
  ];

  const entityTypes = [
    'contact', 'pipeline', 'opportunity', 'form', 'workflow',
    'appointment', 'user', 'payment', 'invoice', 'report',
  ];

  const logs = [];
  for (let i = 0; i < 50; i++) {
    logs.push({
      tenantId,
      userId: users[i % users.length]!.id,
      action: actions[i % actions.length]!,
      entityType: entityTypes[i % entityTypes.length]!,
      entityId: `entity_${i}`,
      metadata: { ip: `192.168.1.${randomInt(1, 254)}`, browser: 'Chrome' },
      ipAddress: `192.168.1.${randomInt(1, 254)}`,
      userAgent: 'Mozilla/5.0',
      createdAt: randomDate(90, 0),
    });
  }

  await prisma.auditLog.createMany({ data: logs });
}

// ===========================================================================
// Notifications (10 per sub-account)
// ===========================================================================

async function createNotifications(
  tenantId: string,
  users: Array<{ id: string }>,
) {
  const notificationConfigs = [
    { type: 'new_lead', title: 'New Lead Received', body: 'John Smith submitted the Contact Us form.' },
    { type: 'appointment_booked', title: 'Appointment Booked', body: 'Mary Johnson booked a consultation for tomorrow at 2pm.' },
    { type: 'form_submitted', title: 'Form Submission', body: 'Free Consultation form received a new submission.' },
    { type: 'payment_received', title: 'Payment Received', body: 'Payment of $149.00 received from David Wilson.' },
    { type: 'task_assigned', title: 'Task Assigned', body: 'You have been assigned: Follow up with lead #342.' },
    { type: 'message_received', title: 'New Message', body: 'You received a new email from sarah@example.com.' },
    { type: 'workflow_completed', title: 'Workflow Completed', body: 'New Lead Nurture workflow completed for 5 contacts.' },
    { type: 'review_received', title: 'New Review', body: 'You received a 5-star review on Google!' },
    { type: 'deal_won', title: 'Deal Won!', body: 'Congratulations! Deal with Acme Corp worth $12,500 was marked as won.' },
    { type: 'deal_lost', title: 'Deal Lost', body: 'Deal with Globex Industries was marked as lost. Reason: Budget constraints.' },
  ];

  for (let i = 0; i < 10; i++) {
    const nc = notificationConfigs[i]!;
    await prisma.notification.create({
      data: {
        tenantId,
        userId: users[i % users.length]!.id,
        type: nc.type,
        title: nc.title,
        body: nc.body,
        data: { timestamp: randomDate(14, 0).toISOString() },
        isRead: i < 4,
        readAt: i < 4 ? randomDate(3, 0) : null,
        createdAt: randomDate(14, 0),
      },
    });
  }
}

// ===========================================================================
// Run
// ===========================================================================

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
