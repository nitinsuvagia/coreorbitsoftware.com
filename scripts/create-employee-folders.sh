#!/bin/bash
# =============================================================================
# create-employee-folders.sh
#
# Creates the complete document folder structure for ALL existing employees
# who were imported (or created) before folder-auto-creation was in place.
#
# Folder tree created per employee:
#   Employee Documents/
#   └── EMP001 - Full Name/
#       ├── Profile Photo
#       ├── Personal Documents
#       ├── Joining Documents
#       ├── Payroll
#       ├── Performance Reviews
#       ├── Training Certificates
#       ├── Leave & Attendance
#       └── Exit Documents
#
# USAGE:
#   # Production (Docker / EC2) — default mode:
#   ./scripts/create-employee-folders.sh
#
#   # Override tenant slug (default: softqube):
#   TENANT_SLUG=acme ./scripts/create-employee-folders.sh
#
#   # Local dev (services running directly, not in Docker):
#   ./scripts/create-employee-folders.sh --local
#
#   # Dry-run — lists employees without calling the API:
#   ./scripts/create-employee-folders.sh --dry-run
# =============================================================================

set -euo pipefail

# --------------------------------------------------------------------------- #
# Colours
# --------------------------------------------------------------------------- #
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# --------------------------------------------------------------------------- #
# Defaults  (override via env vars or flags)
# --------------------------------------------------------------------------- #
TENANT_SLUG="${TENANT_SLUG:-softqube}"
MASTER_DB="${MASTER_DB:-oms_master}"
PG_USER="${PG_USER:-postgres}"

# Docker container names
POSTGRES_CONTAINER="${POSTGRES_CONTAINER:-oms-postgres}"
EXEC_CONTAINER="${EXEC_CONTAINER:-oms-employee-service}"   # container used to run curl/wget calls

# Local-mode URLs (used with --local flag)
DOCUMENT_SERVICE_URL="${DOCUMENT_SERVICE_URL:-http://localhost:3007}"
PG_HOST="${PG_HOST:-localhost}"
PG_PORT="${PG_PORT:-5432}"

# Flags
LOCAL_MODE=false
DRY_RUN=false
BATCH_SIZE=10      # Number of concurrent folder creations (throttle)
REQUEST_TIMEOUT=15 # Seconds per request

# --------------------------------------------------------------------------- #
# Parse arguments
# --------------------------------------------------------------------------- #
for arg in "$@"; do
  case "$arg" in
    --local)   LOCAL_MODE=true ;;
    --dry-run) DRY_RUN=true ;;
    --help|-h)
      sed -n '/^# USAGE/,/^# ====/p' "$0" | grep -v '^# ====' | sed 's/^# //'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown argument: $arg${NC}"
      echo "Use --help for usage."
      exit 1
      ;;
  esac
done

# --------------------------------------------------------------------------- #
# Helpers
# --------------------------------------------------------------------------- #
log()   { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*"; }

# Run a SQL query and return trimmed output
run_sql() {
  local db="$1"
  local query="$2"
  if $LOCAL_MODE; then
    psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$db" -tAc "$query" 2>/dev/null
  else
    docker exec "$POSTGRES_CONTAINER" psql -U "$PG_USER" -d "$db" -tAc "$query" 2>/dev/null
  fi
}

# POST to the folder-creation endpoint
call_folder_api() {
  local employee_id="$1"
  local url="$2"
  local tenant_id="$3"

  if $LOCAL_MODE; then
    # Direct HTTP call from host
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "$url" \
      -H "X-Tenant-Slug: $TENANT_SLUG" \
      -H "X-Tenant-Id: $tenant_id" \
      -H "X-User-Id: system" \
      --max-time "$REQUEST_TIMEOUT" 2>/dev/null || echo "000")
  else
    # Run curl inside the exec-container (has access to Docker-internal network)
    HTTP_CODE=$(docker exec "$EXEC_CONTAINER" \
      wget -q --post-data="" \
        --header="X-Tenant-Slug: $TENANT_SLUG" \
        --header="X-Tenant-Id: $tenant_id" \
        --header="X-User-Id: system" \
        --timeout="$REQUEST_TIMEOUT" \
        --server-response \
        -O /dev/null \
        "$url" 2>&1 | grep "HTTP/" | tail -1 | awk '{print $2}' || echo "000")
  fi

  echo "$HTTP_CODE"
}

