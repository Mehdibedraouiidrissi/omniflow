# Omniflow — Deployment Guide

Complete end-to-end guide for deploying the Omniflow to AWS using Terraform and GitHub Actions.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [AWS Account Setup](#2-aws-account-setup)
3. [Bootstrap Terraform State](#3-bootstrap-terraform-state)
4. [Domain & SSL Configuration](#4-domain--ssl-configuration)
5. [Terraform Init & Apply](#5-terraform-init--apply)
6. [Environment Variables](#6-environment-variables)
7. [First Deployment](#7-first-deployment)
8. [Rolling Updates](#8-rolling-updates)
9. [Rollback Procedure](#9-rollback-procedure)
10. [Monitoring Setup](#10-monitoring-setup)
11. [Backup Strategy](#11-backup-strategy)
12. [Go-Live Checklist](#12-go-live-checklist)

---

## 1. Prerequisites

### Local tools

| Tool | Version | Install |
|------|---------|---------|
| Terraform | >= 1.6 | https://www.terraform.io/downloads |
| AWS CLI | >= 2.0 | https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html |
| Docker | >= 24 | https://docs.docker.com/get-docker/ |
| Node.js | >= 20 | https://nodejs.org/ |
| jq | any | `brew install jq` / `apt install jq` |

### AWS permissions

Your AWS IAM user/role needs the following managed policies (or equivalent custom policy):

- `AmazonECS_FullAccess`
- `AmazonRDSFullAccess`
- `AmazonElastiCacheFullAccess`
- `AmazonS3FullAccess`
- `CloudFrontFullAccess`
- `AmazonRoute53FullAccess`
- `SecretsManagerReadWrite`
- `AmazonSESFullAccess`
- `AWSCertificateManagerFullAccess`
- `CloudWatchFullAccess`
- `IAMFullAccess`
- `AmazonEC2FullAccess`

For production, scope these down to least-privilege after initial setup.

---

## 2. AWS Account Setup

### Configure AWS CLI

```bash
aws configure
# AWS Access Key ID: <your-key>
# AWS Secret Access Key: <your-secret>
# Default region name: us-east-1
# Default output format: json
```

Verify access:

```bash
aws sts get-caller-identity
```

### Create a deployment IAM user (recommended)

```bash
# Create deployment user
aws iam create-user --user-name omniflow-deployer

# Attach required policies
aws iam attach-user-policy \
  --user-name omniflow-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Create access keys
aws iam create-access-key --user-name omniflow-deployer
# Save the output — you will need these for GitHub Actions secrets
```

---

## 3. Bootstrap Terraform State

The Terraform state is stored in S3 with a DynamoDB lock table. These must be created before running `terraform init`.

```bash
# Create S3 bucket for state
aws s3api create-bucket \
  --bucket omniflow-terraform-state \
  --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket omniflow-terraform-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket omniflow-terraform-state \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'

# Block public access
aws s3api put-public-access-block \
  --bucket omniflow-terraform-state \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# Create DynamoDB lock table
aws dynamodb create-table \
  --table-name omniflow-terraform-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

---

## 4. Domain & SSL Configuration

### Register/transfer domain

If your domain is not yet in Route53:

```bash
# Create hosted zone (if domain is already registered elsewhere)
aws route53 create-hosted-zone \
  --name omniflow.io \
  --caller-reference "omniflow-$(date +%s)"

# Note the NS records returned and update them at your registrar
```

### Request ACM certificate

The certificate **must be in us-east-1** for CloudFront, regardless of your application region.

```bash
# Request certificate
CERT_ARN=$(aws acm request-certificate \
  --domain-name omniflow.io \
  --subject-alternative-names "*.omniflow.io" \
  --validation-method DNS \
  --region us-east-1 \
  --query CertificateArn \
  --output text)

echo "Certificate ARN: $CERT_ARN"

# Get DNS validation record
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.DomainValidationOptions[0].ResourceRecord'
```

Add the CNAME record to Route53 (Terraform handles this automatically via `route53.tf`). After the record propagates, the certificate status changes to ISSUED (can take 5-30 minutes).

```bash
# Check certificate status
aws acm describe-certificate \
  --certificate-arn "$CERT_ARN" \
  --region us-east-1 \
  --query 'Certificate.Status'
```

---

## 5. Terraform Init & Apply

### Prepare variables

```bash
cd infrastructure/terraform

# Copy the example and fill in real values
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars`:

```hcl
environment     = "staging"
region          = "us-east-1"
domain_name     = "omniflow.io"
certificate_arn = "arn:aws:acm:us-east-1:123456789012:certificate/..."
alert_email     = "ops@omniflow.io"
```

### Initialize Terraform

```bash
terraform init
```

### Plan (review changes before applying)

```bash
# For staging
terraform plan -var-file=environments/staging.tfvars -out=tfplan

# For production
terraform plan -var-file=environments/prod.tfvars -out=tfplan
```

Review the plan carefully before proceeding.

### Apply

```bash
terraform apply tfplan
```

First apply takes approximately 20-30 minutes (RDS creation is the longest step).

### Save outputs

```bash
terraform output > terraform-outputs.txt
cat terraform-outputs.txt
```

---

## 6. Environment Variables

### GitHub Actions secrets

Add these secrets in GitHub (Settings > Secrets and variables > Actions):

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | Deployment IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | Deployment IAM user secret |
| `NEXT_PUBLIC_API_URL` | API URL for Next.js build |
| `PRIVATE_SUBNET_IDS` | Comma-separated private subnet IDs (from TF output) |
| `ECS_SECURITY_GROUP_ID` | ECS security group ID (from TF output) |
| `SLACK_WEBHOOK_URL` | (Optional) Slack incoming webhook for notifications |

### Secrets Manager (post-Terraform)

Terraform creates the secret scaffolding. Update Stripe and Twilio credentials manually:

```bash
# Update Stripe credentials
aws secretsmanager update-secret \
  --secret-id omniflow-staging/stripe \
  --secret-string '{
    "secret_key": "sk_test_...",
    "publishable_key": "pk_test_...",
    "webhook_secret": "whsec_..."
  }'

# Update Twilio credentials
aws secretsmanager update-secret \
  --secret-id omniflow-staging/twilio \
  --secret-string '{
    "account_sid": "AC...",
    "auth_token": "...",
    "phone_number": "+1..."
  }'
```

---

## 7. First Deployment

After Terraform completes and secrets are populated, trigger a deployment:

### Via GitHub Actions (recommended)

Push to `main` to deploy to staging:

```bash
git push origin main
```

This triggers `.github/workflows/deploy.yml` which:
1. Builds Docker images and pushes to ECR
2. Runs database migrations
3. Updates ECS services
4. Runs smoke tests
5. Notifies via Slack

### Via manual script

```bash
# Make scripts executable
chmod +x scripts/deploy.sh scripts/setup-local.sh scripts/backup-db.sh

# Deploy to staging
./scripts/deploy.sh staging

# Deploy to production (requires release tag)
./scripts/deploy.sh prod --tag v1.0.0
```

### Verify first deployment

```bash
# Check ECS services
aws ecs describe-services \
  --cluster omniflow-staging-cluster \
  --services omniflow-staging-api omniflow-staging-web omniflow-staging-worker

# Check ALB target health
aws elbv2 describe-target-health \
  --target-group-arn <api-target-group-arn>

# Hit health endpoint
curl -f https://staging.omniflow.io/api/health
curl -f https://staging.omniflow.io/
```

---

## 8. Rolling Updates

Every push to `main` triggers a zero-downtime rolling deployment:

1. New Docker images are built and pushed to ECR
2. Migrations run as a one-off ECS task
3. ECS registers a new task definition revision with the updated image
4. ECS performs a rolling replacement: new tasks start, old tasks drain connections, then stop
5. ALB deregisters old tasks only after health checks pass on new tasks

### Manual rolling update

```bash
# Force a new deployment without changing the image
aws ecs update-service \
  --cluster omniflow-prod-cluster \
  --service omniflow-prod-api \
  --force-new-deployment

# Watch the deployment progress
aws ecs describe-services \
  --cluster omniflow-prod-cluster \
  --services omniflow-prod-api \
  --query 'services[0].deployments'
```

---

## 9. Rollback Procedure

### Automatic rollback

The ECS deployment circuit breaker is enabled. If a deployment fails (tasks don't reach healthy state within the timeout), ECS automatically rolls back to the previous task definition revision.

### Manual rollback to previous version

```bash
# List recent task definition revisions
aws ecs list-task-definitions \
  --family-prefix omniflow-prod-api \
  --sort DESC \
  --max-items 5

# Roll back to a specific revision
aws ecs update-service \
  --cluster omniflow-prod-cluster \
  --service omniflow-prod-api \
  --task-definition omniflow-prod-api:42  # Replace 42 with target revision

# Wait for rollback to complete
aws ecs wait services-stable \
  --cluster omniflow-prod-cluster \
  --services omniflow-prod-api
```

### Database rollback

If a migration caused issues:

```bash
# Run down migration
./scripts/deploy.sh prod --skip-build --skip-migrate
# Then manually run: npm run migration:revert

# Or restore from backup
aws s3 cp s3://omniflow-prod-backups/database-backups/prod/omniflow_prod_YYYYMMDD_HHMMSS.sql.gz /tmp/

gunzip /tmp/omniflow_prod_YYYYMMDD_HHMMSS.sql.gz

# Get RDS connection string from Secrets Manager
DATABASE_URL=$(aws secretsmanager get-secret-value \
  --secret-id omniflow-prod/database \
  --query SecretString \
  --output text | jq -r '.url')

psql "$DATABASE_URL" < /tmp/omniflow_prod_YYYYMMDD_HHMMSS.sql
```

---

## 10. Monitoring Setup

### CloudWatch Dashboard

Access the pre-built dashboard:

```bash
# Get dashboard URL
echo "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=omniflow-prod-overview"
```

The dashboard shows:
- ECS CPU and memory utilization per service
- ALB request count and 5xx error rate
- ALB P99/P95 response times
- RDS connections and CPU
- Redis memory and connections

### Alarms

Alarms are pre-configured via Terraform and notify via SNS → Email:

| Alarm | Threshold |
|-------|-----------|
| ECS API CPU | > 80% for 10 min |
| ECS API Memory | > 80% for 10 min |
| ALB 5xx errors | > 10 in 1 min |
| RDS CPU | > 80% for 10 min |
| RDS connections | > 150 |
| RDS free storage | < 5 GB |
| Redis memory | > 80% |

### View logs

```bash
# API logs (last 30 minutes)
aws logs tail /ecs/omniflow-prod/api --since 30m --follow

# Web logs
aws logs tail /ecs/omniflow-prod/web --since 30m --follow

# Worker logs
aws logs tail /ecs/omniflow-prod/worker --since 30m --follow

# Filter for errors
aws logs filter-log-events \
  --log-group-name /ecs/omniflow-prod/api \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s000)
```

### Set up additional Slack alerting

If you need Slack notifications for CloudWatch alarms (beyond the deploy notifications):

1. Create a Slack app with incoming webhook
2. Create an SNS → Lambda → Slack integration, or use AWS Chatbot:

```bash
# Using AWS Chatbot (easiest)
# 1. Go to AWS Chatbot console
# 2. Configure Slack workspace
# 3. Create Slack channel configuration
# 4. Subscribe the omniflow-prod-alerts SNS topic to the channel
```

---

## 11. Backup Strategy

### Automated RDS backups

RDS automatic backups are configured via Terraform:
- Retention: 7 days (prod), 3 days (staging), 1 day (dev)
- Daily backup window: 03:00-04:00 UTC
- Point-in-time recovery: enabled

To restore from an automated backup:

```bash
# List available restore points
aws rds describe-db-snapshots \
  --db-instance-identifier omniflow-prod-postgres \
  --query 'DBSnapshots[*].[DBSnapshotIdentifier,SnapshotCreateTime]' \
  --output table

# Restore to a new instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier omniflow-prod-postgres-restored \
  --db-snapshot-identifier <snapshot-id>
```

### Manual backups

Run on-demand backups with the backup script:

```bash
# Local backup
./scripts/backup-db.sh prod

# Backup and upload to S3
./scripts/backup-db.sh prod --upload

# Schedule with cron (add to crontab)
# 0 2 * * * /path/to/scripts/backup-db.sh prod --upload >> /var/log/omniflow-backup.log 2>&1
```

### Backup verification

Test that your backups are restorable monthly:

```bash
# Download latest backup
aws s3 cp \
  $(aws s3 ls s3://omniflow-prod-backups/database-backups/prod/ | sort | tail -1 | awk '{print "s3://omniflow-prod-backups/database-backups/prod/"$4}') \
  /tmp/latest-backup.sql.gz

# Restore to test database
gunzip -c /tmp/latest-backup.sql.gz | \
  psql postgresql://omniflow_admin:password@localhost:5432/omniflow_test_restore
```

---

## 12. Go-Live Checklist

Complete this checklist before switching production traffic.

### Infrastructure

- [ ] Terraform applied successfully in prod with `environments/prod.tfvars`
- [ ] RDS instance is `db.t3.medium` or larger with Multi-AZ enabled
- [ ] All ECS services are RUNNING with desired count >= 2
- [ ] ALB health checks passing for all target groups
- [ ] CloudFront distribution is DEPLOYED
- [ ] ACM certificate status is ISSUED
- [ ] All DNS records created (A for domain, A for api subdomain)

### Security

- [ ] All secrets populated in Secrets Manager (no placeholder values remain)
- [ ] S3 bucket public access blocked
- [ ] RDS not publicly accessible
- [ ] ElastiCache not publicly accessible
- [ ] Security groups restrict access (RDS/Redis only from ECS)
- [ ] SSL/TLS enforced on ALB (HTTP redirects to HTTPS)
- [ ] CloudFront using TLSv1.2_2021 minimum
- [ ] HSTS header configured in nginx/CloudFront

### Application

- [ ] `GET /api/health` returns 200
- [ ] `GET /` returns 200
- [ ] User registration flow works end-to-end
- [ ] Email sending works (check SES is out of sandbox for prod)
- [ ] Stripe webhooks configured and verified
- [ ] Database migrations are current (no pending migrations)
- [ ] Admin user seeded or created

### SES Production Access

By default, SES is in sandbox mode (can only send to verified email addresses). Request production access before go-live:

1. Go to SES console > Account dashboard
2. Click "Request production access"
3. Fill in the form (business use case, bounce handling, etc.)
4. AWS reviews within 1 business day

### Monitoring

- [ ] CloudWatch alarms created and confirmed (subscription confirmed in email)
- [ ] CloudWatch dashboard showing real metrics
- [ ] Log groups with appropriate retention (30 days for prod)
- [ ] Slack notifications configured (optional but recommended)
- [ ] Uptime monitoring configured (e.g., UptimeRobot, Pingdom, or Route53 health checks)

### Backup

- [ ] RDS automated backups enabled with 7-day retention
- [ ] Manual backup tested and restoration verified
- [ ] S3 bucket created for manual backups (`omniflow-prod-backups`)
- [ ] Backup script tested: `./scripts/backup-db.sh prod --upload`

### Performance

- [ ] ECS task CPU/memory sized appropriately for expected load
- [ ] RDS instance class appropriate for query volume
- [ ] CloudFront caching rules configured for static assets
- [ ] Nginx gzip enabled

### Documentation

- [ ] Team has AWS console access (read-only at minimum)
- [ ] Runbook created for common incidents
- [ ] On-call rotation established
- [ ] Escalation path documented

### Final Verification

```bash
# End-to-end smoke test
DOMAIN="omniflow.io"

echo "Testing web..."
curl -sI "https://${DOMAIN}/" | head -3

echo "Testing API..."
curl -sf "https://${DOMAIN}/api/health" | jq .

echo "Testing API direct..."
curl -sf "https://api.${DOMAIN}/health" | jq .

echo "Testing CloudFront headers..."
curl -sI "https://${DOMAIN}/favicon.ico" | grep -i "x-cache"

echo "All checks passed. Ready for go-live."
```

---

## Appendix: Common Commands

```bash
# Terraform
cd infrastructure/terraform
terraform plan -var-file=environments/prod.tfvars
terraform apply -var-file=environments/prod.tfvars
terraform output

# ECS
aws ecs list-services --cluster omniflow-prod-cluster
aws ecs describe-services --cluster omniflow-prod-cluster --services omniflow-prod-api
aws ecs list-tasks --cluster omniflow-prod-cluster --service-name omniflow-prod-api

# Logs
aws logs tail /ecs/omniflow-prod/api --follow
aws logs tail /ecs/omniflow-prod/web --follow

# Secrets
aws secretsmanager list-secrets --filter Key=name,Values=omniflow-prod
aws secretsmanager get-secret-value --secret-id omniflow-prod/database --query SecretString --output text | jq .

# Scaling
aws ecs update-service --cluster omniflow-prod-cluster --service omniflow-prod-api --desired-count 3

# SSH into ECS task (requires ECS Exec enabled)
TASK_ID=$(aws ecs list-tasks --cluster omniflow-prod-cluster --service-name omniflow-prod-api --query taskArns[0] --output text | awk -F/ '{print $NF}')
aws ecs execute-command \
  --cluster omniflow-prod-cluster \
  --task "$TASK_ID" \
  --container api \
  --command "/bin/sh" \
  --interactive
```
