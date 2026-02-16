@echo off
setlocal

echo ==========================================
echo LA Noire NextGen - Frontend Test Runner
echo ==========================================
echo.

REM Check if we're in the frontend directory
if not exist "package.json" (
    echo Error: This script must be run from the frontend directory
    echo Usage: cd frontend ^&^& run_tests.bat
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo ==========================================
echo Running Frontend Tests
echo ==========================================
echo.

REM Run tests
call npm test -- --run

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ==========================================
    echo ✅ All tests passed!
    echo ==========================================
) else (
    echo.
    echo ==========================================
    echo ❌ Some tests failed
    echo ==========================================
    exit /b 1
)

echo.
echo To run tests in watch mode:
echo   npm test
echo.
echo To run tests with UI:
echo   npm run test:ui
echo.
echo To run tests with coverage:
echo   npm run test:coverage
echo.

endlocal
