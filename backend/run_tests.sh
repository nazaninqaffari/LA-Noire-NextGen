#!/bin/bashset -e

echo "=========================================="
echo "LA Noire NextGen - Test Runner"
echo "=========================================="
echo ""

# Check if we're in the backend directory
if [ ! -f "manage.py" ]; then
    echo "Error: This script must be run from the backend directory"
    echo "Usage: cd backend && ./run_tests.sh"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate || . venv/Scripts/activate

# Install/upgrade dependencies
echo "Installing dependencies..."
pip install -q --upgrade pip
pip install -q -r requirements.txt

echo ""
echo "=========================================="
echo "Running Backend Tests"
echo "=========================================="
echo ""

# Run tests with pytest
python -m pytest tests/ -v --tb=short --maxfail=5

# Check exit code
if [ $? -eq 0 ]; then
    echo ""
    echo "=========================================="
    echo "✅ All tests passed!"
    echo "=========================================="
else
    echo ""
    echo "=========================================="
    echo "❌ Some tests failed"
    echo "=========================================="
    exit 1
fi

echo ""
echo "To run tests with coverage:"
echo "  python -m pytest tests/ --cov=apps --cov-report=html"
echo ""
echo "To run specific test:"
echo "  python -m pytest tests/test_accounts.py -v"
echo ""
