#!/usr/bin/env python
"""
Test runner script for LA Noire NextGen.
Provides various test running options.
"""
import sys
import os
import subprocess
from pathlib import Path

# Add src to path
BASE_DIR = Path(__file__).resolve().parent
SRC_DIR = BASE_DIR / 'src'
sys.path.insert(0, str(SRC_DIR))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')


def run_unit_tests(verbose=False, coverage=False):
    """Run unit tests."""
    print("🧪 Running unit tests...")
    cmd = ['pytest', 'tests/test_accounts.py']
    
    if verbose:
        cmd.append('-v')
    
    if coverage:
        cmd.extend(['--cov=apps', '--cov-report=html', '--cov-report=term-missing'])
    
    result = subprocess.run(cmd)
    return result.returncode


def run_all_tests(verbose=False, coverage=False, parallel=False):
    """Run all tests."""
    print("🧪 Running all tests...")
    cmd = ['pytest', 'tests/']
    
    if verbose:
        cmd.append('-v')
    
    if coverage:
        cmd.extend(['--cov=apps', '--cov-report=html', '--cov-report=term-missing'])
    
    if parallel:
        cmd.extend(['-n', 'auto'])  # Use all available CPU cores
    
    result = subprocess.run(cmd)
    return result.returncode


def run_stress_tests(users=100, spawn_rate=10, duration='60s'):
    """Run stress tests using Locust."""
    print(f"⚡ Running stress tests ({users} users, spawn rate: {spawn_rate}/s, duration: {duration})...")
    print("Make sure the development server is running on http://localhost:8000")
    print("")
    
    cmd = [
        'locust',
        '-f', 'tests/stress_tests.py',
        '--host=http://localhost:8000',
        '--users', str(users),
        '--spawn-rate', str(spawn_rate),
        '--run-time', duration,
        '--headless'
    ]
    
    result = subprocess.run(cmd)
    return result.returncode


def run_stress_tests_web():
    """Run stress tests with web UI."""
    print("⚡ Starting Locust web UI...")
    print("Make sure the development server is running on http://localhost:8000")
    print("Open http://localhost:8089 in your browser to control the test")
    print("")
    
    cmd = [
        'locust',
        '-f', 'tests/stress_tests.py',
        '--host=http://localhost:8000'
    ]
    
    result = subprocess.run(cmd)
    return result.returncode


def show_coverage():
    """Open coverage report in browser."""
    import webbrowser
    coverage_file = BASE_DIR / 'htmlcov' / 'index.html'
    
    if coverage_file.exists():
        print("📊 Opening coverage report...")
        webbrowser.open(f'file://{coverage_file}')
    else:
        print("❌ Coverage report not found. Run tests with --coverage first.")
        return 1
    
    return 0


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(description='LA Noire NextGen Test Runner')
    parser.add_argument('command', choices=[
        'unit', 'all', 'stress', 'stress-web', 'coverage'
    ], help='Test command to run')
    parser.add_argument('-v', '--verbose', action='store_true', help='Verbose output')
    parser.add_argument('-c', '--coverage', action='store_true', help='Generate coverage report')
    parser.add_argument('-p', '--parallel', action='store_true', help='Run tests in parallel')
    parser.add_argument('--users', type=int, default=100, help='Number of users for stress test')
    parser.add_argument('--spawn-rate', type=int, default=10, help='Spawn rate for stress test')
    parser.add_argument('--duration', default='60s', help='Duration for stress test')
    
    args = parser.parse_args()
    
    if args.command == 'unit':
        return run_unit_tests(verbose=args.verbose, coverage=args.coverage)
    elif args.command == 'all':
        return run_all_tests(verbose=args.verbose, coverage=args.coverage, parallel=args.parallel)
    elif args.command == 'stress':
        return run_stress_tests(users=args.users, spawn_rate=args.spawn_rate, duration=args.duration)
    elif args.command == 'stress-web':
        return run_stress_tests_web()
    elif args.command == 'coverage':
        return show_coverage()


if __name__ == '__main__':
    sys.exit(main())
