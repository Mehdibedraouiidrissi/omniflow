#!/usr/bin/env bash
# ── Omniflow — Database Backup Script ───────────────────────────────────
# Usage: ./scripts/backup-db.sh [environment] [options]
#
# Options:
#   --upload        Upload backup to S3 after creating it
#   --keep N        Keep last N local backups (default: 7)
#   --compress      Use gzip compression (default: true)
#   --dry-run       Show what would happen without doing it
#
# Examples:
#   ./scripts/backup-db.sh prod --upload
#   ./scripts/backup-db.sh staging --keep 3
#   ./scripts/backup-db.sh local            # uses local Docker postgres
set -euo pipefail

ENVIRONMENT="${1:-local}"
UPLOAD=false
KEEP_COUNT=7
COMPRESS=true
DRY_RUN=false

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --upload)   UPLOAD=true ;;
    --keep)     KEEP_COUNT="$2"; shift ;;
    --no-compress) COMPRESS=false ;;
    --dry-run)  DRY_RUN=true ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

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
    return 0
  fi
  eval "$@"
}

# ── Config ────────────────────────────────────────────────────────────────────
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="${BACKUP_DIR:-/tmp/omniflow-backups}"
BACKUP_FILENAME="omniflow_${ENVIRONMENT}_${TIMESTAMP}.sql"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILENAME}"

AWS_REGION="${AWS_REGION:-us-east-1}"
S3_BUCKET="${S3_BACKUP_BUCKET:-omniflow-${ENVIRONMENT}-backups}"
S3_PREFIX="database-backups"

# ── Resolve connection parameters ─────────────────────────────────────────────
resolve_connection() {
  case "$ENVIRONMENT" in
    local)
      DB_HOST="${POSTGRES_HOST:-localhost}"
      DB_PORT="${POSTGRES_PORT:-5432}"
      DB_USER="${POSTGRES_USER:-omniflow}"
      DB_NAME="${POSTGRES_DB:-omniflow_dev}"
      DB_PASS="${POSTGRES_PASSWORD:-omniflow_password}"
      ;;
    dev|staging|prod)
      if [[ -z "${DATABASE_URL:-}" ]]; then
        # Fetch from Secrets Manager
        log "Fetching database credentials from Secrets Manager..."
        SECRET=$(aws secretsmanager get-secret-value \
          --secret-id "omniflow-${ENVIRONMENT}/database" \
          --query SecretString \
          --output text)
        DB_HOST=$(echo "$SECRET" | jq -r '.host')
        DB_PORT=$(echo "$SECRET" | jq -r '.port')
        DB_USER=$(echo "$SECRET" | jq -r '.username')
        DB_NAME=$(echo "$SECRET" | jq -r '.dbname')
        DB_PASS=$(echo "$SECRET" | jq -r '.password')
      else
        # Parse from DATABASE_URL
        DB_HOST=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:]+):.*|\1|')
        DB_PORT=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
        DB_USER=$(echo "$DATABASE_URL" | sed -E 's|.*://([^:]+):.*|\1|')
        DB_NAME=$(echo "$DATABASE_URL" | sed -E 's|.*/([^?]+).*|\1|')
        DB_PASS=$(echo "$DATABASE_URL" | sed -E 's|.*://[^:]+:([^@]+)@.*|\1|')
      fi
      ;;
    *)
      error "Unknown environment: ${ENVIRONMENT}"
      exit 1
      ;;
  esac
}

# ── Create backup directory ───────────────────────────────────────────────────
create_backup_dir() {
  if [[ ! -d "$BACKUP_DIR" ]]; then
    run "mkdir -p '${BACKUP_DIR}'"
    log "Created backup directory: ${BACKUP_DIR}"
  fi
}

