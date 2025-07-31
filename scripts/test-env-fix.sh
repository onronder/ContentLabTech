#!/bin/bash

# Test ContentLab environment configuration after fixes
echo "Testing ContentLab environment configuration..."
echo "============================================="

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test health
echo -n "Overall Health Status: "
status=$(curl -s https://app.contentlabtech.com/api/health | jq -r .status 2>/dev/null)
if [ "$status" = "healthy" ]; then
    echo -e "${GREEN}✓ $status${NC}"
elif [ "$status" = "degraded" ]; then
    echo -e "${YELLOW}⚠ $status${NC}"
else
    echo -e "${RED}✗ $status${NC}"
fi

# Test environment issues
echo -n "Environment Configuration: "
errors=$(curl -s https://app.contentlabtech.com/api/health/environment | jq -r '.details.errors[]?' 2>/dev/null)
if [ -z "$errors" ]; then
    echo -e "${GREEN}✓ No errors${NC}"
else
    echo -e "${RED}✗ Issues found:${NC}"
    echo "$errors" | while read -r error; do
        echo "  - $error"
    done
fi

# Test database
echo -n "Database Connection: "
db_status=$(curl -s https://app.contentlabtech.com/api/health/database | jq -r .status 2>/dev/null)
if [ "$db_status" = "healthy" ]; then
    echo -e "${GREEN}✓ $db_status${NC}"
else
    echo -e "${YELLOW}⚠ $db_status${NC}"
fi

# Test external services
echo -n "External Services: "
ext_status=$(curl -s https://app.contentlabtech.com/api/health/external | jq -r .status 2>/dev/null)
available=$(curl -s https://app.contentlabtech.com/api/health/external | jq -r '.details.available[]?' 2>/dev/null | tr '\n' ' ')

if [ "$ext_status" = "healthy" ]; then
    echo -e "${GREEN}✓ All services available${NC}"
elif [ "$ext_status" = "degraded" ]; then
    echo -e "${YELLOW}⚠ Some services unavailable${NC}"
    echo "  Available: $available"
else
    echo -e "${RED}✗ $ext_status${NC}"
fi

echo "============================================="
echo ""
echo "If you see errors above, check VERCEL_ENV_FIX.md for solutions"