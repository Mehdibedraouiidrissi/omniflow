# ── Database credentials ──────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "database" {
  name                    = "${local.name_prefix}/database"
  description             = "Omniflow database connection credentials"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0

  tags = { Name = "${local.name_prefix}/database" }
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    url      = "postgresql://${var.db_username}:${random_id.db_password.b64_std}@${aws_db_instance.postgres.address}:5432/${var.db_name}"
    host     = aws_db_instance.postgres.address
    port     = 5432
    username = var.db_username
    password = random_id.db_password.b64_std
    dbname   = var.db_name
  })
}

# ── Redis credentials ─────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "redis" {
  name                    = "${local.name_prefix}/redis"
  description             = "Omniflow Redis connection credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "redis" {
  secret_id = aws_secretsmanager_secret.redis.id
  secret_string = jsonencode({
    url  = "redis://:${random_id.redis_auth.hex}@${aws_elasticache_cluster.redis.cache_nodes[0].address}:6379"
    host = aws_elasticache_cluster.redis.cache_nodes[0].address
    port = 6379
    auth = random_id.redis_auth.hex
  })
}

# ── JWT secrets ───────────────────────────────────────────────────────────────
resource "random_id" "jwt_secret" {
  byte_length = 64
}

resource "random_id" "jwt_refresh_secret" {
  byte_length = 64
}

resource "aws_secretsmanager_secret" "jwt" {
  name                    = "${local.name_prefix}/jwt"
  description             = "Omniflow JWT signing secrets"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "jwt" {
  secret_id = aws_secretsmanager_secret.jwt.id
  secret_string = jsonencode({
    secret         = random_id.jwt_secret.hex
    refresh_secret = random_id.jwt_refresh_secret.hex
  })
}

# ── Encryption key ────────────────────────────────────────────────────────────
resource "random_id" "encryption_key" {
  byte_length = 32
}

resource "aws_secretsmanager_secret" "encryption" {
  name                    = "${local.name_prefix}/encryption"
  description             = "Omniflow data encryption key"
  recovery_window_in_days = var.environment == "prod" ? 30 : 0
}

resource "aws_secretsmanager_secret_version" "encryption" {
  secret_id = aws_secretsmanager_secret.encryption.id
  secret_string = jsonencode({
    key = random_id.encryption_key.hex
  })
}

# ── Stripe credentials ────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "stripe" {
  name                    = "${local.name_prefix}/stripe"
  description             = "Omniflow Stripe payment credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "stripe" {
  secret_id = aws_secretsmanager_secret.stripe.id
  secret_string = jsonencode({
    secret_key      = "REPLACE_WITH_STRIPE_SECRET_KEY"
    publishable_key = "REPLACE_WITH_STRIPE_PUBLISHABLE_KEY"
    webhook_secret  = "REPLACE_WITH_STRIPE_WEBHOOK_SECRET"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── Twilio credentials ────────────────────────────────────────────────────────
resource "aws_secretsmanager_secret" "twilio" {
  name                    = "${local.name_prefix}/twilio"
  description             = "Omniflow Twilio credentials"
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "twilio" {
  secret_id = aws_secretsmanager_secret.twilio.id
  secret_string = jsonencode({
    account_sid  = "REPLACE_WITH_TWILIO_ACCOUNT_SID"
    auth_token   = "REPLACE_WITH_TWILIO_AUTH_TOKEN"
    phone_number = "REPLACE_WITH_TWILIO_PHONE_NUMBER"
  })

  lifecycle {
    ignore_changes = [secret_string]
  }
}

# ── IAM policy for ECS task role to access secrets ────────────────────────────
resource "aws_iam_role_policy" "ecs_task_secrets" {
  name = "${local.name_prefix}-ecs-secrets"
  role = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.database.arn,
          aws_secretsmanager_secret.redis.arn,
          aws_secretsmanager_secret.jwt.arn,
          aws_secretsmanager_secret.encryption.arn,
          aws_secretsmanager_secret.stripe.arn,
          aws_secretsmanager_secret.twilio.arn
        ]
      }
    ]
  })
}
