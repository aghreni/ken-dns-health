#!/bin/bash

# Test runner script for DNS Health Checker

echo "🧪 Running DNS Health Checker Tests..."
echo "======================================"

# Check if Jest is installed
if ! command -v jest &> /dev/null; then
    echo "Jest is not installed. Installing dependencies..."
    npm install
fi

# Run tests with coverage
echo "Running tests with coverage..."
npm run test:coverage

# Check test results
if [ $? -eq 0 ]; then
    echo "✅ All tests passed!"
    echo ""
    echo "📊 Test Coverage Report:"
    echo "========================"
    echo "Coverage report generated in './coverage' directory"
    echo "Open './coverage/lcov-report/index.html' to view detailed coverage report"
else
    echo "❌ Some tests failed!"
    exit 1
fi
