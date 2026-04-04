# Omniflow

**All-in-one CRM, marketing automation, and business management SaaS platform**

A fully-featured GoHighLevel-style multi-tenant SaaS platform built for agencies managing multiple client accounts and businesses needing an integrated growth platform. Built with Next.js, NestJS, Prisma, PostgreSQL, and AWS.

---

## Table of Contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Quick Start](#quick-start)
5. [Project Structure](#project-structure)
6. [Module Details](#module-details)
7. [API Documentation](#api-documentation)
8. [Environment Variables](#environment-variables)
9. [Deployment](#deployment)
10. [Demo Accounts](#demo-accounts)
11. [Testing](#testing)
12. [Contributing](#contributing)
13. [License](#license)

---

## Features

### Core Capabilities (17 Modules)

**Priority 0 — Foundation:**
- **Auth & Multi-tenancy**: Agency mode, business mode, RBAC, permission delegation, user impersonation, SSO-ready
- **CRM & Contacts**: 50+ field types, tags, segments, bulk import/export, deduplication, custom fields
- **Pipelines & Opportunities**: Kanban board, drag-and-drop stages, win/loss tracking, deal amounts, forecasting
- **Conversations Inbox**: Unified email/SMS, threaded messages, assignment routing, reply tracking

**Priority 1 — Growth:**
- **Email & SMS Engine**: AWS SES integration, Twilio SMS, templating, A/B testing, delivery tracking, suppression lists
- **Workflow Automation**: Visual builder, 11 step types, conditional branching, delay/wait, execution engine, webhook triggers
- **Forms & Surveys**: Drag-drop builder, conditional logic, anti-spam rules, auto-contact creation, response routing
- **Calendar & Booking**: Availability rules, meeting types, reminders, round-robin assignment, timezone handling
- **Funnel & Website Builder**: Drag-drop page builder, SEO tools, custom domains, versioning, A/B testing

**Priority 2 — Premium:**
- **Memberships & Courses**: Course modules/lessons, enrollment, progress tracking, gated content, certificates
- **Payments & Commerce**: Stripe integration, subscriptions, invoices, checkout, coupons, usage metering
- **Reputation Management**: Review campaigns, feedback capture, response routing, sentiment tracking
- **Social Planner**: Multi-platform scheduling (Facebook, Instagram, LinkedIn, Twitter), approval workflow, analytics
- **Reporting & Analytics**: 9 report types (revenue, pipeline, activity, forecast, member, course, form, funnel, email), export to PDF/CSV
- **SaaS Billing & White-label**: Usage metering, feature entitlements, custom branding (logo, colors, domain), plan management
- **Integrations & APIs**: API keys, REST + GraphQL support, webhooks, OpenAPI documentation, Zapier-ready
- **Admin Console**: Tenant management, queue monitoring, feature flags, system health, audit logs

---

## Architecture

### System Diagram

```
                                  ┌─────────────────┐
                                  │   CloudFront    │
                                  │   CDN + WAF     │
                                  └────────┬────────┘
                                           │
                                  ┌────────┴────────┐
                                  │ ALB / Nginx     │
                                  │ Load Balancer   │
                                  └────────┬────────┘
                         ┌─────────────────┼──────────────────┐
                         │                 │                  │
              ┌──────────┴───┐  ┌──────────┴────┐  ┌─────────┴──────┐
              │  Next.js 14  │  │  NestJS API   │  │  Admin Panel   │
              │  Frontend    │  │  (port 4000)  │  │  Next.js 14    │
              │  (port 3000) │  │               │  │  (port 3002)   │
              └──────────────┘  └────────┬──────┘  └────────────────┘
                                         │
                 ┌───────────────────────┼────────────────────┐
                 │                       │                    │
          ┌──────┴──────┐      ┌─────────┴────────┐  ┌────────┴────────┐
          │ PostgreSQL  │      │     Redis        │  │   S3 Storage    │
          │ (RDS)       │      │  (ElastiCache)   │  │   + CloudFront  │
          │ Primary +   │      │  Cache + Queue   │  │                 │
          │ Read Replica│      │  + Pub/Sub       │  │                 │
          └─────────────┘      └─────────────────┘  └─────────────────┘
                                         │
                                ┌────────┴────────┐
                                │  Worker Service │
                                │  (BullMQ Jobs)  │
                                │  - Workflows    │
                                │  - Email/SMS    │
                                │  - Webhooks     │
                                │  - Reporting    │
                                └─────────────────┘
```

### Data Flow

1. **Frontend** (Next.js) makes requests to **API** (NestJS)
2. **API** queries **PostgreSQL** via Prisma ORM, with automatic tenant isolation
3. **Cache** (Redis) stores session, JWT, and computed data
4. **Workers** (BullMQ) execute async tasks (emails, SMS, workflows, webhooks)
5. **Storage** (S3) holds user uploads and static assets
6. **Real-time** updates via Socket.io from API to connected clients

### Tenant Isolation

Every database table holding tenant-specific data includes a `tenant_id` column. All queries are scoped through Prisma middleware that automatically injects tenant context from the authenticated user's session, preventing cross-tenant data leakage at the ORM level.

---

## Tech Stack

### Frontend
- **Next.js 14** with App Router, TypeScript, SSR/CSR
- **Tailwind CSS** for styling
- **shadcn/ui** for component library
- **React Query** for data fetching and caching
- **Zustand** for state management
- **React Hook Form** for form handling
- **Zod** for schema validation
- **Socket.io-client** for real-time features

### Backend
- **NestJS** with TypeScript, dependency injection, decorators
- **Prisma ORM** for database access and migrations
- **BullMQ** for background job queue
- **Socket.io** for WebSocket communication
- **Passport.js** for authentication strategies
- **class-validator** for request validation

### Database & Cache
- **PostgreSQL 15+** with row-level security patterns
- **Redis 7+** for caching, session storage, BullMQ queue, and pub/sub

### External Services
- **AWS S3** (or MinIO locally) for object storage
- **AWS SES** for email delivery
- **Twilio** for SMS and WhatsApp
- **Stripe** for payments and subscriptions
- **AWS CloudFront** for CDN
- **AWS Route53** for DNS

### Infrastructure
- **Docker** for containerization
- **Terraform** for infrastructure as code
- **AWS ECS/EC2** for compute
- **AWS RDS** for managed PostgreSQL
- **AWS ElastiCache** for managed Redis

---

## Quick Start

### Prerequisites

- **Node.js** >= 20.0.0
- **Docker** >= 24.0.0
- **Docker Compose** >= 2.0.0
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/omniflow.git
cd omniflow
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Infrastructure

```bash
docker-compose up -d
```

This starts PostgreSQL, Redis, and MinIO (S3-compatible). Wait for healthchecks to pass:

```bash
docker-compose ps
# All services should show "healthy" status after ~30 seconds
```

### 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your local development values. Key ones:

```env
NODE_ENV=development
APP_URL=http://localhost:3000
API_URL=http://localhost:3001
ADMIN_URL=http://localhost:3002

DATABASE_URL=postgresql://omniflow:omniflow_password@localhost:5432/omniflow_dev?schema=public
REDIS_URL=redis://localhost:6379
REDIS_KEY_PREFIX=omniflow:

JWT_SECRET=dev-secret-key-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-key

STRIPE_SECRET_KEY=sk_test_
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=

STORAGE_DRIVER=local
STORAGE_LOCAL_PATH=./uploads
```

For generated secrets (JWT, encryption key):

```bash
# Generate 32-byte encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate JWT secrets
openssl rand -hex 64
openssl rand -hex 64
```

### 5. Initialize Database

```bash
npm run db:generate    # Generate Prisma client
npm run db:migrate     # Run migrations
npm run db:seed        # Seed demo data
```

### 6. Start Development Server

In separate terminals:

```bash
# Terminal 1: Run all services with hot-reload
npm run dev

# Terminal 2 (optional): Monitor BullMQ queues
npm run -w @omniflow/worker dev
```

The app will be available at:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001
- **Admin Panel**: http://localhost:3002
- **MinIO Console**: http://localhost:9001 (minioadmin / minioadmin)
- **Prisma Studio**: http://localhost:5555 (when running `npm run db:studio`)

### 7. Test Demo Accounts

Log in to http://localhost:3000 with:

```
Email:    admin@demo.omniflow.com
Password: Demo123!@#
```

---

## Project Structure

```
omniflow/
├── apps/
│   ├── web/                      # Next.js 14 customer frontend (port 3000)
│   │   ├── src/
│   │   │   ├── app/             # App Router pages
│   │   │   ├── components/      # React components
│   │   │   ├── hooks/           # Custom React hooks
│   │   │   ├── lib/             # Utilities
│   │   │   └── styles/          # CSS
│   │   └── package.json
│   │
│   ├── api/                      # NestJS backend (port 4000)
│   │   ├── src/
│   │   │   ├── auth/            # Authentication & RBAC
│   │   │   ├── crm/             # CRM & Contacts
│   │   │   ├── pipelines/       # Opportunities & Pipeline
│   │   │   ├── conversations/   # Email/SMS Inbox
│   │   │   ├── workflows/       # Automation Engine
│   │   │   ├── forms/           # Form Builder
│   │   │   ├── calendars/       # Booking & Calendar
│   │   │   ├── funnels/         # Website & Funnel Builder
│   │   │   ├── payments/        # Payments & Invoices
│   │   │   ├── memberships/     # Courses & Membership
│   │   │   ├── reputation/      # Review Management
│   │   │   ├── social/          # Social Media Planner
│   │   │   ├── reporting/       # Analytics & Reports
│   │   │   ├── integrations/    # API & Webhook Management
│   │   │   ├── admin/           # Admin Console
│   │   │   ├── tenants/         # Tenant Management
│   │   │   ├── users/           # User Management
│   │   │   ├── notifications/   # Email/SMS/Push
│   │   │   ├── socket/          # WebSocket Gateway
│   │   │   ├── common/          # Guards, filters, pipes
│   │   │   ├── prisma/          # Database access layer
│   │   │   └── main.ts          # Application entry point
│   │   └── package.json
│   │
│   ├── admin/                    # Next.js 14 admin panel (port 3002)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   └── lib/
│   │   └── package.json
│   │
│   └── worker/                   # BullMQ background workers (port 4001)
│       ├── src/
│       │   ├── queues/          # BullMQ queue definitions
│       │   ├── processors/      # Job processors
│       │   └── main.ts
│       └── package.json
│
├── packages/
│   ├── database/                 # Prisma ORM (72 models)
│   │   ├── prisma/
│   │   │   ├── schema.prisma    # Database schema
│   │   │   └── migrations/      # Version-controlled migrations
│   │   ├── src/
│   │   │   ├── index.ts         # Prisma client export
│   │   │   └── seed.ts          # Database seeding
│   │   └── package.json
│   │
│   ├── shared/                   # Shared types, validators, utils
│   │   ├── src/
│   │   │   ├── types/           # TypeScript types & interfaces
│   │   │   ├── validators/      # Zod schemas
│   │   │   ├── constants/       # Application constants
│   │   │   └── utils/           # Utility functions
│   │   └── package.json
│   │
│   ├── config/                   # Environment config loader
│   │   ├── src/
│   │   │   └── index.ts         # Config validation & export
│   │   └── package.json
│   │
│   └── ui/                       # Shared UI components (optional)
│       └── package.json
│
├── infrastructure/
│   └── terraform/                # AWS IaC
│       ├── main.tf
│       ├── variables.tf
│       ├── outputs.tf
│       └── modules/
│
├── docker/                       # Docker configurations
│   ├── Dockerfile.api
│   ├── Dockerfile.web
│   ├── Dockerfile.admin
│   ├── Dockerfile.worker
│   └── postgres/
│       └── init/                # Database initialization scripts
│
├── .github/
│   └── workflows/               # GitHub Actions CI/CD
│
├── docker-compose.yml           # Development environment
├── docker-compose.prod.yml      # Production-like environment
├── ARCHITECTURE.md              # Architecture & design docs
├── DEPLOY.md                    # Deployment guide
├── README.md                    # This file
└── package.json                 # Workspace root
```

---

## Module Details

### 1. Auth & Multi-tenancy

Handles authentication, authorization, and tenant isolation across all services.

**Key Features:**
- JWT-based access/refresh token flow with httpOnly secure cookies
- RBAC with permission guards on every endpoint
- Multi-tenant (Agency + Business) modes with user impersonation
- Tenant isolation enforced at middleware level
- Password hashing with bcrypt, account lockout after failed attempts

**Key Endpoints:**
- `POST /auth/login` — Authenticate user
- `POST /auth/refresh` — Refresh access token
- `POST /auth/logout` — Clear session
- `POST /auth/impersonate/:userId` — Agency admin impersonates user
- `GET /auth/me` — Get current user & permissions

**Database Models:** User, Tenant, TenantRole, Permission, Session

---

### 2. CRM & Contacts

Centralized contact and customer management with advanced field types and segmentation.

**Key Features:**
- 50+ field types (text, email, phone, address, date, select, multi-select, checkbox, etc.)
- Tags and dynamic segments with conditional logic
- Bulk import (CSV, Excel) with duplicate detection and merging
- Bulk export with filtered columns
- Custom field definitions per tenant
- Contact history and activity timeline

**Key Endpoints:**
- `GET /crm/contacts` — List contacts (supports filtering, pagination)
- `POST /crm/contacts` — Create contact
- `PATCH /crm/contacts/:id` — Update contact
- `POST /crm/contacts/import` — Bulk import from file
- `POST /crm/contacts/:id/merge` — Merge duplicate contacts
- `GET /crm/contacts/:id/activity` — Get contact timeline

**Database Models:** Contact, ContactField, ContactTag, Segment, ContactActivity

---

### 3. Pipelines & Opportunities

Sales pipeline management with drag-and-drop interface, forecasting, and win/loss tracking.

**Key Features:**
- Customizable pipeline stages per tenant
- Drag-drop opportunity movement between stages
- Opportunity amounts, close dates, and probability
- Win/loss tracking with reason codes
- Pipeline forecasting by stage and owner
- Bulk stage updates and assignments

**Key Endpoints:**
- `GET /pipelines/:pipelineId/opportunities` — List opportunities with stage
- `POST /pipelines/:pipelineId/opportunities` — Create opportunity
- `PATCH /pipelines/:pipelineId/opportunities/:id` — Update opportunity
- `PATCH /pipelines/:pipelineId/opportunities/:id/stage` — Move to stage
- `POST /pipelines/:pipelineId/opportunities/:id/win` — Mark as won
- `POST /pipelines/:pipelineId/opportunities/:id/lose` — Mark as lost
- `GET /pipelines/:pipelineId/forecast` — Get revenue forecast

**Database Models:** Pipeline, PipelineStage, Opportunity, OpportunityActivity, OpportunityHistory

---

### 4. Conversations Inbox

Unified inbox for email and SMS conversations with threaded messaging and assignment routing.

**Key Features:**
- Unified email and SMS threads (grouped by contact)
- Automatic contact creation from incoming messages
- Message assignment to team members with routing rules
- Reply tracking and response time metrics
- Bulk actions (archive, mark read, reassign)
- Search and filter by sender, date, status

**Key Endpoints:**
- `GET /conversations/threads` — List conversation threads
- `GET /conversations/threads/:id/messages` — Get thread messages
- `POST /conversations/threads/:id/reply` — Send reply (email or SMS)
- `PATCH /conversations/threads/:id/assign` — Assign to user
- `PATCH /conversations/threads/:id/archive` — Archive thread

**Database Models:** ConversationThread, ConversationMessage, MessageAttachment, RoutingRule

---

### 5. Email & SMS Engine

Email and SMS delivery with templating, tracking, and suppression lists.

**Key Features:**
- WYSIWYG email template builder
- SMS character encoding optimization (GSM 7-bit vs UCS2)
- A/B testing for subject lines and content
- Delivery tracking (sent, delivered, bounced, complained)
- Suppression lists (bounced, unsubscribed, complained)
- Rate limiting and throttling
- Reply tracking with webhook integration

**Key Endpoints:**
- `POST /messaging/email/send` — Send single email
- `POST /messaging/email/template` — Create template
- `POST /messaging/sms/send` — Send single SMS
- `GET /messaging/campaign/:id/stats` — Get delivery stats
- `GET /messaging/suppression-list` — View suppressed addresses

**Database Models:** EmailTemplate, SMSTemplate, MessageLog, MessageDeliveryStatus, SuppressionList

---

### 6. Workflow Automation

Visual workflow builder with 11 step types, conditional logic, and execution engine.

**Key Features:**
- 11 workflow step types: Delay, Condition, Send Email, Send SMS, Create Contact, Update Contact, Create Opportunity, Update Opportunity, Webhook Call, Branch, End
- Drag-drop workflow canvas with auto-save
- Conditional branching based on contact fields or previous step results
- Trigger types: Contact created, Form submitted, Tag added, Manual trigger, Webhook trigger
- Execution logs with detailed step-by-step trace
- A/B testing for workflow variants
- Pause/resume capabilities

**Key Endpoints:**
- `GET /workflows` — List workflows
- `POST /workflows` — Create workflow
- `PATCH /workflows/:id` — Update workflow
- `POST /workflows/:id/activate` — Activate workflow
- `POST /workflows/:id/test` — Test workflow with sample data
- `GET /workflows/:id/executions` — View execution history

**Database Models:** Workflow, WorkflowStep, WorkflowTrigger, WorkflowExecution, WorkflowExecutionStep

---

### 7. Forms & Surveys

Form builder with conditional logic, anti-spam protection, and auto-contact creation.

**Key Features:**
- Drag-drop form builder with 15+ field types
- Conditional field visibility based on previous answers
- CAPTCHA and honeypot anti-spam
- Multi-page forms with progress bar
- Response routing (email notification, webhook, contact creation)
- Response analytics and export
- Embed code generation for external sites

**Key Endpoints:**
- `GET /forms` — List forms
- `POST /forms` — Create form
- `GET /forms/:id/responses` — List responses
- `POST /forms/:id/submit` — Submit response
- `GET /forms/:id/stats` — Get response analytics
- `GET /forms/:id/embed-code` — Get embed code

**Database Models:** Form, FormField, FormResponse, FormResponseValue, FormAnalytics

---

### 8. Calendar & Booking

Appointment scheduling with availability rules, meeting types, and timezone handling.

**Key Features:**
- Custom availability rules (working hours, blackout dates, buffer time)
- Meeting types with custom duration, location, questions
- Timezone-aware scheduling
- Reminder notifications (email/SMS) before appointments
- Round-robin and specific user assignment
- Calendar sync (Google Calendar, Outlook ready)
- Cancellation and rescheduling workflows

**Key Endpoints:**
- `GET /calendars/availability/:slug` — Check availability
- `POST /calendars/book` — Book appointment
- `GET /calendars/appointments` — List appointments
- `PATCH /calendars/appointments/:id/reschedule` — Reschedule
- `POST /calendars/appointments/:id/cancel` — Cancel

**Database Models:** Calendar, MeetingType, CalendarAvailability, Appointment, AppointmentReminder

---

### 9. Funnel & Website Builder

Drag-drop landing page and funnel builder with SEO and domain mapping.

**Key Features:**
- Drag-drop page builder with 30+ block types (hero, text, image, video, CTA, form, testimonial, pricing, countdown)
- In-builder real-time preview (desktop, tablet, mobile)
- SEO tools (meta tags, OpenGraph, sitemap generation)
- Custom domain mapping with SSL auto-renewal
- Page versioning with A/B testing
- Conversion tracking and analytics per page
- Template library

**Key Endpoints:**
- `GET /funnels` — List funnels
- `POST /funnels` — Create funnel
- `GET /funnels/:id/pages` — List pages in funnel
- `POST /funnels/:id/pages` — Create page
- `PATCH /funnels/:id/pages/:pageId` — Update page
- `GET /funnels/:id/analytics` — Get conversion data
- `POST /funnels/:id/pages/:pageId/publish` — Publish version

**Database Models:** Funnel, FunnelPage, FunnelBlock, PageVersion, PageAnalytics, CustomDomain

---

### 10. Memberships & Courses

Online course and membership management with progress tracking and gated content.

**Key Features:**
- Hierarchical course structure (modules > lessons > content)
- Multiple content types (video, text, PDF, quiz, assignment)
- Lesson completion tracking and progress bar
- Drip-feed content (release by date)
- Course prerequisites and requirements
- Certificate generation on completion
- Member enrollment and cohort management
- Membership tiers with benefit restrictions

**Key Endpoints:**
- `GET /courses` — List courses
- `POST /courses` — Create course
- `GET /courses/:id/progress` — Get learner progress
- `POST /courses/:id/enroll` — Enroll user
- `POST /courses/:id/lessons/:lessonId/complete` — Mark lesson complete
- `GET /courses/:id/certificate` — Generate certificate

**Database Models:** Course, CourseModule, CourseLesson, CourseContent, CourseLessonCompletion, CourseEnrollment, Certificate, MembershipTier

---

### 11. Payments & Commerce

Stripe-powered payments, subscriptions, invoices, and checkout pages.

**Key Features:**
- Product and pricing management
- Subscription plans with billing cycles (monthly, annual, custom)
- One-time and recurring charges
- Invoice generation and email delivery
- Coupon and discount management
- Checkout page builder (no-code)
- Payment method management (saved cards)
- Refund and dispute tracking
- Webhook integration with Stripe

**Key Endpoints:**
- `GET /payments/products` — List products
- `POST /payments/checkout` — Create checkout session
- `GET /payments/invoices` — List invoices
- `POST /payments/customers/:customerId/subscribe` — Create subscription
- `PATCH /payments/subscriptions/:id` — Update subscription
- `POST /payments/refund` — Initiate refund

**Database Models:** Product, Price, Subscription, Invoice, InvoiceItem, Customer, PaymentIntent, Coupon, Refund

---

### 12. Reputation Management

Review campaign management, feedback collection, and response routing.

**Key Features:**
- Automated review request campaigns (email, SMS, QR code)
- Multi-channel review collection (Google, Facebook, Trustpilot, etc.)
- Sentiment analysis and scoring
- Review response management
- Public review display widget
- Review aggregation across platforms
- Automated escalation workflows for negative reviews

**Key Endpoints:**
- `POST /reputation/campaigns` — Create review campaign
- `GET /reputation/reviews` — List collected reviews
- `POST /reputation/reviews/:id/respond` — Respond to review
- `GET /reputation/stats` — Get rating aggregates

**Database Models:** ReviewCampaign, Review, ReviewResponse, ReviewIntegration

---

### 13. Social Planner

Multi-platform social media scheduling and publishing.

**Key Features:**
- Schedule posts to Facebook, Instagram, LinkedIn, Twitter, TikTok, Pinterest
- Content calendar view (month, week, day)
- Approval workflow before posting
- Media library and reusable content blocks
- Hashtag and mention suggestions
- Post analytics and engagement tracking
- Bulk scheduling and recycled content

**Key Endpoints:**
- `POST /social/posts` — Create post
- `POST /social/posts/:id/schedule` — Schedule post
- `POST /social/posts/:id/publish` — Publish immediately
- `GET /social/calendar` — Get calendar view
- `GET /social/posts/:id/analytics` — Get engagement metrics

**Database Models:** SocialAccount, SocialPost, SocialPostSchedule, SocialAnalytics, SocialComment

---

### 14. Reporting & Analytics

Advanced analytics with 9 report types and export capabilities.

**Key Report Types:**
1. **Revenue Report** — Total income, MRR, ARR, churn rate
2. **Pipeline Report** — Deal flow, forecast, velocity, win rate
3. **Activity Report** — Calls, emails, meetings, tasks by user
4. **Forecast Report** — Revenue projection, deal probability-weighted forecast
5. **Member Report** — Enrollment, completion rates, churn, LTV
6. **Course Report** — Completion rates per course, time spent, quiz scores
7. **Form Report** — Submissions, conversion rate, drop-off analysis
8. **Funnel Report** — Page views, conversions, funnel drop-off
9. **Email Report** — Sent, delivered, opened, clicked, bounce rate

**Key Features:**
- Date range filtering
- Dimension drilling (by user, by product, by campaign)
- Charts and visualizations
- PDF and CSV export
- Scheduled report delivery (email)
- Custom report builder

**Key Endpoints:**
- `GET /reporting/revenue` — Revenue report
- `GET /reporting/pipeline` — Pipeline report
- `GET /reporting/:type` — Get any report type
- `POST /reporting/scheduled` — Create scheduled report

**Database Models:** Report, ReportSchedule, AnalyticsEvent

---

### 15. SaaS Billing & White-label

Multi-tier billing, feature entitlements, and white-label customization.

**Key Features:**
- Usage-based metering (contacts, emails sent, API calls, storage)
- Entitlement management (feature flags per plan)
- Custom branding (logo, primary/secondary colors, domain)
- Plan management and tier upgrades/downgrades
- Invoice management and payment retry logic
- Customer portal for billing & subscription management
- Audit logs for all billing changes

**Key Endpoints:**
- `GET /billing/plans` — List available plans
- `GET /billing/customer` — Get current subscription
- `PATCH /billing/customer/plan` — Change plan
- `GET /billing/usage` — Get current usage metrics
- `PATCH /billing/branding` — Update white-label settings

**Database Models:** BillingPlan, Entitlement, UsageMeter, UsageRecord, BillingCustomer, BrandingSettings

---

### 16. Integrations & APIs

API management and third-party integrations.

**Key Features:**
- API key generation and rotation
- Rate limiting per key (requests/minute, requests/month)
- Webhook management (create, test, retry)
- OpenAPI (Swagger) documentation auto-generated
- Zapier app ready (OAuth + webhooks)
- Callback URL verification
- Request/response logging (audit trail)

**Key Endpoints:**
- `POST /integrations/api-keys` — Generate API key
- `GET /integrations/webhooks` — List webhooks
- `POST /integrations/webhooks` — Create webhook
- `POST /integrations/webhooks/:id/test` — Send test payload
- `GET /integrations/openapi.json` — Get OpenAPI spec

**Database Models:** ApiKey, Webhook, WebhookLog, Integration

---

### 17. Admin Console

Platform-wide administration, monitoring, and configuration.

**Key Features:**
- Tenant lifecycle management (create, suspend, delete)
- User management (roles, permissions, status)
- Queue monitoring (BullMQ job counts, failed jobs, processing time)
- Feature flags (enable/disable features per tenant)
- System health dashboard (uptime, latency, error rates)
- Audit logs (who did what, when, where)
- Environment & version info

**Key Endpoints:**
- `GET /admin/tenants` — List all tenants
- `POST /admin/tenants` — Create tenant
- `PATCH /admin/tenants/:id` — Update tenant
- `GET /admin/queue/stats` — Get queue statistics
- `GET /admin/audit-logs` — View audit trail
- `PATCH /admin/feature-flags/:flag` — Toggle feature

**Database Models:** Tenant, TenantConfig, FeatureFlag, AuditLog, SystemHealth

---

## API Documentation

The API is built with **NestJS** and provides:

- **REST API** at `http://localhost:3001` (or API_URL from .env)
- **OpenAPI/Swagger** documentation at `http://localhost:3001/api`
- **Real-time events** via Socket.io at `http://localhost:3001` (connect and subscribe to `tenant:events`)

### Sample API Requests

**Create a Contact**

```bash
curl -X POST http://localhost:3001/crm/contacts \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "+1-555-0100",
    "source": "web_form"
  }'
```

**Send Email Campaign**

```bash
curl -X POST http://localhost:3001/messaging/email/send \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["john@example.com"],
    "subject": "Welcome to Omniflow",
    "html": "<h1>Hello John</h1>",
    "fromEmail": "noreply@omniflow.app",
    "fromName": "Omniflow"
  }'
```

**Create Workflow**

```bash
curl -X POST http://localhost:3001/workflows \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Contact Onboarding",
    "trigger": {
      "type": "contact_created",
      "conditions": { "source": "web_form" }
    },
    "steps": [
      { "type": "delay", "delaySeconds": 300 },
      {
        "type": "send_email",
        "templateId": "welcome-email",
        "subject": "Welcome!"
      }
    ]
  }'
```

For detailed API specifications, see `/api` route in running app or refer to the `ARCHITECTURE.md` file.

---

## Environment Variables

All environment variables are documented in `.env.example` and required for the app to start.

### Quick Reference

| Variable | Purpose | Example |
|----------|---------|---------|
| `NODE_ENV` | Runtime mode | `development` |
| `APP_URL` | Frontend URL | `http://localhost:3000` |
| `API_URL` | API URL | `http://localhost:3001` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://...` |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` |
| `JWT_SECRET` | Access token signing | 64-char hex string |
| `JWT_REFRESH_SECRET` | Refresh token signing | 64-char hex string |
| `STRIPE_SECRET_KEY` | Stripe API key | `sk_test_...` |
| `TWILIO_ACCOUNT_SID` | Twilio account ID | `AC...` |
| `AWS_ACCESS_KEY_ID` | AWS credentials | (or AWS_PROFILE) |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials | (or IAM role in production) |
| `AWS_REGION` | AWS region | `us-east-1` |
| `AWS_S3_BUCKET` | S3 bucket name | `omniflow-assets-dev` |

Complete list in `.env.example`.

---

## Deployment

### Docker Compose (Production-like)

For staging or demo deployments:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

This builds all services as Docker images and runs them in isolated containers.

### AWS with Terraform

For production deployments on AWS:

```bash
# 1. Install Terraform
# https://www.terraform.io/downloads

# 2. Configure AWS credentials
aws configure

# 3. Initialize Terraform
cd infrastructure/terraform
terraform init

# 4. Plan deployment
terraform plan -out=tfplan

# 5. Apply infrastructure
terraform apply tfplan
```

See `DEPLOY.md` for detailed step-by-step instructions, including:
- Bootstrap Terraform state in S3
- Domain & SSL setup
- Environment secrets in AWS Secrets Manager
- GitHub Actions CI/CD pipeline
- Monitoring and alerting setup
- Database backups and recovery
- Rollback procedures

### CI/CD Pipeline

GitHub Actions workflows in `.github/workflows/` handle:
- Linting and type checking on PR
- Running test suite
- Building Docker images
- Pushing to ECR
- Deploying to ECS on merge to main

---

## Demo Accounts

The database seed script creates demo tenants and users. Access at:

**URL:** http://localhost:3000 (or your deployed domain)

### Agency Admin Account

```
Email:    admin@demo.omniflow.com
Password: Demo123!@#
```

Access both:
- Sunrise Dental Clinic (sub-account 1)
- Metro Real Estate Group (sub-account 2)

### Sub-account Users

**Sunrise Dental Clinic**

| Email | Role | Password |
|-------|------|----------|
| admin@sunrisedental.demo | Admin | Demo123!@# |
| sales@sunrisedental.demo | Sales | Demo123!@# |
| support@sunrisedental.demo | Support | Demo123!@# |

**Metro Real Estate Group**

| Email | Role | Password |
|-------|------|----------|
| admin@metrorealestate.demo | Admin | Demo123!@# |
| sales@metrorealestate.demo | Sales | Demo123!@# |

### Demo Data Includes

- 50+ sample contacts per account with full field data
- 3 pipelines (Sales, Leads, Partnerships) with opportunities
- 20+ sample conversations (email and SMS)
- 3 active workflows (onboarding, follow-up, review request)
- 5 published forms and landing pages
- 10 scheduled social posts
- Sample reports and analytics data

---

## Testing

### Run All Tests

```bash
npm test
```

### Run Tests by App/Package

```bash
# Test API only
npm test -w @omniflow/api

# Test web frontend only
npm test -w @omniflow/web

# Test shared package
npm test -w @omniflow/shared
```

### Run Specific Test File

```bash
npm test -- auth.controller.spec.ts
```

### Watch Mode (during development)

```bash
npm test -- --watch
```

### Coverage Report

```bash
npm test -- --coverage
```

### Test Database

Tests use a separate PostgreSQL instance (configured in test environment). Migrations are auto-run before tests.

### Lint Code

```bash
npm run lint
```

### Type Check

```bash
npm run type-check
```

---

## Contributing

### Branch Strategy

- **main** — Production-ready code
- **develop** — Integration branch
- **feature/** — New features
- **fix/** — Bug fixes
- **docs/** — Documentation only

### Commit Convention

Use descriptive commit messages:

```
feat(auth): add JWT refresh token rotation
fix(crm): prevent contact duplicate on bulk import
docs(api): document webhook signature verification
chore: update dependencies
```

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes with clear commits
3. Push to remote: `git push origin feature/my-feature`
4. Open PR with description linking related issues
5. Pass CI checks (lint, tests, types)
6. Request review from team
7. Merge to develop after approval
8. Deploy to staging for QA

### Code Quality Standards

- **Linting**: ESLint + Prettier
- **Types**: TypeScript with strict mode (`noImplicitAny: true`)
- **Tests**: Jest with >80% coverage target
- **Database**: Prisma migrations (version-controlled)

### Development Workflow

```bash
# Start dev environment
npm run dev

# Make changes
# Test as you go with running instances
npm test -- --watch

# Lint and format
npm run lint

# Commit
git add .
git commit -m "feat(module): description"

# Push and open PR
git push origin feature/branch-name
```

---

## License

MIT License — See LICENSE file for details.

---

## Support & Documentation

- **Architecture Overview**: See `ARCHITECTURE.md`
- **Deployment Guide**: See `DEPLOY.md`
- **API Docs**: http://localhost:3001/api (Swagger UI)
- **Issues**: Open issues in GitHub
- **Discussions**: Start a discussion in GitHub

---

## Roadmap

### Planned Features (Future Releases)

- **AI Enhancements**: Predictive lead scoring, smart email suggestions, auto-reply assistant
- **Advanced Analytics**: ML-powered forecasting, cohort analysis, RFM segmentation
- **Mobile Apps**: Native iOS and Android apps
- **Expanded Integrations**: Salesforce, HubSpot, Zapier deep integrations, custom integrations builder
- **Voice & Video**: Integrated video conferencing, call recording
- **Advanced Automation**: Conditional delays, event-driven branching, multi-language workflows
- **Enterprise Features**: Advanced SSO, audit logs per action, compliance reporting

---

**Created with care for teams building amazing businesses. Questions? Open an issue!**
