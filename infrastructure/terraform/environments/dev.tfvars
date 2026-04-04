# ── Development environment overrides ─────────────────────────────────────────
environment = "dev"
region      = "us-east-1"
domain_name = "dev.nexusplatform.io"

# Small instances for dev
db_instance_class        = "db.t3.micro"
db_allocated_storage     = 10
db_max_allocated_storage = 20
db_multi_az              = false
db_backup_retention_days = 1

redis_node_type = "cache.t3.micro"
redis_num_nodes = 1

ecs_task_cpu      = 256
ecs_task_memory   = 512
ecs_desired_count = 1
ecs_min_count     = 1
ecs_max_count     = 2

alarm_cpu_threshold    = 90
alarm_memory_threshold = 90
