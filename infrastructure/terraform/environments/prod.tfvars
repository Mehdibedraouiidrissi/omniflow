# ── Production environment overrides ─────────────────────────────────────────
environment = "prod"
region      = "us-east-1"
domain_name = "nexusplatform.io"

db_instance_class        = "db.t3.medium"
db_allocated_storage     = 50
db_max_allocated_storage = 200
db_multi_az              = true
db_backup_retention_days = 7

redis_node_type = "cache.t3.small"
redis_num_nodes = 1

ecs_task_cpu      = 1024
ecs_task_memory   = 2048
ecs_desired_count = 2
ecs_min_count     = 2
ecs_max_count     = 8

alarm_cpu_threshold    = 75
alarm_memory_threshold = 75

alert_email = "ops@nexusplatform.io"
