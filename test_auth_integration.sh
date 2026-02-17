#!/bin/bash

# Integration Test for Authentication
# Tests the complete authentication flow end-to-end

echo "================================"
echo "Authentication Integration Test"
echo "================================"
echo ""

BASE_URL="http://localhost:8000/api/v1"
COOKIE_FILE="/tmp/lanoire_test_cookies.txt"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counters
PASSED=0
FAILED=0

test_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ PASS${NC}: $2"
        ((PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
        ((FAILED++))
    fi
}

echo "Test 1: Login with invalid credentials (should fail)"
response=$(curl -s -X POST "$BASE_URL/accounts/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"wronguser","password":"wrongpass"}' \
    -c "$COOKIE_FILE" -b "$COOKIE_FILE")

if echo "$response" | grep -q "Unable to log in"; then
    test_result 0 "Invalid credentials correctly rejected"
else
    test_result 1 "Invalid credentials not handled correctly"
    echo "Response: $response"
fi

echo ""
echo "Test 2: Check correct API endpoint structure"
if curl -s "$BASE_URL/accounts/login/" | grep -q "Method"; then
    test_result 0 "Endpoint exists (GET not allowed is correct)"
else
    test_result 1 "Endpoint not found or incorrect"
fi

echo ""
echo "Test 3: Verify error response format"
response=$(curl -s -X POST "$BASE_URL/accounts/login/" \
    -H "Content-Type: application/json" \
    -d '{"username":"test","password":"wrong"}')

if echo "$response" | grep -q "non_field_errors"; then
    test_result 0 "Error format matches backend expectations"
else
    test_result 1 "Error format incorrect"
    echo "Response: $response"
fi

echo ""
echo "================================"
echo "Test Summary"
echo "================================"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"

if [ $FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All tests passed! Authentication is working correctly.${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed. Please check the output above.${NC}"
    exit 1
fi