# ── Perform backup ────────────────────────────────────────────────────────────
perform_backup() {
  header "Creating database backup"

  log "Source  : ${DB_USER}@${DB_HOST}:${DB_PORT}/${DB_NAME}"
  log "Output  : ${BACKUP_PATH}"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${YELLOW}[DRY RUN]${NC} Would run pg_dump and save to ${BACKUP_PATH}"
    return
  fi

  PGPASSWORD="${DB_PASS}" pg_dump \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --username="${DB_USER}" \
    --dbname="${DB_NAME}" \
    --format=plain \
    --no-owner \
    --no-acl \
    --verbose \
    --file="${BACKUP_PATH}" 2>&1 | while read -r line; do log "$line"; done

  local backup_size
  backup_size=$(du -sh "${BACKUP_PATH}" | cut -f1)
  success "Backup created: ${BACKUP_FILENAME} (${backup_size})"

  if [[ "$COMPRESS" == "true" ]]; then
    log "Compressing backup..."
    gzip -f "${BACKUP_PATH}"
    BACKUP_PATH="${BACKUP_PATH}.gz"
    BACKUP_FILENAME="${BACKUP_FILENAME}.gz"
    backup_size=$(du -sh "${BACKUP_PATH}" | cut -f1)
    success "Compressed: ${BACKUP_FILENAME} (${backup_size})"
  fi
}

# ── Upload to S3 ──────────────────────────────────────────────────────────────
upload_to_s3() {
  if [[ "$UPLOAD" != "true" ]]; then
    return
  fi

  header "Uploading backup to S3"

  local s3_key="${S3_PREFIX}/${ENVIRONMENT}/${BACKUP_FILENAME}"
  local s3_uri="s3://${S3_BUCKET}/${s3_key}"

  log "Uploading to: ${s3_uri}"

  run "aws s3 cp '${BACKUP_PATH}' '${s3_uri}' \
    --storage-class STANDARD_IA \
    --region '${AWS_REGION}' \
    --metadata \"environment=${ENVIRONMENT},timestamp=${TIMESTAMP}\""

  success "Uploaded to ${s3_uri}"

  # Set lifecycle-friendly tagging
  run "aws s3api put-object-tagging \
    --bucket '${S3_BUCKET}' \
    --key '${s3_key}' \
    --tagging 'TagSet=[{Key=environment,Value=${ENVIRONMENT}},{Key=type,Value=manual-backup}]' \
    --region '${AWS_REGION}'"
}

# ── Clean up old local backups ────────────────────────────────────────────────
cleanup_old_backups() {
  header "Cleaning up old local backups"

  local count
  count=$(ls -1 "${BACKUP_DIR}"/omniflow_${ENVIRONMENT}_*.sql* 2>/dev/null | wc -l || echo 0)

  if [[ "$count" -le "$KEEP_COUNT" ]]; then
    log "Found ${count} backups, keeping all (limit: ${KEEP_COUNT})"
    return
  fi

  local to_delete=$(( count - KEEP_COUNT ))
  log "Found ${count} backups, removing ${to_delete} oldest (keeping ${KEEP_COUNT})"

  ls -1t "${BACKUP_DIR}"/omniflow_${ENVIRONMENT}_*.sql* 2>/dev/null | \
    tail -n "${to_delete}" | \
    while read -r file; do
      run "rm '${file}'"
      log "Deleted: $(basename "${file}")"
    done

  success "Cleanup complete"
}

# ── Summary ───────────────────────────────────────────────────────────────────
print_summary() {
  header "Backup Summary"

  echo -e "Environment : ${BOLD}${ENVIRONMENT}${NC}"
  echo -e "Backup file : ${BACKUP_PATH}"
  if [[ "$UPLOAD" == "true" ]]; then
    echo -e "S3 location : s3://${S3_BUCKET}/${S3_PREFIX}/${ENVIRONMENT}/${BACKUP_FILENAME}"
  fi
  echo -e "Timestamp   : ${TIMESTAMP}"

  echo ""
  echo -e "${GREEN}Backup completed successfully.${NC}"
  echo ""
  echo "To restore this backup:"
  if [[ "$COMPRESS" == "true" ]]; then
    echo "  gunzip -c ${BACKUP_PATH} | psql \$DATABASE_URL"
  else
    echo "  psql \$DATABASE_URL < ${BACKUP_PATH}"
  fi
}

# ── Main ──────────────────────────────────────────────────────────────────────
main() {
  header "Omniflow Database Backup"
  log "Environment: ${ENVIRONMENT}"

  resolve_connection
  create_backup_dir
  perform_backup
  upload_to_s3
  cleanup_old_backups
  print_summary
}

main "$@"
