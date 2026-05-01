@echo off
REM Colors and formatting
setlocal enabledelayedexpansion

echo.
echo ========================================
echo Exam Type aur Marksheet Template Test
echo ========================================
echo.

REM Configuration - UPDATE THESE VALUES
set API_URL=http://localhost:5002
set ADMIN_TOKEN=your_admin_token_here
set BRANCH_ID=your_branch_id_here
set CLIENT_ID=your_client_id_here

echo WARNING: Pehle ye values update karein:
echo 1. ADMIN_TOKEN - Admin ka JWT token
echo 2. BRANCH_ID - Branch ka ID
echo 3. CLIENT_ID - Client ka ID
echo.
pause

REM Test 1: Get Exam Types
echo.
echo ========== TEST 1: Get Exam Types ==========
echo.
echo Command:
echo curl -X GET "%API_URL%/api/exam-type?branchId=%BRANCH_ID%" ^
echo   -H "Authorization: Bearer %ADMIN_TOKEN%"
echo.
echo Response:
echo.
curl -X GET "%API_URL%/api/exam-type?branchId=%BRANCH_ID%" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Content-Type: application/json"
echo.
echo.

REM Test 2: Create Exam Type
echo ========== TEST 2: Create Exam Type ==========
echo.
echo Command:
echo curl -X POST "%API_URL%/api/exam-type" ^
echo   -H "Authorization: Bearer %ADMIN_TOKEN%" ^
echo   -H "Content-Type: application/json" ^
echo   -d "{...}"
echo.
echo Response:
echo.
curl -X POST "%API_URL%/api/exam-type" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Content-Type: application/json" ^
  -d "{\"examTypeName\":\"Unit Test\",\"examTypeCode\":\"UT-001\",\"description\":\"Unit test for students\",\"totalMarks\":50,\"passingMarks\":20,\"branchId\":\"%BRANCH_ID%\"}"
echo.
echo.

REM Test 3: Get Marksheet Templates
echo ========== TEST 3: Get Marksheet Templates ==========
echo.
echo Command:
echo curl -X GET "%API_URL%/api/marksheet-template?branchId=%BRANCH_ID%" ^
echo   -H "Authorization: Bearer %ADMIN_TOKEN%"
echo.
echo Response:
echo.
curl -X GET "%API_URL%/api/marksheet-template?branchId=%BRANCH_ID%" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Content-Type: application/json"
echo.
echo.

REM Test 4: Debug - Get all exam types
echo ========== TEST 4: Debug - Get All Exam Types ==========
echo.
echo Command:
echo curl -X GET "%API_URL%/api/exam-type" ^
echo   -H "Authorization: Bearer %ADMIN_TOKEN%"
echo.
echo Response:
echo.
curl -X GET "%API_URL%/api/exam-type" ^
  -H "Authorization: Bearer %ADMIN_TOKEN%" ^
  -H "Content-Type: application/json"
echo.
echo.

echo ========== Tests Complete ==========
echo.
pause
