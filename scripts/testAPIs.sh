#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Exam Type और Marksheet Template Test${NC}"
echo -e "${BLUE}========================================${NC}\n"

# Configuration
API_URL="http://localhost:5002"
ADMIN_TOKEN="your_admin_token_here"  # Replace with actual token
BRANCH_ID="your_branch_id_here"      # Replace with actual branch ID
CLIENT_ID="your_client_id_here"      # Replace with actual client ID

echo -e "${YELLOW}⚠️  पहले ये values update करें:${NC}"
echo "1. ADMIN_TOKEN - Admin का JWT token"
echo "2. BRANCH_ID - Branch का ID"
echo "3. CLIENT_ID - Client का ID"
echo ""

# Test 1: Get Exam Types
echo -e "${BLUE}TEST 1: Get Exam Types${NC}"
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"$API_URL/api/exam-type?branchId=$BRANCH_ID\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\""
echo ""
echo -e "${YELLOW}Response:${NC}"
curl -X GET "$API_URL/api/exam-type?branchId=$BRANCH_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.' || echo "Error or no response"
echo -e "\n${BLUE}---${NC}\n"

# Test 2: Create Exam Type
echo -e "${BLUE}TEST 2: Create Exam Type${NC}"
echo -e "${YELLOW}Command:${NC}"
echo "curl -X POST \"$API_URL/api/exam-type\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\" \\"
echo "  -H \"Content-Type: application/json\" \\"
echo "  -d '{...}'"
echo ""
echo -e "${YELLOW}Response:${NC}"
curl -X POST "$API_URL/api/exam-type" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "examTypeName": "Unit Test",
    "examTypeCode": "UT-001",
    "description": "Unit test for students",
    "totalMarks": 50,
    "passingMarks": 20,
    "branchId": "'$BRANCH_ID'"
  }' 2>/dev/null | jq '.' || echo "Error or no response"
echo -e "\n${BLUE}---${NC}\n"

# Test 3: Get Marksheet Templates
echo -e "${BLUE}TEST 3: Get Marksheet Templates${NC}"
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"$API_URL/api/marksheet-template?branchId=$BRANCH_ID\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\""
echo ""
echo -e "${YELLOW}Response:${NC}"
curl -X GET "$API_URL/api/marksheet-template?branchId=$BRANCH_ID" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.' || echo "Error or no response"
echo -e "\n${BLUE}---${NC}\n"

# Test 4: Upload Marksheet Template (requires actual file)
echo -e "${BLUE}TEST 4: Upload Marksheet Template${NC}"
echo -e "${YELLOW}Command:${NC}"
echo "curl -X POST \"$API_URL/api/marksheet-template\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\" \\"
echo "  -F \"templateName=Standard Marksheet\" \\"
echo "  -F \"fileType=pdf\" \\"
echo "  -F \"branchId=$BRANCH_ID\" \\"
echo "  -F \"file=@/path/to/file.pdf\""
echo ""
echo -e "${YELLOW}Note: यह test के लिए actual PDF file की जरूरत है${NC}"
echo ""

# Test 5: Debug - Get all exam types (no branch filter)
echo -e "${BLUE}TEST 5: Debug - Get All Exam Types (No Filter)${NC}"
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"$API_URL/api/exam-type\" \\"
echo "  -H \"Authorization: Bearer $ADMIN_TOKEN\""
echo ""
echo -e "${YELLOW}Response:${NC}"
curl -X GET "$API_URL/api/exam-type" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" 2>/dev/null | jq '.' || echo "Error or no response"
echo -e "\n${BLUE}---${NC}\n"

echo -e "${GREEN}✅ Tests complete!${NC}\n"