# --------------------------------------------------------------------------- #
# Preflight checks
# --------------------------------------------------------------------------- #
echo ""
echo -e "${BOLD}${CYAN}====================================================${NC}"
echo -e "${BOLD}${CYAN}    Employee Document Folder Bulk Creator${NC}"
echo -e "${BOLD}${CYAN}====================================================${NC}"
echo ""

if $DRY_RUN; then
  warn "DRY RUN mode — no API calls will be made."
  echo ""
fi

if $LOCAL_MODE; then
  log "Mode        : LOCAL (direct psql + curl to $DOCUMENT_SERVICE_URL)"
  # Check psql is available
  if ! command -v psql &>/dev/null; then
    error "psql not found. Install postgresql-client or use Docker mode."
    exit 1
  fi
  if ! $DRY_RUN && ! command -v curl &>/dev/null; then
    error "curl not found."
    exit 1
  fi
  TENANT_DB_PREFIX="oms_tenant_"
else
  log "Mode        : DOCKER (postgres container: $POSTGRES_CONTAINER, exec via: $EXEC_CONTAINER)"
  # Check docker is available
  if ! command -v docker &>/dev/null; then
    error "docker not found."
    exit 1
  fi
  # Check containers are running
  if ! docker ps --format '{{.Names}}' | grep -q "^${POSTGRES_CONTAINER}$"; then
    error "Container '$POSTGRES_CONTAINER' is not running."
    error "Start the stack first: docker compose -f docker-compose.prod.yml up -d"
    exit 1
  fi
  if ! $DRY_RUN && ! docker ps --format '{{.Names}}' | grep -q "^${EXEC_CONTAINER}$"; then
    error "Container '$EXEC_CONTAINER' is not running."
    exit 1
  fi
  TENANT_DB_PREFIX="oms_tenant_"
fi

# --------------------------------------------------------------------------- #
# Step 1 — Resolve Tenant ID and database name
# --------------------------------------------------------------------------- #
log "Tenant slug : $TENANT_SLUG"

TENANT_ID=$(run_sql "$MASTER_DB" \
  "SELECT id FROM tenants WHERE slug='${TENANT_SLUG}' LIMIT 1;" | tr -d ' \r')

if [ -z "$TENANT_ID" ]; then
  error "No tenant found with slug='$TENANT_SLUG' in $MASTER_DB."
  error "Available tenants:"
  run_sql "$MASTER_DB" "SELECT slug FROM tenants ORDER BY slug;" | sed 's/^/  - /'
  exit 1
fi

TENANT_DB="${TENANT_DB_PREFIX}${TENANT_SLUG}"
log "Tenant ID   : $TENANT_ID"
log "Tenant DB   : $TENANT_DB"

# --------------------------------------------------------------------------- #
# Step 2 — Fetch all active employee IDs + codes + names
# --------------------------------------------------------------------------- #
log "Fetching active employees from $TENANT_DB ..."

