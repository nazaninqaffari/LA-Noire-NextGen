#!/bin/bash
set -e

echo "=========================================="
echo "LA Noire NextGen - Frontend Test Runner"
echo "=========================================="
echo ""

# Check if we're in the frontend directory
if [ ! -f "package.json" ]; then
    echo "Error: This script must be run from the frontend directory"
    echo "Usage: cd frontend && ./run_tests.sh"
    exit 1
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

echo ""
echo "=========================================="
echo "Running Frontend Tests"
echo "=========================================="
echo ""

# Run tests
npm test -- --run

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
echo "To run tests in watch mode:"
echo "  npm test"
echo ""
echo "To run tests with UI:"
echo "  npm run test:ui"
echo ""
echo "To run tests with coverage:"
echo "  npm run test:coverage"
echo ""
