# Omniflow - Production Architecture

## Executive Summary

Omniflow is a multi-tenant SaaS platform providing CRM, marketing automation, funnel building, calendar booking, conversations, payments, and white-label capabilities. Built for agencies managing multiple client accounts and businesses needing an all-in-one growth platform.

## System Architecture

```
                                    ┌─────────────────┐
                                    │   CloudFront     │
                                    │   CDN + WAF      │
                                    └────────┬─────────┘
                                             │
                                    ┌────────┴─────────┐
                                    │   ALB / Nginx     │
                                    │   Load Balancer   │
                                    └────────┬─────────┘
                               ┌─────────────┼─────────────┐
                               │             │             │
                    ┌──────────┴──┐  ┌───────┴────┐  ┌────┴──────┐
                    │  Next.js    │  │  NestJS    │  │  Admin    │
                    │  Frontend   │  │  API       │  │  Panel    │
                    │  (SSR/CSR)  │  │  Server    │  │  Next.js  │
                    └─────────────┘  └──────┬─────┘  └───────────┘
                                            │
                    ┌───────────────────────┼───────────────────────┐
                    │                       │                       │
             ┌──────┴──────┐      ┌────────┴────────┐    ┌────────┴────────┐
             │ PostgreSQL  │      │     Redis        │    │   S3 Storage    │
             │ (RDS)       │      │  (ElastiCache)   │    │   + CloudFront  │
             │ Primary +   │      │  Cache + Queue   │    │                 │
             │ Read Replica│      │  + Pub/Sub       │    │                 │
             └─────────────┘      └─────────────────┘    └─────────────────┘
                                            │
                                   ┌────────┴────────┐
                                   │  Worker Service  │
                                   │  (BullMQ Jobs)   │
                                   │  Workflows,      │
                                   │  Emails, SMS,    │
                                   │  Webhooks        │
                                   └─────────────────┘
```

## Module Map

| # | Module | Priority | Dependencies |
|---|--------|----------|-------------|
| 1 | Auth & Tenancy | P0 | None |
| 2 | CRM & Contacts | P0 | Auth |
| 3 | Pipelines & Opportunities | P0 | CRM |
| 4 | Conversations Inbox | P0 | CRM, Messaging |
| 5 | Email/SMS Engine | P0 | Auth, CRM |
| 6 | Workflow Automation | P1 | All P0 modules |
| 7 | Forms & Surveys | P1 | CRM |
| 8 | Calendar & Booking | P1 | CRM, Messaging |
| 9 | Funnel/Website Builder | P1 | Forms |
| 10 | Payments & Commerce | P1 | Auth, CRM |
| 11 | Memberships/Courses | P2 | Payments |
| 12 | Reputation Management | P2 | CRM, Messaging |
| 13 | Social Planner | P2 | Auth |
| 14 | Reporting & Analytics | P2 | All modules |
| 15 | SaaS Billing/White-label | P2 | Auth, Payments |
| 16 | Integrations & APIs | P2 | Auth |
| 17 | Admin Console | P2 | Auth |

## Tech Stack

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, React Query, Zustand, Zod, React Hook Form, Socket.io-client
- **Backend**: NestJS, TypeScript, Prisma ORM, BullMQ, Socket.io, Passport.js
- **Database**: PostgreSQL 15+ with row-level security patterns
- **Cache/Queue**: Redis 7+ (caching, BullMQ job queue, pub/sub for realtime)
- **Storage**: S3-compatible (AWS S3 / MinIO for local dev)
- **Email**: Nodemailer + SES adapter (Postmark fallback)
- **SMS**: Twilio SDK with provider abstraction
- **Payments**: Stripe SDK (products, subscriptions, invoices, webhooks)
- **Auth**: JWT access + refresh tokens, bcrypt, RBAC middleware
- **Infrastructure**: Terraform, Docker, AWS (ECS/EC2, RDS, ElastiCache, S3, CloudFront, Route53, ACM, SES)

## Tenant Isolation Strategy

Every database table that holds tenant-specific data includes a `tenant_id` column. All queries are scoped through Prisma middleware that automatically injects tenant context from the authenticated user's session. This prevents cross-tenant data leakage at the ORM level.

## Security Model

- JWT tokens (15min access, 7d refresh) stored in httpOnly secure cookies
- RBAC with permission guards on every endpoint
- Tenant isolation enforced at middleware level
- Input validation via class-validator + Zod
- Rate limiting per IP and per tenant
- CSRF protection via double-submit cookie pattern
- XSS prevention via CSP headers + output encoding
- SQL injection prevention via parameterized Prisma queries
- File upload validation (type, size, content scanning)
- Audit logging for all mutations
- Webhook signature verification (HMAC-SHA256)
