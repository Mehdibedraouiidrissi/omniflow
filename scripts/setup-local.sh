#!/usr/bin/env bash
# ── Omniflow — Local Development Setup ──────────────────────────────────
# Usage: ./scripts/setup-local.sh
# Sets up a full local dev environment with Docker services, deps, migrations.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
BLUE='\033[0;34m'; BOLD='\033[1m'; NC='\033[0m'

log()     { echo -e "${BLUE}[$(date +%H:%M:%S)]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; }
header()  { echo -e "\n${BOLD}══════════════════════════════════════${NC}"; echo -e "${BOLD} $*${NC}"; echo -e "${BOLD}══════════════════════════════════════${NC}"; }

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── Step 1: Check prerequisites ───────────────────────────────────────────────
check_prerequisites() {
  header "Checking prerequisites"

  local missing=()
  local min_node_major=18

  # Node.js
  if command -v node &>/dev/null; then
    NODE_VER=$(node --version | sed 's/v//' | cut -d. -f1)
    if [[ "$NODE_VER" -lt "$min_node_major" ]]; then
      missing+=("Node.js >= ${min_node_major} (found v${NODE_VER})")
    else
      success "Node.js $(node --version)"
    fi
  else
    missing+=("Node.js >= ${min_node_major}")
  fi

  # npm
  if command -v npm &>/dev/null; then
    success "npm $(npm --version)"
  else
    missing+=("npm")
  fi

  # Docker
  if command -v docker &>/dev/null; then
    if docker info &>/dev/null; then
      success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
    else
      missing+=("Docker daemon (is Docker Desktop running?)")
    fi
  else
    missing+=("Docker")
  fi

  # Docker Compose
  if docker compose version &>/dev/null 2>&1; then
    success "Docker Compose (v2)"
  elif command -v docker-compose &>/dev/null; then
    success "docker-compose (v1)"
  else
    missing+=("Docker Compose")
  fi

  if [[ ${#missing[@]} -gt 0 ]]; then
    error "Missing prerequisites:"
    for item in "${missing[@]}"; do
      echo -e "  ${RED}✗${NC} ${item}"
    done
    echo ""
    echo "Install links:"
    echo "  Node.js: https://nodejs.org/"
    echo "  Docker:  https://docs.docker.com/get-docker/"
    exit 1
  fi

  success "All prerequisites satisfied"
}

# ── Step 2: Copy .env files ───────────────────────────────────────────────────
setup_env_files() {
  header "Setting up environment files"

  local env_files=(
    "${REPO_ROOT}/.env"
    "${REPO_ROOT}/apps/api/.env"
    "${REPO_ROOT}/apps/web/.env.local"
  )

  for env_file in "${env_files[@]}"; do
    local example="${env_file}.example"
    if [[ ! -f "$env_file" ]]; then
      if [[ -f "$example" ]]; then
        cp "$example" "$env_file"
        success "Created ${env_file##*/} from example"
      else
        warn "No example file found for ${env_file##*/}"
      fi
    else
      warn "${env_file##*/} already exists — skipping"
    fi
  done

  echo ""
  echo -e "${YELLOW}Review and update the .env files before proceeding.${NC}"
  echo -e "  - ${REPO_ROOT}/.env"
  echo -e "  - ${REPO_ROOT}/apps/api/.env"
  echo -e "  - ${REPO_ROOT}/apps/web/.env.local"
  echo ""
  read -rp "Press Enter when you have reviewed the .env files..."
}

# ── Step 3: Start Docker services ─────────────────────────────────────────────
start_docker_services() {
  header "Starting Docker services (PostgreSQL, Redis, MinIO)"

  cd "$REPO_ROOT"

  # Use the dev compose file if it exists, otherwise use main compose
  local compose_file="docker-compose.yml"

  # Check if compose has the dev services profile
  log "Starting infrastructure services..."

  docker compose -f "${compose_file}" up -d postgres redis

  # Start MinIO for local S3 emulation if defined in compose
  if docker compose -f "${compose_file}" config --services 2>/dev/null | grep -q "minio"; then
    docker compose -f "${compose_file}" up -d minio
    success "MinIO started (S3 emulation)"
  fi

  log "Waiting for PostgreSQL to be ready..."
  local attempt=0
  while [[ $attempt -lt 30 ]]; do
    ((attempt++))
    if docker compose -f "${compose_file}" exec -T postgres \
      pg_isready -U "${POSTGRES_USER:-omniflow}" -d "${POSTGRES_DB:-omniflow_dev}" &>/dev/null; then
      success "PostgreSQL is ready"
      break
    fi
    if [[ $attempt -eq 30 ]]; then
      error "PostgreSQL did not become ready in time"
      exit 1
    fi
    sleep 2
  done

  log "Waiting for Redis to be ready..."
  attempt=0
  while [[ $attempt -lt 15 ]]; do
    ((attempt++))
    if docker compose -f "${compose_file}" exec -T redis redis-cli ping &>/dev/null; then
      success "Redis is ready"
      break
    fi
    if [[ $attempt -eq 15 ]]; then
      error "Redis did not become ready in time"
      exit 1
    fi
    sleep 2
  done
}

# ── Step 4: Install dependencies ──────────────────────────────────────────────
install_dependencies() {
  header "Installing dependencies"

  cd "$REPO_ROOT"

  log "Running npm install..."
  npm install

  success "Dependencies installed"
}

# ── Step 5: Run migrations ────────────────────────────────────────────────────
run_migrations() {
  header "Running database migrations"

  cd "$REPO_ROOT"

  if npm run migrate --workspace=packages/database --if-present 2>/dev/null; then
    success "Migrations completed"
  elif npm run db:migrate --workspace=apps/api --if-present 2>/dev/null; then
    success "Migrations completed"
  else
    warn "No migrate script found — you may need to run migrations manually"
    warn "Try: npm run migrate --workspace=packages/database"
  fi
}

# ── Step 6: Seed database ─────────────────────────────────────────────────────
seed_database() {
  header "Seeding database"

  cd "$REPO_ROOT"

  if npm run seed --workspace=packages/database --if-present 2>/dev/null; then
    success "Database seeded"
  elif npm run db:seed --workspace=apps/api --if-present 2>/dev/null; then
    success "Database seeded"
  else
    warn "No seed script found — skipping database seed"
  fi
}

# ── Step 7: Print instructions ────────────────────────────────────────────────
print_instructions() {
  header "Setup Complete!"

  echo -e "${GREEN}Your local development environment is ready.${NC}"
  echo ""
  echo -e "${BOLD}Available services:${NC}"
  echo "  PostgreSQL : localhost:5432"
  echo "  Redis      : localhost:6379"
  echo ""
  echo -e "${BOLD}Start the application:${NC}"
  echo "  npm run dev            # Start all apps (API + Web + Worker)"
  echo "  npm run dev:api        # Start API only"
  echo "  npm run dev:web        # Start Web only"
  echo ""
  echo -e "${BOLD}Useful commands:${NC}"
  echo "  npm run build          # Build all packages"
  echo "  npm run test           # Run all tests"
  echo "  npm run lint           # Run linter"
  echo "  npm run format         # Format code"
  echo ""
  echo -e "${BOLD}Application URLs:${NC}"
  echo "  Web: http://localhost:3000"
  echo "  API: http://localhost:4000"
  echo "  API docs: http://localhost:4000/docs"
  echo ""
  echo -e "${YELLOW}Stop services: docker compose down${NC}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  header "Omniflow Local Setup"

  check_prerequisites
  setup_env_files
  install_dependencies
  start_docker_services
  run_migrations
  seed_database
  print_instructions
}

main "$@"
