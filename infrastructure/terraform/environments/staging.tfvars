# ── Staging environment overrides ─────────────────────────────────────────────
environment = "staging"
region      = "us-east-1"
domain_name = "staging.nexusplatform.io"

db_instance_class        = "db.t3.small"
db_allocated_storage     = 20
db_max_allocated_storage = 50
db_multi_az              = false
db_backup_retention_days = 3

redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

ecs_task_cpu      = 512
ecs_task_memory   = 1024
ecs_desired_count = 1
ecs_min_count     = 1
ecs_max_count     = 3

alarm_cpu_threshold    = 85
alarm_memory_threshold = 85
