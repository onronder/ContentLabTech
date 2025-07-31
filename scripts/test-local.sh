#!/bin/bash

# ContentLab Nexus - Local Development Test Script
# Run this while your development server is running (npm run dev)

echo "🧪 ContentLab Nexus - Local Development Test"
echo "==========================================="
echo ""
echo "⚠️  Make sure your development server is running:"
echo "   npm run dev"
echo ""
echo "Press Enter to continue or Ctrl+C to cancel..."
read

# Configuration
DOMAIN="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results
declare -A results

echo -e "${BLUE}1. Checking Development Server${NC}"
echo "--------------------------------"
if curl -s -o /dev/null "$DOMAIN"; then
    echo -e "${GREEN}✓ Development server is running${NC}"
else
    echo -e "${RED}✗ Development server is not running!${NC}"
    echo "Please run 'npm run dev' first"
    exit 1
fi
echo ""

echo -e "${BLUE}2. Testing Public Pages${NC}"
echo "------------------------"
pages=(
    "/:Homepage"
    "/auth/signin:Login Page"
    "/auth/signup:Signup Page" 
    "/auth/forgot-password:Password Reset"
    "/auth/verify-email:Email Verification"
    "/auth/email-confirmed:Email Confirmed"
)

for page in "${pages[@]}"; do
    IFS=':' read -r path name <<< "$page"
    printf "%-30s" "$name"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN$path")
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ OK${NC}"
        results["$name"]="passed"
    else
        echo -e "${RED}✗ Failed (Status: $response)${NC}"
        results["$name"]="failed"
    fi
done
echo ""

echo -e "${BLUE}3. Testing API Endpoints${NC}"
echo "-------------------------"
apis=(
    "/api/health:Health Check"
    "/api/health/detailed:Detailed Health"
    "/api/health/database:Database Health"
    "/api/health/environment:Environment Check"
    "/api/csrf-token:CSRF Token"
)

for api in "${apis[@]}"; do
    IFS=':' read -r path name <<< "$api"
    printf "%-30s" "$name"
    
    response=$(curl -s "$DOMAIN$path")
    if echo "$response" | jq . >/dev/null 2>&1; then
        echo -e "${GREEN}✓ Valid JSON${NC}"
        results["$name"]="passed"
    else
        echo -e "${RED}✗ Invalid Response${NC}"
        results["$name"]="failed"
    fi
done
echo ""

echo -e "${BLUE}4. Testing Authentication Flow${NC}"
echo "-------------------------------"
echo "Testing protected routes (should redirect)..."
protected=(
    "/dashboard:Dashboard"
    "/projects:Projects"
    "/content:Content"
    "/analytics:Analytics"
    "/team:Team"
    "/settings:Settings"
)

for route in "${protected[@]}"; do
    IFS=':' read -r path name <<< "$route"
    printf "%-30s" "$name"
    
    response=$(curl -s -o /dev/null -w "%{http_code}" -L "$DOMAIN$path")
    # Should redirect to login (200 after redirect)
    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✓ Redirects to login${NC}"
        results["$name"]="passed"
    else
        echo -e "${RED}✗ Unexpected response: $response${NC}"
        results["$name"]="failed"
    fi
done
echo ""

echo -e "${BLUE}5. Testing Form Validation${NC}"
echo "---------------------------"
echo "You'll need to manually test these in your browser:"
echo "1. Go to $DOMAIN/auth/signup"
echo "   - Try submitting empty form (should show validation errors)"
echo "   - Try weak password (should show error)"
echo "   - Try invalid email (should show error)"
echo ""
echo "2. Go to $DOMAIN/auth/signin" 
echo "   - Try submitting empty form (should show validation errors)"
echo "   - Try invalid credentials (should show error)"
echo ""

echo -e "${BLUE}6. Browser Console Check${NC}"
echo "-------------------------"
echo "Open browser DevTools and check for:"
echo "- No JavaScript errors in console"
echo "- No 404 errors in Network tab"
echo "- No CORS errors"
echo ""

echo -e "${BLUE}7. Database Connection Test${NC}"
echo "----------------------------"
db_health=$(curl -s "$DOMAIN/api/health/database" | jq -r '.status' 2>/dev/null)
if [ "$db_health" = "healthy" ]; then
    echo -e "${GREEN}✓ Database connection is healthy${NC}"
else
    echo -e "${RED}✗ Database connection issues${NC}"
    echo "Check your Supabase environment variables"
fi
echo ""

# Summary
passed=0
failed=0
for result in "${results[@]}"; do
    if [ "$result" = "passed" ]; then
        ((passed++))
    else
        ((failed++))
    fi
done

echo "========================================"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo "========================================"
echo -e "Total automated tests: $((passed + failed))"
echo -e "${GREEN}Passed: $passed${NC}"
echo -e "${RED}Failed: $failed${NC}"
echo ""

if [ $failed -eq 0 ]; then
    echo -e "${GREEN}✅ All automated tests passed!${NC}"
    echo "Don't forget to run the manual browser tests listed above."
else
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Fix any failing tests"
echo "2. Run manual browser tests"
echo "3. Check your production deployment URL"
echo "4. Update DOMAIN in quick-verify.sh with your actual Vercel URL"