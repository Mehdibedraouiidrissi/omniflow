#!/usr/bin/env bash
# ── Omniflow — Manual Deployment Script ─────────────────────────────────
# Usage: ./scripts/deploy.sh [environment] [options]
#
# Options:
#   --skip-build      Skip Docker image builds (use existing images)
#   --skip-migrate    Skip database migrations
#   --dry-run         Show what would happen without doing it
#   --tag TAG         Use specific image tag (default: git SHA)
#
# Examples:
#   ./scripts/deploy.sh staging
#   ./scripts/deploy.sh prod --tag v1.2.3
#   ./scripts/deploy.sh staging --skip-build
set -euo pipefail

# ── Defaults ──────────────────────────────────────────────────────────────────
ENVIRONMENT="${1:-staging}"
SKIP_BUILD=false
SKIP_MIGRATE=false
DRY_RUN=false
IMAGE_TAG=$(git rev-parse --short HEAD 2>/dev/null || echo "latest")

# ── Parse flags ───────────────────────────────────────────────────────────────
shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)   SKIP_BUILD=true  ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    --dry-run)      DRY_RUN=true ;;
    --tag)          IMAGE_TAG="$2"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# ── Color helpers ──────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
header()  { echo -e "\n${BOLD}══════════════════════════════════════${NC}"; echo -e "${BOLD} $*${NC}"; echo -e "${BOLD}══════════════════════════════════════${NC}"; }

run() {
  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN]${NC} $*"
  else
    eval "$@"
  fi
}

# ── Validate ──────────────────────────────────────────────────────────────────
validate_environment() {
  if [[ "$ENVIRONMENT" != "dev" && "$ENVIRONMENT" != "staging" && "$ENVIRONMENT" != "prod" ]]; then
    error "Invalid environment: $ENVIRONMENT. Must be dev, staging, or prod."
    exit 1
  fi
}

check_prerequisites() {
  header "Checking prerequisites"
  local missing=()

  command -v aws    &>/dev/null || missing+=("aws-cli")
  command -v docker &>/dev/null || missing+=("docker")
  command -v jq     &>/dev/null || missing+=("jq")

  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing required tools: ${missing[*]}"
    exit 1
  fi

  # Verify AWS credentials
  if ! aws sts get-caller-identity &>/dev/null; then
    error "AWS credentials not configured. Run: aws configure"
    exit 1
  fi

  success "All prerequisites satisfied"
}

# ── Load config ───────────────────────────────────────────────────────────────
load_config() {
  CLUSTER_NAME="omniflow-${ENVIRONMENT}-cluster"
  AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
  AWS_REGION="${AWS_REGION:-us-east-1}"
  ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

  API_REPO="${ECR_REGISTRY}/omniflow-${ENVIRONMENT}/api"
  WEB_REPO="${ECR_REGISTRY}/omniflow-${ENVIRONMENT}/web"
  WORKER_REPO="${ECR_REGISTRY}/omniflow-${ENVIRONMENT}/worker"

  log "Environment : ${ENVIRONMENT}"
  log "Image tag   : ${IMAGE_TAG}"
  log "Cluster     : ${CLUSTER_NAME}"
  log "ECR registry: ${ECR_REGISTRY}"
}

# ── Step 1: Build images ──────────────────────────────────────────────────────
build_images() {
  if [[ "$SKIP_BUILD" == "true" ]]; then
    warn "Skipping Docker image builds (--skip-build)"
    return
  fi

  header "Building Docker images"

  log "Building API image..."
  run "docker build -f docker/Dockerfile.api -t ${API_REPO}:${IMAGE_TAG} -t ${API_REPO}:latest ."
  success "API image built"

  log "Building Web image..."
  run "docker build -f docker/Dockerfile.web -t ${WEB_REPO}:${IMAGE_TAG} -t ${WEB_REPO}:latest \
    --build-arg NEXT_PUBLIC_API_URL=https://api.${ENVIRONMENT}.omniflow.io ."
  success "Web image built"

  log "Building Worker image..."
  run "docker build -f docker/Dockerfile.worker -t ${WORKER_REPO}:${IMAGE_TAG} -t ${WORKER_REPO}:latest ."
  success "Worker image built"
}

# ── Step 2: Push to ECR ───────────────────────────────────────────────────────
push_images() {
  if [[ "$SKIP_BUILD" == "true" ]]; then
    warn "Skipping ECR push (--skip-build)"
    return
  fi

  header "Pushing images to ECR"

  log "Authenticating with ECR..."
  run "aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REGISTRY}"

  log "Pushing API image..."
  run "docker push ${API_REPO}:${IMAGE_TAG}"
  run "docker push ${API_REPO}:latest"
  success "API image pushed"

  log "Pushing Web image..."
  run "docker push ${WEB_REPO}:${IMAGE_TAG}"
  run "docker push ${WEB_REPO}:latest"
  success "Web image pushed"

  log "Pushing Worker image..."
  run "docker push ${WORKER_REPO}:${IMAGE_TAG}"
  run "docker push ${WORKER_REPO}:latest"
  success "Worker image pushed"
}

