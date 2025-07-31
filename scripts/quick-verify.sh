#!/bin/bash

# ContentLab Nexus - Quick Verification Script
# This script performs a quick health check of all critical systems

echo "🚀 ContentLab Nexus - Quick System Verification"
echo "=============================================="
echo ""

# Configuration
if [ -z "$DOMAIN" ]; then
    DOMAIN="https://app.contentlabtech.com"
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
PASSED=0
FAILED=0

# Function to test endpoint
test_endpoint() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}
    
    echo -n "Testing $name... "
    
    response=$(curl -s -w "\n%{http_code}" "$url" 2>/dev/null)
    status=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$status" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (Status: $status)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Expected: $expected_status, Got: $status)"
        ((FAILED++))
        return 1
    fi
}

# Function to check JSON response
test_json_endpoint() {
    local name=$1
    local url=$2
    local field=$3
    
    echo -n "Testing $name... "
    
    response=$(curl -s "$url" 2>/dev/null)
    
    if echo "$response" | jq -e ".$field" >/dev/null 2>&1; then
        value=$(echo "$response" | jq -r ".$field")
        echo -e "${GREEN}✓ PASSED${NC} ($field: $value)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (Invalid JSON or missing field: $field)"
        ((FAILED++))
        return 1
    fi
}

echo "1. Testing Public Pages"
echo "-----------------------"
test_endpoint "Homepage" "$DOMAIN/" 200
test_endpoint "Login Page" "$DOMAIN/auth/signin" 200
test_endpoint "Signup Page" "$DOMAIN/auth/signup" 200
test_endpoint "Password Reset" "$DOMAIN/auth/forgot-password" 200
echo ""

echo "2. Testing API Health Endpoints"
echo "--------------------------------"
test_json_endpoint "Basic Health" "$DOMAIN/api/health" "status"
test_json_endpoint "Database Health" "$DOMAIN/api/health/database" "status"
test_json_endpoint "Environment Check" "$DOMAIN/api/health/environment" "status"
test_json_endpoint "CSRF Token" "$DOMAIN/api/csrf-token" "token"
echo ""

echo "3. Testing Protected Routes (Should Redirect)"
echo "----------------------------------------------"
test_endpoint "Dashboard (No Auth)" "$DOMAIN/dashboard" 307
test_endpoint "Projects (No Auth)" "$DOMAIN/projects" 307
test_endpoint "Analytics (No Auth)" "$DOMAIN/analytics" 307
test_endpoint "Team (No Auth)" "$DOMAIN/team" 307
echo ""

echo "4. Testing API Protection"
echo "-------------------------"
test_endpoint "Projects API (No Auth)" "$DOMAIN/api/projects" 401
test_endpoint "Content API (No Auth)" "$DOMAIN/api/content" 401
test_endpoint "Analytics API (No Auth)" "$DOMAIN/api/analytics" 401
echo ""

echo "5. Testing Static Resources"
echo "---------------------------"
# Check if favicon exists
test_endpoint "Favicon" "$DOMAIN/favicon.ico" 200
echo ""

echo "6. Performance Check"
echo "--------------------"
echo -n "Homepage Load Time... "
start_time=$(date +%s%N)
curl -s -o /dev/null "$DOMAIN/"
end_time=$(date +%s%N)
load_time=$(( (end_time - start_time) / 1000000 ))

if [ $load_time -lt 3000 ]; then
    echo -e "${GREEN}✓ PASSED${NC} (${load_time}ms)"
    ((PASSED++))
else
    echo -e "${YELLOW}⚠ SLOW${NC} (${load_time}ms)"
fi
echo ""

# Summary
echo "========================================"
echo "SUMMARY"
echo "========================================"
echo -e "Total Tests: $((PASSED + FAILED))"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✅ All systems operational!${NC}"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please check the logs above.${NC}"
    exit 1
fi