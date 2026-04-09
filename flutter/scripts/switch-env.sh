#!/bin/bash

# =============================================================================
# Deskive Flutter - Environment Switching Script
# =============================================================================
# This script allows you to easily switch between development and production
# environments by copying the appropriate ..env file to ..env
# 
# Usage:
#   ./scripts/switch-.env.sh development
#   ./scripts/switch-.env.sh production
# =============================================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to display usage
show_usage() {
    echo "Usage: $0 [development|production|staging]"
    echo ""
    echo "Available environments:"
    echo "  development - Local development environment"
    echo "  production  - Production environment" 
    echo "  staging     - Staging environment (if .env.staging exists)"
    echo ""
    echo "Examples:"
    echo "  $0 development"
    echo "  $0 production"
    exit 1
}

# Function to switch environment
switch_environment() {
    local .env="$1"
    local env_file="$PROJECT_DIR/.env.$env"
    local target_file="$PROJECT_DIR/.env"

    print_info "Switching to $env environment..."

    # Check if source environment file exists
    if [[ ! -f "$env_file" ]]; then
        print_error "Environment file .env.$env not found!"
        echo "Available environment files:"
        ls -la "$PROJECT_DIR"/..env.* 2>/dev/null || echo "No environment files found"
        exit 1
    fi

    # Backup current ..env if it exists
    if [[ -f "$target_file" ]]; then
        cp "$target_file" "$target_file.backup"
        print_info "Backed up current .env to .env.backup"
    fi

    # Copy the environment file
    cp "$env_file" "$target_file"
    print_success "Switched to $env environment"

    # Show current configuration
    print_info "Current environment configuration:"
    echo "----------------------------------------"
    
    # Extract key configuration values
    if command -v grep >/dev/null 2>&1; then
        echo "Environment: $(grep "^FLUTTER_ENV=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "unknown")"
        echo "API Base URL: $(grep "^API_BASE_URL=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "WebSocket URL: $(grep "^WEBSOCKET_URL=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "Debug Mode: $(grep "^DEBUG_MODE=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "Production: $(grep "^IS_PRODUCTION=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
    else
        print_warning "grep not available, cannot show configuration details"
    fi
    
    echo "----------------------------------------"
    print_warning "Remember to restart your Flutter application to apply changes!"
}

# Function to show current environment
show_current() {
    local target_file="$PROJECT_DIR/.env"
    
    print_info "Current environment status:"
    echo "----------------------------------------"
    
    if [[ ! -f "$target_file" ]]; then
        print_warning "No .env file found. Run this script to set up an environment."
        return
    fi
    
    if command -v grep >/dev/null 2>&1; then
        local current_env
        current_env=$(grep "^FLUTTER_ENV=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "unknown")
        echo "Active Environment: $current_env"
        echo "API Base URL: $(grep "^API_BASE_URL=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "WebSocket URL: $(grep "^WEBSOCKET_URL=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "Debug Mode: $(grep "^DEBUG_MODE=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
        echo "Production: $(grep "^IS_PRODUCTION=" "$target_file" 2>/dev/null | cut -d'=' -f2 || echo "not set")"
    else
        print_warning "grep not available, cannot show configuration details"
    fi
    
    echo "----------------------------------------"
}

# Main logic
main() {
    print_info "Deskive Flutter Environment Switcher"
    echo ""

    case "${1:-}" in
        "development"|"dev")
            switch_environment "development"
            ;;
        "production"|"prod")
            switch_environment "production"
            ;;
        "staging")
            switch_environment "staging"
            ;;
        "current"|"status"|"")
            show_current
            ;;
        "help"|"-h"|"--help")
            show_usage
            ;;
        *)
            print_error "Unknown environment: $1"
            echo ""
            show_usage
            ;;
    esac
}

# Run main function with all arguments
main "$@"