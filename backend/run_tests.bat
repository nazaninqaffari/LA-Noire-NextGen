@echo off
setlocal

echo ==========================================
echo LA Noire NextGen - Test Runner
echo ==========================================
echo.

REM Check if we're in the backend directory
if not exist "manage.py" (
    echo Error: This script must be run from the backend directory
    echo Usage: cd backend ^&^& run_tests.bat
    exit /b 1
)

REM Check if virtual environment exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo.
echo ==========================================
echo Running Backend Tests
echo ==========================================
echo.

REM Run tests with pytest
python -m pytest tests/ -v --tb=short --maxfail=5

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
echo To run tests with coverage:
echo   python -m pytest tests/ --cov=apps --cov-report=html
echo.
echo To run specific test:
echo   python -m pytest tests/test_accounts.py -v
echo.

endlocal
