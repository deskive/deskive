#!/bin/bash

# Flutter-Backend Integration Testing Script
# This script tests all major API endpoints and features

set -e  # Exit on any error

# Configuration
API_BASE="http://localhost:3002/api/v1"
TIMEOUT=10

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Global variables
AUTH_TOKEN=""
WORKSPACE_ID=""
USER_ID=""
TEST_FILE_ID=""
TEST_NOTE_ID=""
TEST_PROJECT_ID=""

# Utility functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Test HTTP endpoint
test_endpoint() {
    local method=$1
    local url=$2
    local data=$3
    local expected_status=$4
    local description=$5
    
    log_info "Testing: $description"
    log_info "Request: $method $url"
    
    local headers=""
    if [[ -n "$AUTH_TOKEN" ]]; then
        headers="-H \"Authorization: Bearer $AUTH_TOKEN\""
    fi
    
    local cmd="curl -s -w \"\\n%{http_code}\" -X $method"
    if [[ -n "$data" ]]; then
        cmd="$cmd -H \"Content-Type: application/json\" -d '$data'"
    fi
    if [[ -n "$headers" ]]; then
        cmd="$cmd $headers"
    fi
    cmd="$cmd \"$url\" --connect-timeout $TIMEOUT"
    
    local response=$(eval $cmd)
    local http_code=$(echo "$response" | tail -n1)
    local body=$(echo "$response" | sed '$d')
    
    if [[ "$http_code" == "$expected_status" ]]; then
        log_success "✓ $description (HTTP $http_code)"
        echo "$body"
        return 0
    else
        log_error "✗ $description (Expected $expected_status, got $http_code)"
        echo "$body"
        return 1
    fi
}

# Health check
test_health_check() {
    log_info "=== HEALTH CHECK ==="
    
    # Test basic connectivity
    if curl -s --connect-timeout 5 "$API_BASE/../" > /dev/null; then
        log_success "Backend server is accessible"
    else
        log_error "Cannot connect to backend server at $API_BASE"
        exit 1
    fi
}

# Authentication tests
test_authentication() {
    log_info "=== AUTHENTICATION TESTS ==="
    
    # Test user registration
    local register_data='{
        "email": "test@example.com",
        "password": "TestPassword123!",
        "name": "Test User",
        "confirmPassword": "TestPassword123!"
    }'
    
    local register_response=$(test_endpoint "POST" "$API_BASE/auth/register" "$register_data" "201" "User Registration")
    
    # Test user login
    local login_data='{
        "email": "test@example.com",
        "password": "TestPassword123!"
    }'
    
    local login_response=$(test_endpoint "POST" "$API_BASE/auth/login" "$login_data" "200" "User Login")
    
    # Extract token from login response
    AUTH_TOKEN=$(echo "$login_response" | jq -r '.data.accessToken // .accessToken // empty' 2>/dev/null || echo "")
    
    if [[ -n "$AUTH_TOKEN" ]]; then
        log_success "Authentication token obtained"
        
        # Test getting current user
        local me_response=$(test_endpoint "GET" "$API_BASE/auth/me" "" "200" "Get Current User")
        USER_ID=$(echo "$me_response" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
        
    else
        log_warning "Could not extract auth token from response"
    fi
}

# Workspace management tests
test_workspace_management() {
    log_info "=== WORKSPACE MANAGEMENT TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" ]]; then
        log_warning "Skipping workspace tests - no auth token"
        return
    fi
    
    # Create workspace
    local workspace_data='{
        "name": "Test Workspace",
        "description": "Integration test workspace",
        "type": "team"
    }'
    
    local create_response=$(test_endpoint "POST" "$API_BASE/workspaces" "$workspace_data" "201" "Create Workspace")
    WORKSPACE_ID=$(echo "$create_response" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$WORKSPACE_ID" ]]; then
        log_success "Workspace created with ID: $WORKSPACE_ID"
        
        # Get workspaces
        test_endpoint "GET" "$API_BASE/workspaces" "" "200" "Get Workspaces"
        
        # Get specific workspace
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID" "" "200" "Get Workspace Details"
        
        # Update workspace
        local update_data='{"name": "Updated Test Workspace"}'
        test_endpoint "PATCH" "$API_BASE/workspaces/$WORKSPACE_ID" "$update_data" "200" "Update Workspace"
        
    else
        log_warning "Could not extract workspace ID"
    fi
}