# Returns: id|employeeCode|displayName
EMPLOYEES=$(run_sql "$TENANT_DB" \
  "SELECT id, COALESCE(employee_code,'?'), COALESCE(display_name, first_name || ' ' || last_name, email)
   FROM employees
   WHERE deleted_at IS NULL
   ORDER BY created_at ASC;" | tr -d '\r')

if [ -z "$EMPLOYEES" ]; then
  warn "No active employees found in $TENANT_DB. Nothing to do."
  exit 0
fi

TOTAL=$(echo "$EMPLOYEES" | wc -l | tr -d ' ')
log "Found ${BOLD}$TOTAL${NC} active employees."
echo ""

# --------------------------------------------------------------------------- #
# Step 3 — Determine document-service URL for API calls
# --------------------------------------------------------------------------- #
if $LOCAL_MODE; then
  API_URL_BASE="$DOCUMENT_SERVICE_URL"
else
  # Inside the EXEC_CONTAINER, document service is reachable via container hostname
  DOCUMENT_SERVICE_INTERNAL=$(docker exec "$EXEC_CONTAINER" \
    sh -c 'echo "${DOCUMENT_SERVICE_URL:-http://oms-document-service:3007}"' 2>/dev/null \
    | tr -d '\r' || echo "http://oms-document-service:3007")
  API_URL_BASE="$DOCUMENT_SERVICE_INTERNAL"
fi

log "Document service URL (from exec context): $API_URL_BASE"
echo ""

# --------------------------------------------------------------------------- #
# Step 4 — Loop through employees and create folders
# --------------------------------------------------------------------------- #
SUCCESS=0
FAILED=0
SKIPPED=0

echo -e "${BOLD}Processing employees...${NC}"
echo "────────────────────────────────────────────────────────────"

COUNTER=0
while IFS='|' read -r EMP_ID EMP_CODE EMP_NAME; do
  # Trim whitespace
  EMP_ID=$(echo "$EMP_ID" | tr -d ' ')
  EMP_CODE=$(echo "$EMP_CODE" | tr -d ' ')
  EMP_NAME=$(echo "$EMP_NAME" | xargs)  # trim leading/trailing spaces

  [ -z "$EMP_ID" ] && continue

  COUNTER=$((COUNTER + 1))
  ENDPOINT="$API_URL_BASE/api/documents/folders/employee-direct/$EMP_ID"

  printf "${CYAN}[%4d/%d]${NC} %-10s %-35s " "$COUNTER" "$TOTAL" "$EMP_CODE" "$EMP_NAME"

  if $DRY_RUN; then
    echo -e "${YELLOW}(dry-run)${NC} → $ENDPOINT"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  HTTP_CODE=$(call_folder_api "$EMP_ID" "$ENDPOINT" "$TENANT_ID")

  case "$HTTP_CODE" in
    201)
      echo -e "${GREEN}✓ Created${NC}"
      SUCCESS=$((SUCCESS + 1))
      ;;
    200)
      echo -e "${GREEN}✓ Already exists${NC}"
      SUCCESS=$((SUCCESS + 1))
      ;;
    404)
      echo -e "${RED}✗ Employee not found (404)${NC}"
      FAILED=$((FAILED + 1))
      ;;
    000)
      echo -e "${RED}✗ Connection failed (timeout/unreachable)${NC}"
      FAILED=$((FAILED + 1))
      ;;
    *)
      echo -e "${RED}✗ HTTP $HTTP_CODE${NC}"
      FAILED=$((FAILED + 1))
      ;;
  esac

  # Throttle: pause briefly every BATCH_SIZE requests to avoid overwhelming the service
  if (( COUNTER % BATCH_SIZE == 0 )) && (( COUNTER < TOTAL )); then
    sleep 0.5
  fi

done <<< "$EMPLOYEES"

# --------------------------------------------------------------------------- #
# Summary
# --------------------------------------------------------------------------- #
echo "────────────────────────────────────────────────────────────"
echo ""
echo -e "${BOLD}Summary${NC}"
echo -e "  Total employees : ${BOLD}$TOTAL${NC}"
if $DRY_RUN; then
  echo -e "  Would process   : ${YELLOW}$SKIPPED${NC} (dry-run)"
else
  echo -e "  ${GREEN}Success         : $SUCCESS${NC}"
  if [ "$FAILED" -gt 0 ]; then
    echo -e "  ${RED}Failed          : $FAILED${NC}"
    echo ""
    warn "Some employees failed. Check document-service logs:"
    if $LOCAL_MODE; then
      echo "  tail -f logs/document-service.log"
    else
      echo "  docker logs oms-document-service --tail 50"
    fi
  fi
fi
echo ""

if [ "$FAILED" -eq 0 ] && ! $DRY_RUN; then
  ok "All employee document folders are ready!"
fi
