# ── ElastiCache Subnet Group ──────────────────────────────────────────────────
resource "aws_elasticache_subnet_group" "main" {
  name        = "${local.name_prefix}-redis-subnet-group"
  description = "Subnet group for Omniflow ElastiCache Redis"
  subnet_ids  = aws_subnet.private[*].id

  tags = { Name = "${local.name_prefix}-redis-subnet-group" }
}

# ── Redis Parameter Group ─────────────────────────────────────────────────────
resource "aws_elasticache_parameter_group" "redis" {
  name        = "${local.name_prefix}-redis7-params"
  family      = "redis7"
  description = "Custom parameter group for Omniflow Redis 7"

  parameter {
    name  = "maxmemory-policy"
    value = "allkeys-lru"
  }

  parameter {
    name  = "activerehashing"
    value = "yes"
  }

  parameter {
    name  = "lazyfree-lazy-eviction"
    value = "yes"
  }

  tags = { Name = "${local.name_prefix}-redis7-params" }
}

# ── Redis auth token ──────────────────────────────────────────────────────────
resource "random_id" "redis_auth" {
  byte_length = 32
}

# ── ElastiCache Cluster ───────────────────────────────────────────────────────
resource "aws_elasticache_cluster" "redis" {
  cluster_id           = "${local.name_prefix}-redis"
  engine               = "redis"
  engine_version       = "7.0"
  node_type            = var.redis_node_type
  num_cache_nodes      = var.redis_num_nodes
  parameter_group_name = aws_elasticache_parameter_group.redis.name
  subnet_group_name    = aws_elasticache_subnet_group.main.name
  security_group_ids   = [aws_security_group.redis.id]
  port                 = 6379

  # Maintenance
  maintenance_window       = "sun:05:00-sun:06:00"
  snapshot_retention_limit = 5
  snapshot_window          = "04:00-05:00"

  # Notifications
  notification_topic_arn = aws_sns_topic.alerts.arn

  apply_immediately = var.environment != "prod"

  tags = { Name = "${local.name_prefix}-redis" }
}
