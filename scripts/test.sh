#!/usr/bin/env bash
# =============================================================================
# Omniflow - Test Runner Script
# Runs unit tests, integration tests, E2E tests, and generates coverage
# =============================================================================

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FAILED=0
TOTAL_PASS=0
TOTAL_FAIL=0
TOTAL_SKIP=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

print_header() {
  echo ""
  echo -e "${CYAN}============================================================${NC}"
  echo -e "${CYAN}  $1${NC}"
  echo -e "${CYAN}============================================================${NC}"
  echo ""
}

print_result() {
  local name="$1"
  local exit_code="$2"
  if [ "$exit_code" -eq 0 ]; then
    echo -e "  ${GREEN}PASS${NC} $name"
  else
    echo -e "  ${RED}FAIL${NC} $name"
    FAILED=1
  fi
}

parse_jest_results() {
  # Parse jest output for pass/fail/skip counts
  local output="$1"
  local passed skipped failed

  passed=$(echo "$output" | grep -oP 'Tests:\s+.*?(\d+)\s+passed' | grep -oP '\d+' | tail -1 || echo "0")
  failed=$(echo "$output" | grep -oP 'Tests:\s+.*?(\d+)\s+failed' | grep -oP '\d+' | tail -1 || echo "0")
  skipped=$(echo "$output" | grep -oP 'Tests:\s+.*?(\d+)\s+skipped' | grep -oP '\d+' | tail -1 || echo "0")

  TOTAL_PASS=$((TOTAL_PASS + ${passed:-0}))
  TOTAL_FAIL=$((TOTAL_FAIL + ${failed:-0}))
  TOTAL_SKIP=$((TOTAL_SKIP + ${skipped:-0}))
}

# ---------------------------------------------------------------------------
# Parse arguments
# ---------------------------------------------------------------------------

RUN_UNIT=true
RUN_INTEGRATION=true
RUN_E2E=true
RUN_COVERAGE=false
VERBOSE=""

while [[ $# -gt 0 ]]; do
  case $1 in
    --unit-only)
      RUN_INTEGRATION=false
      RUN_E2E=false
      shift
      ;;
    --integration-only)
      RUN_UNIT=false
      RUN_E2E=false
      shift
      ;;
    --e2e-only)
      RUN_UNIT=false
      RUN_INTEGRATION=false
      shift
      ;;
    --coverage)
      RUN_COVERAGE=true
      shift
      ;;
    --verbose|-v)
      VERBOSE="--verbose"
      shift
      ;;
    --help|-h)
      echo "Usage: $0 [options]"
      echo ""
      echo "Options:"
      echo "  --unit-only          Run only unit tests"
      echo "  --integration-only   Run only integration tests"
      echo "  --e2e-only           Run only E2E tests"
      echo "  --coverage           Generate coverage report"
      echo "  --verbose, -v        Verbose output"
      echo "  --help, -h           Show this help"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

print_header "Omniflow Test Suite"
echo -e "  ${BLUE}Root:${NC}         $ROOT_DIR"
echo -e "  ${BLUE}Unit:${NC}         $RUN_UNIT"
echo -e "  ${BLUE}Integration:${NC}  $RUN_INTEGRATION"
echo -e "  ${BLUE}E2E:${NC}          $RUN_E2E"
echo -e "  ${BLUE}Coverage:${NC}     $RUN_COVERAGE"
echo ""

# =========================================================================
# 1. Unit Tests
# =========================================================================

if [ "$RUN_UNIT" = true ]; then
  print_header "Running Unit Tests"

  # --- API Unit Tests ---
  echo -e "${YELLOW}>> API Unit Tests${NC}"
  cd "$ROOT_DIR/apps/api"

  UNIT_OUTPUT=""
  UNIT_EXIT=0
  if [ "$RUN_COVERAGE" = true ]; then
    UNIT_OUTPUT=$(npx jest --coverage $VERBOSE 2>&1) || UNIT_EXIT=$?
  else
    UNIT_OUTPUT=$(npx jest $VERBOSE 2>&1) || UNIT_EXIT=$?
  fi

  echo "$UNIT_OUTPUT"
  parse_jest_results "$UNIT_OUTPUT"
  print_result "API Unit Tests" $UNIT_EXIT

  # --- Web Unit Tests ---
  echo ""
  echo -e "${YELLOW}>> Web Unit Tests${NC}"
  cd "$ROOT_DIR/apps/web"

  WEB_OUTPUT=""
  WEB_EXIT=0
  if [ "$RUN_COVERAGE" = true ]; then
    WEB_OUTPUT=$(npx jest --coverage $VERBOSE 2>&1) || WEB_EXIT=$?
  else
    WEB_OUTPUT=$(npx jest $VERBOSE 2>&1) || WEB_EXIT=$?
  fi

  echo "$WEB_OUTPUT"
  parse_jest_results "$WEB_OUTPUT"
  print_result "Web Unit Tests" $WEB_EXIT