# File management tests  
test_file_management() {
    log_info "=== FILE MANAGEMENT TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping file tests - missing auth token or workspace ID"
        return
    fi
    
    # Create test file
    echo "This is a test file for integration testing" > /tmp/test_file.txt
    
    # Test file upload (mock - actual multipart upload would need different handling)
    local file_data='{
        "name": "test_file.txt",
        "content": "VGhpcyBpcyBhIHRlc3QgZmlsZSBmb3IgaW50ZWdyYXRpb24gdGVzdGluZw==",
        "mimeType": "text/plain",
        "size": 45
    }'
    
    # For now, just test the files endpoint structure
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/files" "" "200" "Get Files"
    
    # Test folder creation
    local folder_data='{"name": "Test Folder"}'
    test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/files/folders" "$folder_data" "201" "Create Folder"
    
    # Test file stats
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/files/stats" "" "200" "Get File Stats"
    
    # Clean up
    rm -f /tmp/test_file.txt
}

# Project management tests
test_project_management() {
    log_info "=== PROJECT MANAGEMENT TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping project tests - missing auth token or workspace ID"
        return
    fi
    
    # Create project
    local project_data='{
        "name": "Test Project",
        "description": "Integration test project",
        "status": "active",
        "priority": "medium"
    }'
    
    local project_response=$(test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/projects" "$project_data" "201" "Create Project")
    TEST_PROJECT_ID=$(echo "$project_response" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$TEST_PROJECT_ID" ]]; then
        # Get projects
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/projects" "" "200" "Get Projects"
        
        # Get specific project
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/projects/$TEST_PROJECT_ID" "" "200" "Get Project Details"
        
        # Create task
        local task_data='{
            "title": "Test Task",
            "description": "Integration test task",
            "status": "todo",
            "priority": "medium"
        }'
        
        test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/projects/$TEST_PROJECT_ID/tasks" "$task_data" "201" "Create Task"
        
        # Update project
        local update_data='{"name": "Updated Test Project"}'
        test_endpoint "PATCH" "$API_BASE/workspaces/$WORKSPACE_ID/projects/$TEST_PROJECT_ID" "$update_data" "200" "Update Project"
    fi
}

# Notes management tests
test_notes_management() {
    log_info "=== NOTES MANAGEMENT TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping notes tests - missing auth token or workspace ID"
        return
    fi
    
    # Create note
    local note_data='{
        "title": "Test Note",
        "content": {"text": "This is a test note content"},
        "contentText": "This is a test note content",
        "tags": ["test", "integration"],
        "isFavorite": false
    }'
    
    local note_response=$(test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/notes" "$note_data" "201" "Create Note")
    TEST_NOTE_ID=$(echo "$note_response" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
    
    if [[ -n "$TEST_NOTE_ID" ]]; then
        # Get notes
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/notes" "" "200" "Get Notes"
        
        # Get specific note
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/notes/$TEST_NOTE_ID" "" "200" "Get Note Details"
        
        # Update note
        local update_data='{"title": "Updated Test Note"}'
        test_endpoint "PATCH" "$API_BASE/workspaces/$WORKSPACE_ID/notes/$TEST_NOTE_ID" "$update_data" "200" "Update Note"
        
        # Search notes
        test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/notes/search?q=test" "" "200" "Search Notes"
    fi
}

# Calendar tests
test_calendar_management() {
    log_info "=== CALENDAR MANAGEMENT TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping calendar tests - missing auth token or workspace ID"
        return
    fi
    
    # Create calendar event
    local event_data='{
        "title": "Test Meeting",
        "description": "Integration test meeting",
        "startTime": "'$(date -d "+1 day" -Iseconds)'",
        "endTime": "'$(date -d "+1 day +1 hour" -Iseconds)'",
        "type": "meeting"
    }'
    
    local event_response=$(test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/calendar/events" "$event_data" "201" "Create Calendar Event")
    
    # Get calendar events
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/calendar/events" "" "200" "Get Calendar Events"
    
    # Get calendar rooms
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/calendar/rooms" "" "200" "Get Calendar Rooms"
}

# Chat tests
test_chat_functionality() {
    log_info "=== CHAT FUNCTIONALITY TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping chat tests - missing auth token or workspace ID"
        return
    fi
    
    # Create chat channel
    local channel_data='{
        "name": "test-channel",
        "description": "Integration test channel",
        "type": "public"
    }'
    
    test_endpoint "POST" "$API_BASE/workspaces/$WORKSPACE_ID/chat/channels" "$channel_data" "201" "Create Chat Channel"
    
    # Get chat channels
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/chat/channels" "" "200" "Get Chat Channels"
    
    # Get conversations
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/chat/conversations" "" "200" "Get Conversations"
}