# ── Step 3: Run migrations ────────────────────────────────────────────────────
run_migrations() {
  if [[ "$SKIP_MIGRATE" == "true" ]]; then
    warn "Skipping database migrations (--skip-migrate)"
    return
  fi

  header "Running database migrations"

  # Get network config from existing service
  NETWORK_CONFIG=$(aws ecs describe-services \
    --cluster "${CLUSTER_NAME}" \
    --services "omniflow-${ENVIRONMENT}-api" \
    --query 'services[0].networkConfiguration' \
    --output json)

  log "Starting migration task..."

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would run ECS migration task"
    return
  fi

  TASK_ARN=$(aws ecs run-task \
    --cluster "${CLUSTER_NAME}" \
    --task-definition "omniflow-${ENVIRONMENT}-api" \
    --launch-type FARGATE \
    --network-configuration "${NETWORK_CONFIG}" \
    --overrides '{"containerOverrides":[{"name":"api","command":["node","apps/api/dist/cli.js","migration:run"]}]}' \
    --query 'tasks[0].taskArn' \
    --output text)

  log "Migration task started: ${TASK_ARN}"
  log "Waiting for migration to complete..."

  aws ecs wait tasks-stopped \
    --cluster "${CLUSTER_NAME}" \
    --tasks "${TASK_ARN}"

  EXIT_CODE=$(aws ecs describe-tasks \
    --cluster "${CLUSTER_NAME}" \
    --tasks "${TASK_ARN}" \
    --query 'tasks[0].containers[0].exitCode' \
    --output text)

  if [[ "$EXIT_CODE" != "0" ]]; then
    error "Migration failed with exit code ${EXIT_CODE}"
    exit 1
  fi

  success "Migrations completed successfully"
}

# ── Step 4: Update ECS services ───────────────────────────────────────────────
update_service() {
  local SERVICE=$1
  local REPO=$2

  log "Updating ${SERVICE} service..."

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would update ${SERVICE} with ${REPO}:${IMAGE_TAG}"
    return
  fi

  # Fetch current task def, update image, register new revision
  TASK_DEF=$(aws ecs describe-task-definition \
    --task-definition "omniflow-${ENVIRONMENT}-${SERVICE}" \
    --query taskDefinition)

  NEW_TASK_DEF=$(echo "${TASK_DEF}" | jq \
    --arg IMAGE "${REPO}:${IMAGE_TAG}" \
    '.containerDefinitions[0].image = $IMAGE | del(.taskDefinitionArn, .revision, .status, .requiresAttributes, .placementConstraints, .compatibilities, .registeredAt, .registeredBy)')

  NEW_TASK_ARN=$(aws ecs register-task-definition \
    --cli-input-json "${NEW_TASK_DEF}" \
    --query taskDefinition.taskDefinitionArn \
    --output text)

  aws ecs update-service \
    --cluster "${CLUSTER_NAME}" \
    --service "omniflow-${ENVIRONMENT}-${SERVICE}" \
    --task-definition "${NEW_TASK_ARN}" \
    --force-new-deployment \
    > /dev/null

  success "${SERVICE} service updated to ${IMAGE_TAG}"
}

deploy_services() {
  header "Deploying ECS services"

  update_service "api" "${API_REPO}"
  update_service "web" "${WEB_REPO}"
  update_service "worker" "${WORKER_REPO}"

  if [[ "$DRY_RUN" != "true" ]]; then
    log "Waiting for services to stabilize..."
    aws ecs wait services-stable \
      --cluster "${CLUSTER_NAME}" \
      --services \
        "omniflow-${ENVIRONMENT}-api" \
        "omniflow-${ENVIRONMENT}-web" \
      2>&1 | while read -r line; do log "$line"; done

    success "All services stabilized"
  fi
}

# ── Step 5: Health checks ──────────────────────────────────────────────────────
health_check() {
  if [[ "$DRY_RUN" == "true" ]]; then
    warn "Skipping health check in dry-run mode"
    return
  fi

  header "Running health checks"

  local base_url
  case "$ENVIRONMENT" in
    prod)    base_url="https://omniflow.io" ;;
    staging) base_url="https://staging.omniflow.io" ;;
    dev)     base_url="https://dev.omniflow.io" ;;
  esac

  log "Waiting 30 seconds for services to warm up..."
  sleep 30

  local max_attempts=10
  local attempt=0

  # Check API
  while [[ $attempt -lt $max_attempts ]]; do
    ((attempt++))
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${base_url}/api/health" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      success "API health check passed"
      break
    fi
    if [[ $attempt -eq $max_attempts ]]; then
      error "API health check failed after ${max_attempts} attempts (last status: ${STATUS})"
      exit 1
    fi
    warn "Attempt ${attempt}/${max_attempts}: API returned ${STATUS}, retrying in 10s..."
    sleep 10
  done

  attempt=0
  while [[ $attempt -lt $max_attempts ]]; do
    ((attempt++))
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "${base_url}/" 2>/dev/null || echo "000")
    if [[ "$STATUS" == "200" ]]; then
      success "Web health check passed"
      break
    fi
    if [[ $attempt -eq $max_attempts ]]; then
      error "Web health check failed after ${max_attempts} attempts (last status: ${STATUS})"
      exit 1
    fi
    warn "Attempt ${attempt}/${max_attempts}: Web returned ${STATUS}, retrying in 10s..."
    sleep 10
  done

  success "All health checks passed. Deployment complete."
  echo ""
  log "Application URL: ${base_url}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  header "Omniflow Deployment"
  log "Environment: ${ENVIRONMENT} | Tag: ${IMAGE_TAG} | Dry run: ${DRY_RUN}"

  validate_environment
  check_prerequisites
  load_config
  build_images
  push_images
  run_migrations
  deploy_services
  health_check
}

main "$@"