fi

# =========================================================================
# 2. Integration Tests
# =========================================================================

if [ "$RUN_INTEGRATION" = true ]; then
  print_header "Running Integration Tests"

  echo -e "${YELLOW}>> API Integration Tests${NC}"
  cd "$ROOT_DIR/apps/api"

  INT_OUTPUT=""
  INT_EXIT=0
  INT_OUTPUT=$(npx jest --testPathPattern="\.integration\.spec\.ts$" $VERBOSE 2>&1) || INT_EXIT=$?

  if [ -z "$INT_OUTPUT" ] || echo "$INT_OUTPUT" | grep -q "No tests found"; then
    echo -e "  ${YELLOW}SKIP${NC} No integration tests found"
    TOTAL_SKIP=$((TOTAL_SKIP + 1))
  else
    echo "$INT_OUTPUT"
    parse_jest_results "$INT_OUTPUT"
    print_result "API Integration Tests" $INT_EXIT
  fi
fi

# =========================================================================
# 3. E2E Tests
# =========================================================================

if [ "$RUN_E2E" = true ]; then
  print_header "Running E2E Tests"

  # Check if test database is available
  echo -e "${YELLOW}>> Checking test database connection...${NC}"

  if [ -z "${DATABASE_URL_TEST:-}" ]; then
    echo -e "  ${YELLOW}WARN${NC} DATABASE_URL_TEST not set, using DATABASE_URL"
  fi

  echo -e "${YELLOW}>> API E2E Tests${NC}"
  cd "$ROOT_DIR/apps/api"

  E2E_OUTPUT=""
  E2E_EXIT=0
  E2E_OUTPUT=$(npx jest --config ./test/jest-e2e.json $VERBOSE 2>&1) || E2E_EXIT=$?

  echo "$E2E_OUTPUT"
  parse_jest_results "$E2E_OUTPUT"
  print_result "API E2E Tests" $E2E_EXIT
fi

# =========================================================================
# 4. Coverage Report
# =========================================================================

if [ "$RUN_COVERAGE" = true ]; then
  print_header "Coverage Report"

  # API coverage
  if [ -f "$ROOT_DIR/apps/api/coverage/lcov.info" ]; then
    echo -e "${YELLOW}>> API Coverage:${NC}"
    cat "$ROOT_DIR/apps/api/coverage/text-summary.txt" 2>/dev/null || \
      echo "  Coverage generated at apps/api/coverage/"
  fi

  # Web coverage
  if [ -f "$ROOT_DIR/apps/web/coverage/lcov.info" ]; then
    echo -e "${YELLOW}>> Web Coverage:${NC}"
    cat "$ROOT_DIR/apps/web/coverage/text-summary.txt" 2>/dev/null || \
      echo "  Coverage generated at apps/web/coverage/"
  fi
fi

# =========================================================================
# 5. Summary
# =========================================================================

print_header "Test Summary"

TOTAL=$((TOTAL_PASS + TOTAL_FAIL + TOTAL_SKIP))

echo -e "  ${GREEN}Passed:${NC}   $TOTAL_PASS"
echo -e "  ${RED}Failed:${NC}   $TOTAL_FAIL"
echo -e "  ${YELLOW}Skipped:${NC}  $TOTAL_SKIP"
echo -e "  ${BLUE}Total:${NC}    $TOTAL"
echo ""

if [ $FAILED -ne 0 ]; then
  echo -e "  ${RED}STATUS: FAILED${NC}"
  echo ""
  exit 1
else
  echo -e "  ${GREEN}STATUS: ALL TESTS PASSED${NC}"
  echo ""
  exit 0
fi