# Notifications tests
test_notifications() {
    log_info "=== NOTIFICATIONS TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" ]]; then
        log_warning "Skipping notification tests - no auth token"
        return
    fi
    
    # Get notifications
    test_endpoint "GET" "$API_BASE/notifications" "" "200" "Get Notifications"
    
    # Get unread count
    test_endpoint "GET" "$API_BASE/notifications/unread-count" "" "200" "Get Unread Count"
    
    # Get notification preferences
    test_endpoint "GET" "$API_BASE/notifications/preferences" "" "200" "Get Notification Preferences"
}

# Integration tests
test_integrations() {
    log_info "=== INTEGRATION TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping integration tests - missing auth token or workspace ID"
        return
    fi
    
    # Test integration health
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/integrations/health" "" "200" "Integration Health Check"
}

# Search functionality tests
test_search_functionality() {
    log_info "=== SEARCH FUNCTIONALITY TESTS ==="
    
    if [[ -z "$AUTH_TOKEN" || -z "$WORKSPACE_ID" ]]; then
        log_warning "Skipping search tests - missing auth token or workspace ID"
        return
    fi
    
    # Test search
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/search?q=test" "" "200" "Search Workspace"
    
    # Test search suggestions
    test_endpoint "GET" "$API_BASE/workspaces/$WORKSPACE_ID/search/suggestions?q=test" "" "200" "Search Suggestions"
}

# Cleanup function
cleanup_test_data() {
    log_info "=== CLEANUP ==="
    
    if [[ -z "$AUTH_TOKEN" ]]; then
        return
    fi
    
    # Clean up created resources
    if [[ -n "$TEST_NOTE_ID" && -n "$WORKSPACE_ID" ]]; then
        test_endpoint "DELETE" "$API_BASE/workspaces/$WORKSPACE_ID/notes/$TEST_NOTE_ID" "" "204" "Delete Test Note" || true
    fi
    
    if [[ -n "$TEST_PROJECT_ID" && -n "$WORKSPACE_ID" ]]; then
        test_endpoint "DELETE" "$API_BASE/workspaces/$WORKSPACE_ID/projects/$TEST_PROJECT_ID" "" "204" "Delete Test Project" || true
    fi
    
    if [[ -n "$WORKSPACE_ID" ]]; then
        test_endpoint "DELETE" "$API_BASE/workspaces/$WORKSPACE_ID" "" "204" "Delete Test Workspace" || true
    fi
}

# Main test execution
main() {
    echo "==============================================="
    echo "   Flutter-Backend Integration Test Suite"
    echo "==============================================="
    echo ""
    
    # Check dependencies
    if ! command -v curl &> /dev/null; then
        log_error "curl is required but not installed"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_warning "jq is not installed - JSON parsing will be limited"
    fi
    
    # Run tests
    test_health_check
    test_authentication
    test_workspace_management
    test_file_management
    test_project_management
    test_notes_management
    test_calendar_management
    test_chat_functionality
    test_notifications
    test_integrations
    test_search_functionality
    
    # Cleanup
    cleanup_test_data
    
    echo ""
    echo "==============================================="
    echo "   Integration Testing Complete"
    echo "==============================================="
}

# Run main function
main "$@"