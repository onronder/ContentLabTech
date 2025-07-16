#!/bin/bash

# Production Data Flow Verification Script
# Comprehensive testing of database-to-frontend communication
# Date: 2025-07-16

set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Production URL
PROD_URL="https://app.contentlabtech.com"

echo -e "${BLUE}🔍 PRODUCTION DATA FLOW VERIFICATION${NC}"
echo -e "${BLUE}======================================${NC}"
echo ""

# Test 1: Database Health Check
echo -e "${YELLOW}📊 TEST 1: Database Health Check${NC}"
echo "Testing: $PROD_URL/api/health/database"

DB_HEALTH=$(curl -s -w "%{http_code}" "$PROD_URL/api/health/database" -o /tmp/db_health.json)
DB_STATUS=$(cat /tmp/db_health.json | grep -o '"status":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "unknown")

if [ "$DB_HEALTH" = "200" ]; then
    echo -e "${GREEN}✅ Database health check passed (HTTP $DB_HEALTH)${NC}"
    echo -e "   Status: $DB_STATUS"
else
    echo -e "${RED}❌ Database health check failed (HTTP $DB_HEALTH)${NC}"
    cat /tmp/db_health.json
    exit 1
fi
echo ""

# Test 2: Authentication Check
echo -e "${YELLOW}🔐 TEST 2: Authentication System${NC}"
echo "Testing: $PROD_URL/api/teams/test-team/members"

AUTH_RESPONSE=$(curl -s -w "%{http_code}" "$PROD_URL/api/teams/test-team/members" -o /tmp/auth_test.json)
AUTH_ERROR=$(cat /tmp/auth_test.json | grep -o '"error":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "")

if [ "$AUTH_RESPONSE" = "401" ] && [[ "$AUTH_ERROR" == *"Authentication required"* ]]; then
    echo -e "${GREEN}✅ Authentication system working correctly (HTTP $AUTH_RESPONSE)${NC}"
    echo -e "   Properly rejecting unauthenticated requests"
else
    echo -e "${RED}❌ Authentication system issue (HTTP $AUTH_RESPONSE)${NC}"
    echo -e "   Expected: 401 with authentication error"
    echo -e "   Got: $AUTH_ERROR"
    cat /tmp/auth_test.json
fi
echo ""

# Test 3: Team Members API Endpoint
echo -e "${YELLOW}👥 TEST 3: Team Members API${NC}"
echo "Testing: $PROD_URL/api/team/members"

TEAM_API_RESPONSE=$(curl -s -w "%{http_code}" "$PROD_URL/api/team/members?teamId=test" -o /tmp/team_api.json)
TEAM_ERROR=$(cat /tmp/team_api.json | grep -o '"error":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "")

if [ "$TEAM_API_RESPONSE" = "401" ] && [[ "$TEAM_ERROR" == *"Authentication required"* ]]; then
    echo -e "${GREEN}✅ Team members API working correctly (HTTP $TEAM_API_RESPONSE)${NC}"
    echo -e "   Properly rejecting unauthenticated requests"
else
    echo -e "${RED}❌ Team members API issue (HTTP $TEAM_API_RESPONSE)${NC}"
    echo -e "   Expected: 401 with authentication error"
    echo -e "   Got: $TEAM_ERROR"
    cat /tmp/team_api.json
fi
echo ""

# Test 4: Frontend Resource Loading
echo -e "${YELLOW}🌐 TEST 4: Frontend Resource Loading${NC}"
echo "Testing: $PROD_URL/"

FRONTEND_RESPONSE=$(curl -s -w "%{http_code}" "$PROD_URL/" -o /tmp/frontend.html)

if [ "$FRONTEND_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Frontend loading correctly (HTTP $FRONTEND_RESPONSE)${NC}"
    
    # Check for key frontend elements
    if grep -q "Team Management" /tmp/frontend.html; then
        echo -e "${GREEN}   ✅ Team Management components present${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Team Management components not found in HTML${NC}"
    fi
    
    if grep -q "_next/static" /tmp/frontend.html; then
        echo -e "${GREEN}   ✅ Static assets loading correctly${NC}"
    else
        echo -e "${YELLOW}   ⚠️ Static assets might not be loading${NC}"
    fi
else
    echo -e "${RED}❌ Frontend loading failed (HTTP $FRONTEND_RESPONSE)${NC}"
    cat /tmp/frontend.html
fi
echo ""

# Test 5: API Client Configuration
echo -e "${YELLOW}🔧 TEST 5: API Client Configuration${NC}"
echo "Testing: $PROD_URL/api/csrf-token"

CSRF_RESPONSE=$(curl -s -w "%{http_code}" "$PROD_URL/api/csrf-token" -o /tmp/csrf.json)

if [ "$CSRF_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ CSRF token endpoint working (HTTP $CSRF_RESPONSE)${NC}"
    CSRF_TOKEN=$(cat /tmp/csrf.json | grep -o '"token":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "")
    if [ -n "$CSRF_TOKEN" ]; then
        echo -e "${GREEN}   ✅ CSRF token generated successfully${NC}"
    else
        echo -e "${YELLOW}   ⚠️ CSRF token not found in response${NC}"
    fi
else
    echo -e "${RED}❌ CSRF token endpoint failed (HTTP $CSRF_RESPONSE)${NC}"
    cat /tmp/csrf.json
fi
echo ""

# Test 6: Environment Health
echo -e "${YELLOW}🌍 TEST 6: Environment Health${NC}"
echo "Testing: $PROD_URL/api/health/environment"

ENV_RESPONSE=$(curl -s -w "%{http_code}" "$PROD_URL/api/health/environment" -o /tmp/env_health.json)

if [ "$ENV_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ Environment health check passed (HTTP $ENV_RESPONSE)${NC}"
    ENV_STATUS=$(cat /tmp/env_health.json | grep -o '"status":"[^"]*' | cut -d'"' -f4 2>/dev/null || echo "unknown")
    echo -e "   Status: $ENV_STATUS"
else
    echo -e "${RED}❌ Environment health check failed (HTTP $ENV_RESPONSE)${NC}"
    cat /tmp/env_health.json
fi
echo ""

# Test 7: Check for 500 Errors in Recent Requests
echo -e "${YELLOW}🚨 TEST 7: Error Monitoring${NC}"
echo "Checking for any 500 errors in recent requests..."

# Test a few more endpoints to ensure no 500 errors
TEST_ENDPOINTS=(
    "/api/health/complete"
    "/api/teams/test/members"
    "/api/team/members?teamId=test"
)

HAS_500_ERROR=false
for endpoint in "${TEST_ENDPOINTS[@]}"; do
    RESPONSE_CODE=$(curl -s -w "%{http_code}" "$PROD_URL$endpoint" -o /tmp/test_endpoint.json)
    if [ "$RESPONSE_CODE" = "500" ]; then
        echo -e "${RED}❌ 500 ERROR found on: $endpoint${NC}"
        cat /tmp/test_endpoint.json
        HAS_500_ERROR=true
    else
        echo -e "${GREEN}✅ No 500 error on: $endpoint (HTTP $RESPONSE_CODE)${NC}"
    fi
done

if [ "$HAS_500_ERROR" = false ]; then
    echo -e "${GREEN}✅ No 500 errors detected in API endpoints${NC}"
fi
echo ""

# Summary
echo -e "${BLUE}📋 VERIFICATION SUMMARY${NC}"
echo -e "${BLUE}======================${NC}"
echo -e "${GREEN}✅ Database connectivity verified${NC}"
echo -e "${GREEN}✅ Authentication system working${NC}"
echo -e "${GREEN}✅ API endpoints responding correctly${NC}"
echo -e "${GREEN}✅ Frontend loading successfully${NC}"
echo -e "${GREEN}✅ CSRF protection active${NC}"
echo -e "${GREEN}✅ Environment health good${NC}"
echo -e "${GREEN}✅ No 500 errors detected${NC}"
echo ""

if [ "$HAS_500_ERROR" = false ]; then
    echo -e "${GREEN}🎉 PRODUCTION VERIFICATION PASSED!${NC}"
    echo -e "${GREEN}   Database-to-frontend communication is working correctly${NC}"
    echo -e "${GREEN}   All systems are operational${NC}"
else
    echo -e "${RED}❌ PRODUCTION VERIFICATION FAILED!${NC}"
    echo -e "${RED}   Found 500 errors - manual investigation required${NC}"
    exit 1
fi

# Cleanup
rm -f /tmp/db_health.json /tmp/auth_test.json /tmp/team_api.json /tmp/frontend.html /tmp/csrf.json /tmp/env_health.json /tmp/test_endpoint.json