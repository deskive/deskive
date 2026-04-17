-- =====================================================
-- Deskive Database Schema - Initial Migration
-- Auto-generated from schema.ts
-- Generated: 2026-04-09T14:11:02.126Z
-- Tables: 148
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==================== WORKSPACES ====================
CREATE TABLE IF NOT EXISTS "workspaces" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "logo" TEXT,
  "website" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "owner_id" VARCHAR(255) NOT NULL,
  "max_members" INTEGER DEFAULT 10,
  "max_storage_gb" INTEGER DEFAULT 10,
  "settings" JSONB DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workspaces_owner_id" ON "workspaces" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_workspaces_is_active" ON "workspaces" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workspaces_created_at" ON "workspaces" ("created_at");

-- ==================== WORKSPACE_SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS "workspace_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "plan" VARCHAR(255) NOT NULL DEFAULT 'free',
  "billing_cycle" VARCHAR(255),
  "status" VARCHAR(255) NOT NULL DEFAULT 'active',
  "source" VARCHAR(255),
  "stripe_customer_id" VARCHAR(255),
  "stripe_subscription_id" VARCHAR(255),
  "apple_product_id" VARCHAR(255),
  "apple_transaction_id" VARCHAR(255),
  "apple_original_transaction_id" VARCHAR(255),
  "google_product_id" VARCHAR(255),
  "google_purchase_token" VARCHAR(255),
  "google_order_id" VARCHAR(255),
  "current_period_start" TIMESTAMPTZ,
  "current_period_end" TIMESTAMPTZ,
  "cancel_at_period_end" BOOLEAN DEFAULT false,
  "trial_end" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_subscriptions_workspace_id" ON "workspace_subscriptions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_status" ON "workspace_subscriptions" ("status");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_source" ON "workspace_subscriptions" ("source");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_plan" ON "workspace_subscriptions" ("plan");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_stripe_subscription_id" ON "workspace_subscriptions" ("stripe_subscription_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_apple_original_transaction_id" ON "workspace_subscriptions" ("apple_original_transaction_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_google_order_id" ON "workspace_subscriptions" ("google_order_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_subscriptions_current_period_end" ON "workspace_subscriptions" ("current_period_end");

-- ==================== WORKSPACE_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "workspace_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) NOT NULL DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "invited_at" TIMESTAMPTZ,
  "invited_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "collaborative_data" JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_members_workspace_id_user_id" ON "workspace_members" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_workspace_id" ON "workspace_members" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_user_id" ON "workspace_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_role" ON "workspace_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_workspace_members_is_active" ON "workspace_members" ("is_active");

-- ==================== WORKSPACE_SETTINGS ====================
CREATE TABLE IF NOT EXISTS "workspace_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "key" VARCHAR(255) NOT NULL,
  "value" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_settings_workspace_id_key" ON "workspace_settings" ("workspace_id", "key");
CREATE INDEX IF NOT EXISTS "idx_workspace_settings_workspace_id" ON "workspace_settings" ("workspace_id");

-- ==================== WORKSPACE_INVITES ====================
CREATE TABLE IF NOT EXISTS "workspace_invites" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "email" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "invited_by" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "accepted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workspace_invites_workspace_id" ON "workspace_invites" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_email" ON "workspace_invites" ("email");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_status" ON "workspace_invites" ("status");
CREATE INDEX IF NOT EXISTS "idx_workspace_invites_expires_at" ON "workspace_invites" ("expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workspace_invites_token" ON "workspace_invites" ("token");

-- ==================== CHANNELS ====================
CREATE TABLE IF NOT EXISTS "channels" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(255) DEFAULT 'channel',
  "is_private" BOOLEAN DEFAULT false,
  "is_archived" BOOLEAN DEFAULT false,
  "archived_at" TIMESTAMPTZ,
  "archived_by" VARCHAR(255),
  "created_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_channels_workspace_id" ON "channels" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_channels_type" ON "channels" ("type");
CREATE INDEX IF NOT EXISTS "idx_channels_is_private" ON "channels" ("is_private");
CREATE INDEX IF NOT EXISTS "idx_channels_is_archived" ON "channels" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_channels_created_by" ON "channels" ("created_by");

-- ==================== MESSAGES ====================
CREATE TABLE IF NOT EXISTS "messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" UUID REFERENCES "channels"(id) ON DELETE CASCADE,
  "conversation_id" UUID REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT,
  "content_html" TEXT,
  "encrypted_content" TEXT,
  "encryption_metadata" JSONB,
  "is_encrypted" BOOLEAN DEFAULT false,
  "thread_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "parent_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "reply_count" INTEGER DEFAULT 0,
  "attachments" JSONB DEFAULT '[]',
  "mentions" JSONB DEFAULT '[]',
  "linked_content" JSONB DEFAULT '[]',
  "reactions" JSONB DEFAULT '{}',
  "is_edited" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "is_bookmarked" BOOLEAN DEFAULT false,
  "bookmarked_at" TIMESTAMPTZ,
  "bookmarked_by" VARCHAR(255),
  "is_pinned" BOOLEAN DEFAULT false,
  "pinned_at" TIMESTAMPTZ,
  "pinned_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_messages_channel_id_created_at" ON "messages" ("channel_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_created_at" ON "messages" ("conversation_id", "created_at");
CREATE INDEX IF NOT EXISTS "idx_messages_user_id" ON "messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_messages_thread_id" ON "messages" ("thread_id");
CREATE INDEX IF NOT EXISTS "idx_messages_parent_id" ON "messages" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_messages_is_deleted" ON "messages" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_messages_is_bookmarked" ON "messages" ("is_bookmarked");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_is_bookmarked" ON "messages" ("conversation_id", "is_bookmarked");
CREATE INDEX IF NOT EXISTS "idx_messages_is_pinned" ON "messages" ("is_pinned");
CREATE INDEX IF NOT EXISTS "idx_messages_conversation_id_is_pinned" ON "messages" ("conversation_id", "is_pinned");
CREATE INDEX IF NOT EXISTS "idx_messages_channel_id_is_pinned" ON "messages" ("channel_id", "is_pinned");

-- ==================== MESSAGE_REACTIONS ====================
CREATE TABLE IF NOT EXISTS "message_reactions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "emoji" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_message_reactions_message_id_user_id_emoji" ON "message_reactions" ("message_id", "user_id", "emoji");
CREATE INDEX IF NOT EXISTS "idx_message_reactions_message_id" ON "message_reactions" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_reactions_user_id" ON "message_reactions" ("user_id");

-- ==================== MESSAGE_READ_RECEIPTS ====================
CREATE TABLE IF NOT EXISTS "message_read_receipts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "read_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_message_read_receipts_message_id_user_id" ON "message_read_receipts" ("message_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_message_id" ON "message_read_receipts" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_user_id" ON "message_read_receipts" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_message_read_receipts_read_at" ON "message_read_receipts" ("read_at");

-- ==================== POLL_VOTES ====================
CREATE TABLE IF NOT EXISTS "poll_votes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "message_id" UUID NOT NULL REFERENCES "messages"(id) ON DELETE CASCADE,
  "poll_id" VARCHAR(255) NOT NULL,
  "option_id" VARCHAR(255) NOT NULL,
  "user_id" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_poll_votes_message_id" ON "poll_votes" ("message_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_poll_id" ON "poll_votes" ("poll_id");
CREATE INDEX IF NOT EXISTS "idx_poll_votes_user_id" ON "poll_votes" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_poll_votes_message_id_poll_id_user_id" ON "poll_votes" ("message_id", "poll_id", "user_id");

-- ==================== SCHEDULED_MESSAGES ====================
CREATE TABLE IF NOT EXISTS "scheduled_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "channel_id" UUID REFERENCES "channels"(id) ON DELETE CASCADE,
  "conversation_id" UUID REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_html" TEXT,
  "attachments" JSONB DEFAULT '[]',
  "mentions" JSONB DEFAULT '[]',
  "linked_content" JSONB DEFAULT '[]',
  "thread_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "parent_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "sent_at" TIMESTAMPTZ,
  "sent_message_id" UUID REFERENCES "messages"(id) ON DELETE CASCADE,
  "failure_reason" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_workspace_id" ON "scheduled_messages" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_channel_id" ON "scheduled_messages" ("channel_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_conversation_id" ON "scheduled_messages" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_user_id" ON "scheduled_messages" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_scheduled_at" ON "scheduled_messages" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_status" ON "scheduled_messages" ("status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_messages_status_scheduled_at" ON "scheduled_messages" ("status", "scheduled_at");

-- ==================== PROJECTS ====================
CREATE TABLE IF NOT EXISTS "projects" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "type" VARCHAR(255) DEFAULT 'kanban',
  "status" VARCHAR(255) DEFAULT 'active',
  "priority" VARCHAR(255),
  "owner_id" VARCHAR(255),
  "lead_id" VARCHAR(255),
  "start_date" DATE,
  "end_date" DATE,
  "estimated_hours" TEXT,
  "actual_hours" TEXT,
  "budget" TEXT,
  "is_template" BOOLEAN DEFAULT false,
  "kanban_stages" JSONB DEFAULT '[{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}, {"id": "in_progress", "name": "In Progress", "order": 2, "color": "#F59E0B"}, {"id": "done", "name": "Done", "order": 3, "color": "#10B981"}]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "archived_at" TIMESTAMPTZ,
  "archived_by" VARCHAR(255),
  "settings" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_projects_workspace_id" ON "projects" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_projects_status" ON "projects" ("status");
CREATE INDEX IF NOT EXISTS "idx_projects_owner_id" ON "projects" ("owner_id");
CREATE INDEX IF NOT EXISTS "idx_projects_type" ON "projects" ("type");
CREATE INDEX IF NOT EXISTS "idx_projects_priority" ON "projects" ("priority");
CREATE INDEX IF NOT EXISTS "idx_projects_created_at" ON "projects" ("created_at");

-- ==================== PROJECT_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "project_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "invited_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "notification_settings" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_members_project_id_user_id" ON "project_members" ("project_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_project_id" ON "project_members" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_user_id" ON "project_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_members_role" ON "project_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_project_members_is_active" ON "project_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_project_members_joined_at" ON "project_members" ("joined_at");

-- ==================== TASKS ====================
CREATE TABLE IF NOT EXISTS "tasks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "sprint_id" UUID,
  "parent_task_id" UUID REFERENCES "tasks"(id) ON DELETE CASCADE,
  "task_type" VARCHAR(255) NOT NULL DEFAULT 'task',
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "status" VARCHAR(255) DEFAULT 'todo',
  "priority" VARCHAR(255) DEFAULT 'medium',
  "assigned_to" JSONB,
  "assignee_team_member_id" UUID,
  "reporter_team_member_id" UUID,
  "due_date" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "completed_by" VARCHAR(255),
  "estimated_hours" TEXT,
  "actual_hours" TEXT,
  "story_points" INTEGER,
  "labels" JSONB DEFAULT '[]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "collaborative_data" JSONB DEFAULT '{}',
  "custom_fields" JSONB DEFAULT '[]',
  "created_by" VARCHAR(255),
  "updated_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_tasks_project_id" ON "tasks" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_sprint_id" ON "tasks" ("sprint_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_assigned_to" ON "tasks" ("assigned_to");
CREATE INDEX IF NOT EXISTS "idx_tasks_assignee_team_member_id" ON "tasks" ("assignee_team_member_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_reporter_team_member_id" ON "tasks" ("reporter_team_member_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_status" ON "tasks" ("status");
CREATE INDEX IF NOT EXISTS "idx_tasks_priority" ON "tasks" ("priority");
CREATE INDEX IF NOT EXISTS "idx_tasks_due_date" ON "tasks" ("due_date");
CREATE INDEX IF NOT EXISTS "idx_tasks_parent_task_id" ON "tasks" ("parent_task_id");
CREATE INDEX IF NOT EXISTS "idx_tasks_task_type" ON "tasks" ("task_type");

-- ==================== TASK_CUSTOM_FIELD_DEFINITIONS ====================
CREATE TABLE IF NOT EXISTS "task_custom_field_definitions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "field_type" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "options" JSONB DEFAULT '[]',
  "default_value" JSONB,
  "is_required" BOOLEAN DEFAULT false,
  "is_visible" BOOLEAN DEFAULT true,
  "sort_order" INTEGER DEFAULT 0,
  "settings" JSONB DEFAULT '{}',
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_project_id" ON "task_custom_field_definitions" ("project_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_project_id_name" ON "task_custom_field_definitions" ("project_id", "name");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_field_type" ON "task_custom_field_definitions" ("field_type");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_is_visible" ON "task_custom_field_definitions" ("is_visible");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_sort_order" ON "task_custom_field_definitions" ("sort_order");
CREATE INDEX IF NOT EXISTS "idx_task_custom_field_definitions_created_at" ON "task_custom_field_definitions" ("created_at");

-- ==================== TASK_COMMENTS ====================
CREATE TABLE IF NOT EXISTS "task_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_html" TEXT,
  "attachments" JSONB DEFAULT '[]',
  "is_edited" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_comments_task_id" ON "task_comments" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_user_id" ON "task_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_task_comments_created_at" ON "task_comments" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_task_comments_is_deleted" ON "task_comments" ("is_deleted");

-- ==================== FOLDERS ====================
CREATE TABLE IF NOT EXISTS "folders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "parent_id" UUID REFERENCES "folders"(id) ON DELETE CASCADE,
  "parent_ids" JSONB,
  "created_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_folders_workspace_id" ON "folders" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_folders_parent_id" ON "folders" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_folders_is_deleted" ON "folders" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_folders_created_by" ON "folders" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_folders_created_at" ON "folders" ("created_at");

-- ==================== FILES ====================
CREATE TABLE IF NOT EXISTS "files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "storage_path" TEXT NOT NULL,
  "url" TEXT,
  "mime_type" VARCHAR(255),
  "size" BIGINT,
  "uploaded_by" VARCHAR(255),
  "folder_id" UUID REFERENCES "folders"(id) ON DELETE CASCADE,
  "parent_folder_ids" JSONB DEFAULT '{}',
  "version" INTEGER DEFAULT 1,
  "previous_version_id" UUID REFERENCES "files"(id) ON DELETE CASCADE,
  "file_hash" VARCHAR(255),
  "virus_scan_status" VARCHAR(255) DEFAULT 'pending',
  "virus_scan_at" TIMESTAMPTZ,
  "extracted_text" TEXT,
  "ocr_status" VARCHAR(255),
  "is_ai_generated" BOOLEAN,
  "metadata" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "starred" BOOLEAN DEFAULT false,
  "starred_at" TIMESTAMPTZ,
  "starred_by" VARCHAR(255),
  "last_opened_at" TIMESTAMPTZ,
  "last_opened_by" VARCHAR(255),
  "open_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_files_workspace_id" ON "files" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_files_folder_id" ON "files" ("folder_id");
CREATE INDEX IF NOT EXISTS "idx_files_uploaded_by" ON "files" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_files_is_deleted" ON "files" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_files_mime_type" ON "files" ("mime_type");
CREATE INDEX IF NOT EXISTS "idx_files_file_hash" ON "files" ("file_hash");
CREATE INDEX IF NOT EXISTS "idx_files_starred" ON "files" ("starred");
CREATE INDEX IF NOT EXISTS "idx_files_created_at" ON "files" ("created_at");

-- ==================== FILE_SHARES ====================
CREATE TABLE IF NOT EXISTS "file_shares" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "shared_by" VARCHAR(255) NOT NULL,
  "shared_with" VARCHAR(255),
  "share_token" VARCHAR(255) NOT NULL UNIQUE,
  "share_type" VARCHAR(255) DEFAULT 'user',
  "access_level" VARCHAR(255) DEFAULT 'view',
  "permissions" JSONB DEFAULT '{}',
  "expires_at" TIMESTAMPTZ,
  "password" VARCHAR(255),
  "max_downloads" INTEGER,
  "download_count" INTEGER DEFAULT 0,
  "view_count" INTEGER DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_file_shares_file_id" ON "file_shares" ("file_id");
CREATE INDEX IF NOT EXISTS "idx_file_shares_shared_by" ON "file_shares" ("shared_by");
CREATE INDEX IF NOT EXISTS "idx_file_shares_shared_with" ON "file_shares" ("shared_with");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_file_shares_share_token" ON "file_shares" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_file_shares_share_type" ON "file_shares" ("share_type");
CREATE INDEX IF NOT EXISTS "idx_file_shares_expires_at" ON "file_shares" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_file_shares_is_active" ON "file_shares" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_file_shares_created_at" ON "file_shares" ("created_at");

-- ==================== FILE_COMMENTS ====================
CREATE TABLE IF NOT EXISTS "file_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "parent_id" UUID REFERENCES "file_comments"(id) ON DELETE CASCADE,
  "is_resolved" BOOLEAN DEFAULT false,
  "resolved_by" VARCHAR(255),
  "resolved_at" TIMESTAMPTZ,
  "is_edited" BOOLEAN DEFAULT false,
  "edited_at" TIMESTAMPTZ,
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_file_comments_file_id" ON "file_comments" ("file_id");
CREATE INDEX IF NOT EXISTS "idx_file_comments_user_id" ON "file_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_file_comments_parent_id" ON "file_comments" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_file_comments_is_resolved" ON "file_comments" ("is_resolved");
CREATE INDEX IF NOT EXISTS "idx_file_comments_is_deleted" ON "file_comments" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_file_comments_created_at" ON "file_comments" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_file_comments_file_id_is_deleted" ON "file_comments" ("file_id", "is_deleted");

-- ==================== OFFLINE_FILES ====================
CREATE TABLE IF NOT EXISTS "offline_files" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "file_id" UUID NOT NULL REFERENCES "files"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "sync_status" VARCHAR(255) DEFAULT 'pending',
  "last_synced_at" TIMESTAMPTZ,
  "synced_version" INTEGER DEFAULT 1,
  "auto_sync" BOOLEAN DEFAULT true,
  "priority" INTEGER DEFAULT 0,
  "file_size" BIGINT NOT NULL,
  "error_message" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_offline_files_file_id_user_id" ON "offline_files" ("file_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_offline_files_user_id" ON "offline_files" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_offline_files_workspace_id" ON "offline_files" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_offline_files_sync_status" ON "offline_files" ("sync_status");
CREATE INDEX IF NOT EXISTS "idx_offline_files_auto_sync" ON "offline_files" ("auto_sync");
CREATE INDEX IF NOT EXISTS "idx_offline_files_user_id_workspace_id" ON "offline_files" ("user_id", "workspace_id");

-- ==================== CHANNEL_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "channel_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "channel_id" UUID NOT NULL REFERENCES "channels"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "permissions" JSONB DEFAULT '[]',
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "added_by" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_read_at" TIMESTAMPTZ,
  "notification_settings" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_channel_members_channel_id_user_id" ON "channel_members" ("channel_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_channel_id" ON "channel_members" ("channel_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_user_id" ON "channel_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_channel_members_role" ON "channel_members" ("role");
CREATE INDEX IF NOT EXISTS "idx_channel_members_is_active" ON "channel_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_channel_members_joined_at" ON "channel_members" ("joined_at");

-- ==================== CONVERSATIONS ====================
CREATE TABLE IF NOT EXISTS "conversations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "type" VARCHAR(255) DEFAULT 'direct',
  "name" VARCHAR(255),
  "description" TEXT,
  "participants" JSONB NOT NULL,
  "created_by" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "is_archived" BOOLEAN DEFAULT false,
  "archived_at" TIMESTAMPTZ,
  "archived_by" VARCHAR(255),
  "last_message_at" TIMESTAMPTZ,
  "message_count" INTEGER DEFAULT 0,
  "settings" JSONB DEFAULT '{}',
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_conversations_workspace_id" ON "conversations" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_conversations_type" ON "conversations" ("type");
CREATE INDEX IF NOT EXISTS "idx_conversations_created_by" ON "conversations" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_conversations_is_active" ON "conversations" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_conversations_is_archived" ON "conversations" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_conversations_last_message_at" ON "conversations" ("last_message_at");
CREATE INDEX IF NOT EXISTS "idx_conversations_created_at" ON "conversations" ("created_at");

-- ==================== CONVERSATION_MEMBERS ====================
CREATE TABLE IF NOT EXISTS "conversation_members" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'member',
  "is_active" BOOLEAN DEFAULT true,
  "is_starred" BOOLEAN DEFAULT false,
  "starred_at" TIMESTAMPTZ,
  "last_read_at" TIMESTAMPTZ,
  "last_read_message_id" UUID,
  "joined_at" TIMESTAMPTZ DEFAULT now(),
  "left_at" TIMESTAMPTZ,
  "notifications_enabled" BOOLEAN DEFAULT true,
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_conversation_members_conversation_id_user_id" ON "conversation_members" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_conversation_id" ON "conversation_members" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_user_id" ON "conversation_members" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_is_active" ON "conversation_members" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_is_starred" ON "conversation_members" ("is_starred");
CREATE INDEX IF NOT EXISTS "idx_conversation_members_joined_at" ON "conversation_members" ("joined_at");

-- ==================== EVENT_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS "event_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "color" VARCHAR(255) NOT NULL,
  "icon" VARCHAR(255),
  "description_file_ids" JSONB DEFAULT '[]',
  "is_default" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_categories_workspace_id" ON "event_categories" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_categories_workspace_id_name" ON "event_categories" ("workspace_id", "name");
CREATE INDEX IF NOT EXISTS "idx_event_categories_created_by" ON "event_categories" ("created_by");

-- ==================== MEETING_ROOMS ====================
CREATE TABLE IF NOT EXISTS "meeting_rooms" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "location" VARCHAR(255),
  "capacity" INTEGER DEFAULT 10,
  "room_type" VARCHAR(255) DEFAULT 'conference',
  "equipment" JSONB DEFAULT '[]',
  "amenities" JSONB DEFAULT '[]',
  "status" VARCHAR(255) DEFAULT 'available',
  "booking_policy" VARCHAR(255) DEFAULT 'open',
  "working_hours" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "room_code" VARCHAR(255) UNIQUE,
  "floor" VARCHAR(255),
  "building" VARCHAR(255),
  "thumbnail_url" TEXT,
  "images" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_workspace_id" ON "meeting_rooms" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_status" ON "meeting_rooms" ("status");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_capacity" ON "meeting_rooms" ("capacity");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_room_type" ON "meeting_rooms" ("room_type");
CREATE INDEX IF NOT EXISTS "idx_meeting_rooms_is_active" ON "meeting_rooms" ("is_active");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_meeting_rooms_room_code" ON "meeting_rooms" ("room_code");

-- ==================== CALENDAR_EVENTS ====================
CREATE TABLE IF NOT EXISTS "calendar_events" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "all_day" BOOLEAN DEFAULT false,
  "location" VARCHAR(255),
  "organizer_id" VARCHAR(255),
  "attendees" JSONB DEFAULT '[]',
  "recurrence_rule" JSONB,
  "is_recurring" BOOLEAN DEFAULT false,
  "parent_event_id" UUID REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "meeting_url" TEXT,
  "visibility" VARCHAR(255) DEFAULT 'private',
  "busy_status" VARCHAR(255) DEFAULT 'busy',
  "priority" VARCHAR(255) DEFAULT 'normal',
  "status" VARCHAR(255) DEFAULT 'confirmed',
  "room_id" UUID,
  "category_id" UUID,
  "attachments" JSONB DEFAULT '{"file_attachment": [], "note_attachment": [], "event_attachment": []}',
  "drive_attachment" JSONB DEFAULT '[]',
  "description_file_ids" JSONB DEFAULT '[]',
  "last_modified_by" VARCHAR(255),
  "collaborative_data" JSONB DEFAULT '{}',
  "google_calendar_event_id" VARCHAR(255),
  "google_calendar_connection_id" UUID REFERENCES "google_calendar_connections"(id) ON DELETE CASCADE,
  "synced_from_google" BOOLEAN DEFAULT false,
  "google_calendar_html_link" TEXT,
  "google_calendar_updated_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_calendar_events_workspace_id" ON "calendar_events" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_organizer_id" ON "calendar_events" ("organizer_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_start_time" ON "calendar_events" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_end_time" ON "calendar_events" ("end_time");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_all_day" ON "calendar_events" ("all_day");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_is_recurring" ON "calendar_events" ("is_recurring");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_parent_event_id" ON "calendar_events" ("parent_event_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_room_id" ON "calendar_events" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_status" ON "calendar_events" ("status");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_google_calendar_event_id" ON "calendar_events" ("google_calendar_event_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_google_calendar_connection_id" ON "calendar_events" ("google_calendar_connection_id");
CREATE INDEX IF NOT EXISTS "idx_calendar_events_synced_from_google" ON "calendar_events" ("synced_from_google");

-- ==================== MEETING_BOOKINGS ====================
CREATE TABLE IF NOT EXISTS "meeting_bookings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL REFERENCES "meeting_rooms"(id) ON DELETE CASCADE,
  "event_id" UUID REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "booked_by" VARCHAR(255) NOT NULL,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'confirmed',
  "purpose" VARCHAR(255),
  "notes" TEXT,
  "attendee_count" INTEGER,
  "required_equipment" JSONB DEFAULT '[]',
  "catering_requirements" JSONB DEFAULT '{}',
  "is_recurring" BOOLEAN DEFAULT false,
  "recurring_pattern_id" VARCHAR(255),
  "cancelled_at" TIMESTAMPTZ,
  "cancelled_by" VARCHAR(255),
  "cancellation_reason" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_room_id" ON "meeting_bookings" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_start_time_end_time" ON "meeting_bookings" ("start_time", "end_time");
CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_booked_by" ON "meeting_bookings" ("booked_by");
CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_status" ON "meeting_bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_event_id" ON "meeting_bookings" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_bookings_is_recurring" ON "meeting_bookings" ("is_recurring");

-- ==================== ROOM_BOOKINGS ====================
CREATE TABLE IF NOT EXISTS "room_bookings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "room_id" UUID NOT NULL REFERENCES "meeting_rooms"(id) ON DELETE CASCADE,
  "event_id" UUID REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "booked_by" VARCHAR(255) NOT NULL,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'confirmed',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_room_bookings_room_id" ON "room_bookings" ("room_id");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_start_time_end_time" ON "room_bookings" ("start_time", "end_time");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_status" ON "room_bookings" ("status");
CREATE INDEX IF NOT EXISTS "idx_room_bookings_event_id" ON "room_bookings" ("event_id");

-- ==================== EVENT_ATTENDEES ====================
CREATE TABLE IF NOT EXISTS "event_attendees" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "email" VARCHAR(255),
  "name" VARCHAR(255),
  "status" VARCHAR(255) DEFAULT 'pending',
  "response_message" TEXT,
  "responded_at" TIMESTAMPTZ,
  "is_organizer" BOOLEAN DEFAULT false,
  "is_required" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_attendees_event_id" ON "event_attendees" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_attendees_user_id" ON "event_attendees" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_attendees_status" ON "event_attendees" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_attendees_event_id_user_id" ON "event_attendees" ("event_id", "user_id");

-- ==================== EVENT_REMINDERS ====================
CREATE TABLE IF NOT EXISTS "event_reminders" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "reminder_time" INTEGER NOT NULL,
  "notification_type" VARCHAR(255) DEFAULT 'email',
  "is_sent" BOOLEAN DEFAULT false,
  "sent_at" TIMESTAMPTZ,
  "scheduled_for" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_reminders_event_id" ON "event_reminders" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_user_id" ON "event_reminders" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_is_sent" ON "event_reminders" ("is_sent");
CREATE INDEX IF NOT EXISTS "idx_event_reminders_scheduled_for" ON "event_reminders" ("scheduled_for");

-- ==================== EVENT_BOT_ASSIGNMENTS ====================
CREATE TABLE IF NOT EXISTS "event_bot_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "settings" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_event_bot_assignments_event_id" ON "event_bot_assignments" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_event_bot_assignments_bot_id" ON "event_bot_assignments" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_event_bot_assignments_user_id" ON "event_bot_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_event_bot_assignments_workspace_id" ON "event_bot_assignments" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_event_bot_assignments_event_id_bot_id" ON "event_bot_assignments" ("event_id", "bot_id");

-- ==================== PROJECT_BOT_ASSIGNMENTS ====================
CREATE TABLE IF NOT EXISTS "project_bot_assignments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "settings" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_project_bot_assignments_project_id" ON "project_bot_assignments" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_project_bot_assignments_bot_id" ON "project_bot_assignments" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_project_bot_assignments_user_id" ON "project_bot_assignments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_project_bot_assignments_workspace_id" ON "project_bot_assignments" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_bot_assignments_project_id_bot_id" ON "project_bot_assignments" ("project_id", "bot_id");

-- ==================== NOTES ====================
CREATE TABLE IF NOT EXISTS "notes" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "content_text" TEXT,
  "parent_id" UUID REFERENCES "notes"(id) ON DELETE CASCADE,
  "author_id" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "last_edited_by" VARCHAR(255),
  "position" INTEGER DEFAULT 0,
  "template_id" UUID REFERENCES "note_templates"(id) ON DELETE CASCADE,
  "view_count" INTEGER DEFAULT 0,
  "is_published" BOOLEAN DEFAULT false,
  "published_at" TIMESTAMPTZ,
  "slug" VARCHAR(255),
  "cover_image" TEXT,
  "icon" VARCHAR(255),
  "tags" JSONB DEFAULT '[]',
  "attachments" JSONB DEFAULT '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
  "is_template" BOOLEAN DEFAULT false,
  "is_public" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "archived_at" TIMESTAMPTZ,
  "is_favorite" BOOLEAN DEFAULT false,
  "collaborative_data" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notes_workspace_id" ON "notes" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_notes_created_by" ON "notes" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_notes_parent_id" ON "notes" ("parent_id");
CREATE INDEX IF NOT EXISTS "idx_notes_is_favorite" ON "notes" ("is_favorite");
CREATE INDEX IF NOT EXISTS "idx_notes_is_published" ON "notes" ("is_published");
CREATE INDEX IF NOT EXISTS "idx_notes_is_template" ON "notes" ("is_template");
CREATE INDEX IF NOT EXISTS "idx_notes_template_id" ON "notes" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_notes_slug" ON "notes" ("slug");
CREATE INDEX IF NOT EXISTS "idx_notes_created_at" ON "notes" ("created_at");

-- ==================== NOTE_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS "note_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "content" TEXT NOT NULL,
  "category" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "is_public" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_note_templates_workspace_id" ON "note_templates" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_note_templates_created_by" ON "note_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_note_templates_category" ON "note_templates" ("category");
CREATE INDEX IF NOT EXISTS "idx_note_templates_is_public" ON "note_templates" ("is_public");
CREATE INDEX IF NOT EXISTS "idx_note_templates_created_at" ON "note_templates" ("created_at");

-- ==================== ACTIVITY_LOGS ====================
CREATE TABLE IF NOT EXISTS "activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "entity_type" VARCHAR(255) NOT NULL,
  "entity_id" UUID NOT NULL,
  "old_values" JSONB,
  "new_values" JSONB,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_activity_logs_workspace_id" ON "activity_logs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_user_id" ON "activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_action" ON "activity_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity_type" ON "activity_logs" ("entity_type");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_entity_id" ON "activity_logs" ("entity_id");
CREATE INDEX IF NOT EXISTS "idx_activity_logs_created_at" ON "activity_logs" ("created_at");

-- ==================== USER_SETTINGS ====================
CREATE TABLE IF NOT EXISTS "user_settings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL UNIQUE,
  "theme" VARCHAR(255) DEFAULT 'light',
  "language" VARCHAR(255) DEFAULT 'en',
  "timezone" VARCHAR(255) DEFAULT 'UTC',
  "date_format" VARCHAR(255) DEFAULT 'MM/dd/yyyy',
  "time_format" VARCHAR(255) DEFAULT '12h',
  "notifications" JSONB DEFAULT '{}',
  "privacy" JSONB DEFAULT '{}',
  "editor_preferences" JSONB DEFAULT '{}',
  "dashboard_layout" JSONB DEFAULT '{}',
  "sidebar_collapsed" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_settings_user_id" ON "user_settings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_settings_theme" ON "user_settings" ("theme");
CREATE INDEX IF NOT EXISTS "idx_user_settings_language" ON "user_settings" ("language");
CREATE INDEX IF NOT EXISTS "idx_user_settings_created_at" ON "user_settings" ("created_at");

-- ==================== PASSWORD_RESET_TOKENS ====================
CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "is_used" BOOLEAN DEFAULT false,
  "used_at" TIMESTAMPTZ,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_user_id" ON "password_reset_tokens" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_password_reset_tokens_token" ON "password_reset_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_expires_at" ON "password_reset_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_password_reset_tokens_is_used" ON "password_reset_tokens" ("is_used");

-- ==================== EMAIL_VERIFICATION_TOKENS ====================
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "email" VARCHAR(255) NOT NULL,
  "token" VARCHAR(255) NOT NULL UNIQUE,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "is_verified" BOOLEAN DEFAULT false,
  "verified_at" TIMESTAMPTZ,
  "attempts" INTEGER DEFAULT 0,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_user_id" ON "email_verification_tokens" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_email" ON "email_verification_tokens" ("email");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_verification_tokens_token" ON "email_verification_tokens" ("token");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_expires_at" ON "email_verification_tokens" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_email_verification_tokens_is_verified" ON "email_verification_tokens" ("is_verified");

-- ==================== TASK_DEPENDENCIES ====================
CREATE TABLE IF NOT EXISTS "task_dependencies" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "depends_on_task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "dependency_type" VARCHAR(255) DEFAULT 'blocks',
  "lag_days" INTEGER DEFAULT 0,
  "is_critical_path" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_dependencies_task_id_depends_on_task_id" ON "task_dependencies" ("task_id", "depends_on_task_id");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_task_id" ON "task_dependencies" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_depends_on_task_id" ON "task_dependencies" ("depends_on_task_id");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_dependency_type" ON "task_dependencies" ("dependency_type");
CREATE INDEX IF NOT EXISTS "idx_task_dependencies_is_critical_path" ON "task_dependencies" ("is_critical_path");

-- ==================== INTEGRATION_LOGS ====================
CREATE TABLE IF NOT EXISTS "integration_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "integration_type" VARCHAR(255) NOT NULL,
  "action" VARCHAR(255) NOT NULL,
  "direction" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "request_data" JSONB,
  "response_data" JSONB,
  "error_message" TEXT,
  "error_code" VARCHAR(255),
  "retry_count" INTEGER DEFAULT 0,
  "max_retries" INTEGER DEFAULT 3,
  "next_retry_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "triggered_by" VARCHAR(255),
  "entity_type" VARCHAR(255),
  "entity_id" UUID,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_integration_logs_workspace_id" ON "integration_logs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_integration_logs_integration_type" ON "integration_logs" ("integration_type");
CREATE INDEX IF NOT EXISTS "idx_integration_logs_status" ON "integration_logs" ("status");
CREATE INDEX IF NOT EXISTS "idx_integration_logs_action" ON "integration_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_integration_logs_created_at" ON "integration_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_integration_logs_entity_type_entity_id" ON "integration_logs" ("entity_type", "entity_id");

-- ==================== USER_ACTIVITY_LOGS ====================
CREATE TABLE IF NOT EXISTS "user_activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "session_id" VARCHAR(255),
  "action" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255) NOT NULL,
  "details" VARCHAR(255),
  "entity_type" VARCHAR(255),
  "entity_id" UUID,
  "previous_values" JSONB,
  "new_values" JSONB,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "referer" VARCHAR(255),
  "duration_ms" INTEGER,
  "device_info" JSONB,
  "location_info" JSONB,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_workspace_id" ON "user_activity_logs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_user_id" ON "user_activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_action" ON "user_activity_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_category" ON "user_activity_logs" ("category");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_entity_type_entity_id" ON "user_activity_logs" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_user_activity_logs_created_at" ON "user_activity_logs" ("created_at");

-- ==================== AI_GENERATIONS ====================
CREATE TABLE IF NOT EXISTS "ai_generations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "service_type" VARCHAR(255) NOT NULL,
  "prompt" TEXT NOT NULL,
  "response" TEXT,
  "parameters" JSONB DEFAULT '{}',
  "usage" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'completed',
  "error" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_ai_generations_user_id" ON "ai_generations" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_generations_service_type" ON "ai_generations" ("service_type");
CREATE INDEX IF NOT EXISTS "idx_ai_generations_status" ON "ai_generations" ("status");
CREATE INDEX IF NOT EXISTS "idx_ai_generations_created_at" ON "ai_generations" ("created_at");

-- ==================== AI_USAGE_STATS ====================
CREATE TABLE IF NOT EXISTS "ai_usage_stats" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL UNIQUE,
  "total_requests" INTEGER DEFAULT 0,
  "tokens_used" BIGINT DEFAULT 0,
  "images_generated" INTEGER DEFAULT 0,
  "characters_translated" BIGINT DEFAULT 0,
  "last_reset" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_ai_usage_stats_user_id" ON "ai_usage_stats" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ai_usage_stats_total_requests" ON "ai_usage_stats" ("total_requests");
CREATE INDEX IF NOT EXISTS "idx_ai_usage_stats_last_reset" ON "ai_usage_stats" ("last_reset");

-- ==================== CHAT_SESSIONS ====================
CREATE TABLE IF NOT EXISTS "chat_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) DEFAULT 'New Chat',
  "context" VARCHAR(255),
  "personality" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_chat_sessions_user_id" ON "chat_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_chat_sessions_created_at" ON "chat_sessions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_chat_sessions_updated_at" ON "chat_sessions" ("updated_at");

-- ==================== CHAT_MESSAGES ====================
CREATE TABLE IF NOT EXISTS "chat_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" UUID NOT NULL REFERENCES "chat_sessions"(id) ON DELETE CASCADE,
  "role" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "timestamp" TIMESTAMPTZ DEFAULT now(),
  "metadata" JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "idx_chat_messages_session_id" ON "chat_messages" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_timestamp" ON "chat_messages" ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_chat_messages_role" ON "chat_messages" ("role");

-- ==================== VIDEO_CALLS ====================
CREATE TABLE IF NOT EXISTS "video_calls" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "livekit_room_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "host_user_id" VARCHAR(255) NOT NULL,
  "call_type" VARCHAR(255) NOT NULL DEFAULT 'video',
  "is_group_call" BOOLEAN DEFAULT false,
  "status" VARCHAR(255) DEFAULT 'scheduled',
  "is_recording" BOOLEAN DEFAULT false,
  "scheduled_start_time" TIMESTAMPTZ,
  "scheduled_end_time" TIMESTAMPTZ,
  "actual_start_time" TIMESTAMPTZ,
  "actual_end_time" TIMESTAMPTZ,
  "invitees" JSONB DEFAULT '[]',
  "settings" JSONB DEFAULT '{}',
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_video_calls_workspace_id" ON "video_calls" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_host_user_id" ON "video_calls" ("host_user_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_status" ON "video_calls" ("status");
CREATE INDEX IF NOT EXISTS "idx_video_calls_call_type" ON "video_calls" ("call_type");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_calls_livekit_room_id" ON "video_calls" ("livekit_room_id");
CREATE INDEX IF NOT EXISTS "idx_video_calls_scheduled_start_time" ON "video_calls" ("scheduled_start_time");
CREATE INDEX IF NOT EXISTS "idx_video_calls_actual_start_time" ON "video_calls" ("actual_start_time");
CREATE INDEX IF NOT EXISTS "idx_video_calls_created_at" ON "video_calls" ("created_at");

-- ==================== VIDEO_CALL_JOIN_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "video_call_join_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "status" VARCHAR(255) DEFAULT 'pending',
  "requested_at" TIMESTAMPTZ DEFAULT now(),
  "responded_at" TIMESTAMPTZ,
  "responded_by" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_video_call_id" ON "video_call_join_requests" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_user_id" ON "video_call_join_requests" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_status" ON "video_call_join_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_video_call_join_requests_requested_at" ON "video_call_join_requests" ("requested_at");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_call_join_requests_video_call_id_user_id" ON "video_call_join_requests" ("video_call_id", "user_id");

-- ==================== VIDEO_CALL_PARTICIPANTS ====================
CREATE TABLE IF NOT EXISTS "video_call_participants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "livekit_participant_id" VARCHAR(255),
  "display_name" VARCHAR(255),
  "role" VARCHAR(255) DEFAULT 'participant',
  "status" VARCHAR(255) DEFAULT 'invited',
  "joined_at" TIMESTAMPTZ,
  "left_at" TIMESTAMPTZ,
  "duration_seconds" INTEGER DEFAULT 0,
  "is_audio_muted" BOOLEAN DEFAULT false,
  "is_video_muted" BOOLEAN DEFAULT false,
  "is_screen_sharing" BOOLEAN DEFAULT false,
  "is_hand_raised" BOOLEAN DEFAULT false,
  "connection_quality" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_video_call_participants_video_call_id" ON "video_call_participants" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_user_id" ON "video_call_participants" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_video_call_id_user_id" ON "video_call_participants" ("video_call_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_joined_at" ON "video_call_participants" ("joined_at");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_left_at" ON "video_call_participants" ("left_at");
CREATE INDEX IF NOT EXISTS "idx_video_call_participants_status" ON "video_call_participants" ("status");

-- ==================== VIDEO_CALL_RECORDINGS ====================
CREATE TABLE IF NOT EXISTS "video_call_recordings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "livekit_recording_id" VARCHAR(255) NOT NULL,
  "recording_url" TEXT,
  "transcript_url" TEXT,
  "duration_seconds" INTEGER DEFAULT 0,
  "file_size_bytes" BIGINT DEFAULT 0,
  "status" VARCHAR(255) DEFAULT 'recording',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_video_call_recordings_video_call_id" ON "video_call_recordings" ("video_call_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_call_recordings_livekit_recording_id" ON "video_call_recordings" ("livekit_recording_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_recordings_status" ON "video_call_recordings" ("status");
CREATE INDEX IF NOT EXISTS "idx_video_call_recordings_created_at" ON "video_call_recordings" ("created_at");

-- ==================== VIDEO_CALL_TRANSCRIPTS ====================
CREATE TABLE IF NOT EXISTS "video_call_transcripts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "full_text" TEXT NOT NULL,
  "segments" JSONB DEFAULT '[]',
  "language" VARCHAR(255) DEFAULT 'en',
  "duration_seconds" INTEGER DEFAULT 0,
  "word_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_video_call_transcripts_video_call_id" ON "video_call_transcripts" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_transcripts_workspace_id" ON "video_call_transcripts" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_video_call_transcripts_created_at" ON "video_call_transcripts" ("created_at");

-- ==================== MEETING_SUMMARIES ====================
CREATE TABLE IF NOT EXISTS "meeting_summaries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "video_call_id" UUID NOT NULL REFERENCES "video_calls"(id) ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "summary" TEXT NOT NULL,
  "key_points" JSONB DEFAULT '[]',
  "action_items" JSONB DEFAULT '[]',
  "decisions" JSONB DEFAULT '[]',
  "topics_discussed" JSONB DEFAULT '[]',
  "sentiment" VARCHAR(255),
  "participants" JSONB DEFAULT '[]',
  "generated_by" VARCHAR(255) DEFAULT 'ai',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_meeting_summaries_video_call_id" ON "meeting_summaries" ("video_call_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_summaries_workspace_id" ON "meeting_summaries" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_meeting_summaries_created_at" ON "meeting_summaries" ("created_at");

-- ==================== SEARCH_HISTORY ====================
CREATE TABLE IF NOT EXISTS "search_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "query" VARCHAR(255) NOT NULL,
  "result_count" INTEGER DEFAULT 0,
  "content_types" JSONB DEFAULT '[]',
  "filters" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_search_history_workspace_id_user_id" ON "search_history" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_search_history_user_id" ON "search_history" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_search_history_workspace_id" ON "search_history" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_search_history_created_at" ON "search_history" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_search_history_query" ON "search_history" ("query");

-- ==================== SAVED_SEARCHES ====================
CREATE TABLE IF NOT EXISTS "saved_searches" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "query" VARCHAR(255) NOT NULL,
  "type" VARCHAR(255) NOT NULL,
  "mode" VARCHAR(255) NOT NULL,
  "filters" JSONB DEFAULT '{}',
  "results_snapshot" JSONB DEFAULT '[]',
  "result_count" INTEGER DEFAULT 0,
  "tags" JSONB DEFAULT '[]',
  "is_notification_enabled" BOOLEAN DEFAULT false,
  "shared_with" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_saved_searches_workspace_id_user_id" ON "saved_searches" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_saved_searches_user_id" ON "saved_searches" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_saved_searches_workspace_id" ON "saved_searches" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_saved_searches_created_at" ON "saved_searches" ("created_at");

-- ==================== NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS "notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "type" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT,
  "data" JSONB DEFAULT '{}',
  "action_url" VARCHAR(255),
  "priority" VARCHAR(255) DEFAULT 'normal',
  "category" VARCHAR(255),
  "entity_type" VARCHAR(255),
  "entity_id" UUID,
  "actor_id" VARCHAR(255),
  "is_read" BOOLEAN DEFAULT false,
  "is_archived" BOOLEAN DEFAULT false,
  "read_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "scheduled_at" TIMESTAMPTZ,
  "is_scheduled" BOOLEAN DEFAULT false,
  "is_sent" BOOLEAN DEFAULT false,
  "sent_at" TIMESTAMPTZ,
  "schedule_status" VARCHAR(255) DEFAULT 'pending',
  "retry_count" INTEGER DEFAULT 0,
  "max_retries" INTEGER DEFAULT 3,
  "last_retry_at" TIMESTAMPTZ,
  "failure_reason" TEXT,
  "sent_via" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_workspace_id" ON "notifications" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_type" ON "notifications" ("type");
CREATE INDEX IF NOT EXISTS "idx_notifications_category" ON "notifications" ("category");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_read" ON "notifications" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_archived" ON "notifications" ("is_archived");
CREATE INDEX IF NOT EXISTS "idx_notifications_priority" ON "notifications" ("priority");
CREATE INDEX IF NOT EXISTS "idx_notifications_entity_type_entity_id" ON "notifications" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_is_read" ON "notifications" ("user_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_workspace_id_is_read" ON "notifications" ("user_id", "workspace_id", "is_read");
CREATE INDEX IF NOT EXISTS "idx_notifications_created_at" ON "notifications" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_expires_at" ON "notifications" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled_at" ON "notifications" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_scheduled_is_sent" ON "notifications" ("is_scheduled", "is_sent");
CREATE INDEX IF NOT EXISTS "idx_notifications_is_scheduled_schedule_status" ON "notifications" ("is_scheduled", "schedule_status");
CREATE INDEX IF NOT EXISTS "idx_notifications_scheduled_at_is_sent_schedule_status" ON "notifications" ("scheduled_at", "is_sent", "schedule_status");

-- ==================== NOTIFICATION_PREFERENCES ====================
CREATE TABLE IF NOT EXISTS "notification_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL UNIQUE,
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "global_enabled" BOOLEAN DEFAULT true,
  "in_app_enabled" BOOLEAN DEFAULT true,
  "email_enabled" BOOLEAN DEFAULT true,
  "push_enabled" BOOLEAN DEFAULT true,
  "sound_enabled" BOOLEAN DEFAULT true,
  "do_not_disturb" BOOLEAN DEFAULT false,
  "quiet_hours_start" TEXT,
  "quiet_hours_end" TEXT,
  "frequency" VARCHAR(255) DEFAULT 'immediate',
  "digest_time" TEXT,
  "categories" JSONB,
  "muted_workspaces" JSONB,
  "muted_projects" JSONB,
  "muted_channels" JSONB,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_notification_preferences_user_id" ON "notification_preferences" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_workspace_id" ON "notification_preferences" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_do_not_disturb" ON "notification_preferences" ("do_not_disturb");
CREATE INDEX IF NOT EXISTS "idx_notification_preferences_created_at" ON "notification_preferences" ("created_at");

-- ==================== PUSH_SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "endpoint" TEXT NOT NULL UNIQUE,
  "keys" JSONB,
  "device_type" VARCHAR(255),
  "browser" VARCHAR(255),
  "os" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_used_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_user_id" ON "push_subscriptions" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_push_subscriptions_endpoint" ON "push_subscriptions" ("endpoint");
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_is_active" ON "push_subscriptions" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_push_subscriptions_last_used_at" ON "push_subscriptions" ("last_used_at");

-- ==================== DEVICE_TOKENS ====================
CREATE TABLE IF NOT EXISTS "device_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "fcm_token" TEXT NOT NULL UNIQUE,
  "platform" VARCHAR(255) NOT NULL,
  "device_name" VARCHAR(255),
  "device_id" VARCHAR(255),
  "app_version" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_used_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_device_tokens_user_id" ON "device_tokens" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_device_tokens_fcm_token" ON "device_tokens" ("fcm_token");
CREATE INDEX IF NOT EXISTS "idx_device_tokens_platform" ON "device_tokens" ("platform");
CREATE INDEX IF NOT EXISTS "idx_device_tokens_is_active" ON "device_tokens" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_device_tokens_user_id_is_active" ON "device_tokens" ("user_id", "is_active");
CREATE INDEX IF NOT EXISTS "idx_device_tokens_last_used_at" ON "device_tokens" ("last_used_at");
CREATE INDEX IF NOT EXISTS "idx_device_tokens_created_at" ON "device_tokens" ("created_at");

-- ==================== GOOGLE_DRIVE_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "google_drive_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "google_email" VARCHAR(255),
  "google_name" VARCHAR(255),
  "google_picture" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_google_drive_connections_workspace_id" ON "google_drive_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_google_drive_connections_user_id" ON "google_drive_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_google_drive_connections_workspace_id_user_id" ON "google_drive_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_google_drive_connections_is_active" ON "google_drive_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_google_drive_connections_google_email" ON "google_drive_connections" ("google_email");

-- ==================== DROPBOX_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "dropbox_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "account_id" VARCHAR(255),
  "dropbox_email" VARCHAR(255),
  "dropbox_name" VARCHAR(255),
  "dropbox_picture" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_dropbox_connections_workspace_id" ON "dropbox_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_dropbox_connections_user_id" ON "dropbox_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_dropbox_connections_workspace_id_user_id" ON "dropbox_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_dropbox_connections_is_active" ON "dropbox_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_dropbox_connections_dropbox_email" ON "dropbox_connections" ("dropbox_email");
CREATE INDEX IF NOT EXISTS "idx_dropbox_connections_account_id" ON "dropbox_connections" ("account_id");

-- ==================== YOUTUBE_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "youtube_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "google_user_id" VARCHAR(255),
  "google_email" VARCHAR(255),
  "google_name" VARCHAR(255),
  "google_picture" TEXT,
  "channel_id" VARCHAR(255),
  "channel_title" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_youtube_connections_workspace_id" ON "youtube_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_connections_user_id" ON "youtube_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_youtube_connections_workspace_id_user_id" ON "youtube_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_youtube_connections_is_active" ON "youtube_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_youtube_connections_google_email" ON "youtube_connections" ("google_email");
CREATE INDEX IF NOT EXISTS "idx_youtube_connections_channel_id" ON "youtube_connections" ("channel_id");

-- ==================== SLACK_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "slack_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "team_id" VARCHAR(255),
  "team_name" VARCHAR(255),
  "slack_user_id" VARCHAR(255),
  "slack_email" VARCHAR(255),
  "slack_name" VARCHAR(255),
  "slack_picture" TEXT,
  "bot_user_id" VARCHAR(255),
  "bot_access_token" TEXT,
  "incoming_webhook_url" TEXT,
  "incoming_webhook_channel" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_connections_workspace_id" ON "slack_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_slack_connections_user_id" ON "slack_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_connections_workspace_id_user_id" ON "slack_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_slack_connections_is_active" ON "slack_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_slack_connections_team_id" ON "slack_connections" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_connections_slack_user_id" ON "slack_connections" ("slack_user_id");

-- ==================== TWITTER_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "twitter_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "twitter_user_id" VARCHAR(255),
  "twitter_username" VARCHAR(255),
  "twitter_name" VARCHAR(255),
  "twitter_picture" TEXT,
  "twitter_verified" BOOLEAN DEFAULT false,
  "followers_count" INTEGER DEFAULT 0,
  "following_count" INTEGER DEFAULT 0,
  "tweet_count" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_twitter_connections_workspace_id" ON "twitter_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_twitter_connections_user_id" ON "twitter_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_twitter_connections_workspace_id_user_id" ON "twitter_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_twitter_connections_is_active" ON "twitter_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_twitter_connections_twitter_user_id" ON "twitter_connections" ("twitter_user_id");
CREATE INDEX IF NOT EXISTS "idx_twitter_connections_twitter_username" ON "twitter_connections" ("twitter_username");

-- ==================== TELEGRAM_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "telegram_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "bot_token" TEXT NOT NULL,
  "bot_id" VARCHAR(255) NOT NULL,
  "bot_username" VARCHAR(255) NOT NULL,
  "bot_name" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_telegram_connections_workspace_id" ON "telegram_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_telegram_connections_user_id" ON "telegram_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_telegram_connections_workspace_id_user_id" ON "telegram_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_telegram_connections_is_active" ON "telegram_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_telegram_connections_bot_id" ON "telegram_connections" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_telegram_connections_bot_username" ON "telegram_connections" ("bot_username");

-- ==================== OPENAI_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "openai_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "api_key" TEXT NOT NULL,
  "organization_id" VARCHAR(255),
  "is_validated" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_openai_connections_workspace_id" ON "openai_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_openai_connections_user_id" ON "openai_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_openai_connections_workspace_id_user_id" ON "openai_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_openai_connections_is_active" ON "openai_connections" ("is_active");

-- ==================== SENDGRID_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "sendgrid_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "api_key" TEXT NOT NULL,
  "sender_email" VARCHAR(255) NOT NULL,
  "sender_name" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_sendgrid_connections_workspace_id" ON "sendgrid_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_sendgrid_connections_user_id" ON "sendgrid_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_sendgrid_connections_workspace_id_user_id" ON "sendgrid_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_sendgrid_connections_is_active" ON "sendgrid_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_sendgrid_connections_sender_email" ON "sendgrid_connections" ("sender_email");

-- ==================== EMAIL_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "email_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "provider" VARCHAR(255) NOT NULL DEFAULT 'gmail',
  "access_token" TEXT,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "smtp_host" VARCHAR(255),
  "smtp_port" INTEGER,
  "smtp_secure" BOOLEAN DEFAULT true,
  "smtp_user" VARCHAR(255),
  "smtp_password" TEXT,
  "imap_host" VARCHAR(255),
  "imap_port" INTEGER,
  "imap_secure" BOOLEAN DEFAULT true,
  "imap_user" VARCHAR(255),
  "imap_password" TEXT,
  "email_address" VARCHAR(255),
  "display_name" VARCHAR(255),
  "profile_picture" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "notifications_enabled" BOOLEAN DEFAULT true,
  "auto_create_events" BOOLEAN DEFAULT false,
  "last_synced_at" TIMESTAMPTZ,
  "last_history_id" VARCHAR(255),
  "last_uid" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_connections_workspace_id_user_id_email_address" ON "email_connections" ("workspace_id", "user_id", "email_address");
CREATE INDEX IF NOT EXISTS "idx_email_connections_workspace_id" ON "email_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_email_connections_user_id" ON "email_connections" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_connections_provider" ON "email_connections" ("provider");
CREATE INDEX IF NOT EXISTS "idx_email_connections_is_active" ON "email_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_email_connections_notifications_enabled" ON "email_connections" ("notifications_enabled");
CREATE INDEX IF NOT EXISTS "idx_email_connections_email_address" ON "email_connections" ("email_address");

-- ==================== EMAIL_PRIORITIES ====================
CREATE TABLE IF NOT EXISTS "email_priorities" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "connection_id" UUID NOT NULL REFERENCES "email_connections"(id) ON DELETE CASCADE,
  "email_id" VARCHAR(255) NOT NULL,
  "level" VARCHAR(255) NOT NULL,
  "score" INTEGER NOT NULL,
  "reason" TEXT,
  "factors" JSONB DEFAULT '[]',
  "analyzed_at" TIMESTAMPTZ DEFAULT now(),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_email_priorities_workspace_id_user_id_email_id" ON "email_priorities" ("workspace_id", "user_id", "email_id");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_workspace_id" ON "email_priorities" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_user_id" ON "email_priorities" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_connection_id" ON "email_priorities" ("connection_id");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_email_id" ON "email_priorities" ("email_id");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_level" ON "email_priorities" ("level");
CREATE INDEX IF NOT EXISTS "idx_email_priorities_analyzed_at" ON "email_priorities" ("analyzed_at");

-- ==================== GOOGLE_CALENDAR_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "google_calendar_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "google_email" VARCHAR(255),
  "google_name" VARCHAR(255),
  "google_picture" TEXT,
  "calendar_id" VARCHAR(255) DEFAULT 'primary',
  "selected_calendars" JSONB DEFAULT '[]',
  "available_calendars" JSONB DEFAULT '[]',
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "sync_token" TEXT,
  "calendar_sync_tokens" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_google_calendar_connections_workspace_id" ON "google_calendar_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_connections_user_id" ON "google_calendar_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_google_calendar_connections_workspace_id_user_id" ON "google_calendar_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_connections_is_active" ON "google_calendar_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_google_calendar_connections_google_email" ON "google_calendar_connections" ("google_email");

-- ==================== GITHUB_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "github_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "github_id" VARCHAR(255),
  "github_login" VARCHAR(255),
  "github_name" VARCHAR(255),
  "github_email" VARCHAR(255),
  "github_avatar" TEXT,
  "installation_id" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_github_connections_workspace_id" ON "github_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_github_connections_user_id" ON "github_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_github_connections_workspace_id_user_id" ON "github_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_github_connections_is_active" ON "github_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_github_connections_github_login" ON "github_connections" ("github_login");

-- ==================== GITHUB_ISSUE_LINKS ====================
CREATE TABLE IF NOT EXISTS "github_issue_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "github_connection_id" UUID NOT NULL REFERENCES "github_connections"(id) ON DELETE CASCADE,
  "issue_type" VARCHAR(255) NOT NULL,
  "issue_number" INTEGER NOT NULL,
  "issue_id" VARCHAR(255) NOT NULL,
  "repo_owner" VARCHAR(255) NOT NULL,
  "repo_name" VARCHAR(255) NOT NULL,
  "repo_full_name" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "state" VARCHAR(255) NOT NULL,
  "html_url" TEXT NOT NULL,
  "author_login" VARCHAR(255),
  "author_avatar" TEXT,
  "labels" JSONB DEFAULT '[]',
  "created_at_github" TIMESTAMPTZ,
  "updated_at_github" TIMESTAMPTZ,
  "closed_at_github" TIMESTAMPTZ,
  "merged_at_github" TIMESTAMPTZ,
  "auto_update_task_status" BOOLEAN DEFAULT false,
  "last_synced_at" TIMESTAMPTZ,
  "linked_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_github_issue_links_workspace_id" ON "github_issue_links" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_task_id" ON "github_issue_links" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_github_connection_id" ON "github_issue_links" ("github_connection_id");
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_repo_full_name_issue_number" ON "github_issue_links" ("repo_full_name", "issue_number");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_github_issue_links_task_id_repo_full_name_issue_number" ON "github_issue_links" ("task_id", "repo_full_name", "issue_number");
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_state" ON "github_issue_links" ("state");
CREATE INDEX IF NOT EXISTS "idx_github_issue_links_issue_type" ON "github_issue_links" ("issue_type");

-- ==================== GOOGLE_SHEETS_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "google_sheets_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "access_token" TEXT NOT NULL,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "google_email" VARCHAR(255),
  "google_name" VARCHAR(255),
  "google_picture" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "last_synced_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_google_sheets_connections_workspace_id" ON "google_sheets_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_connections_user_id" ON "google_sheets_connections" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_google_sheets_connections_workspace_id_user_id" ON "google_sheets_connections" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_connections_is_active" ON "google_sheets_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_connections_google_email" ON "google_sheets_connections" ("google_email");

-- ==================== GOOGLE_SHEETS_SYNCS ====================
CREATE TABLE IF NOT EXISTS "google_sheets_syncs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "connection_id" UUID NOT NULL REFERENCES "google_sheets_connections"(id) ON DELETE CASCADE,
  "spreadsheet_id" VARCHAR(255) NOT NULL,
  "spreadsheet_name" VARCHAR(255) NOT NULL,
  "sheet_name" VARCHAR(255) NOT NULL,
  "sync_type" VARCHAR(255) NOT NULL,
  "deskive_entity" VARCHAR(255) NOT NULL,
  "column_mapping" JSONB DEFAULT '{}',
  "sync_frequency" VARCHAR(255) DEFAULT 'manual',
  "last_sync_at" TIMESTAMPTZ,
  "last_sync_status" VARCHAR(255),
  "last_sync_error" TEXT,
  "last_row_count" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_workspace_id" ON "google_sheets_syncs" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_user_id" ON "google_sheets_syncs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_connection_id" ON "google_sheets_syncs" ("connection_id");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_spreadsheet_id" ON "google_sheets_syncs" ("spreadsheet_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_google_sheets_syncs_workspace_id_spreadsheet_id_sheet_name" ON "google_sheets_syncs" ("workspace_id", "spreadsheet_id", "sheet_name");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_sync_frequency" ON "google_sheets_syncs" ("sync_frequency");
CREATE INDEX IF NOT EXISTS "idx_google_sheets_syncs_is_active" ON "google_sheets_syncs" ("is_active");

-- ==================== REQUEST_TYPES ====================
CREATE TABLE IF NOT EXISTS "request_types" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(255) DEFAULT 'file-text',
  "color" VARCHAR(255) DEFAULT '#6366f1',
  "fields_config" JSONB DEFAULT '[]',
  "default_approvers" JSONB DEFAULT '[]',
  "require_all_approvers" BOOLEAN DEFAULT false,
  "allow_attachments" BOOLEAN DEFAULT true,
  "is_active" BOOLEAN DEFAULT true,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_request_types_workspace_id" ON "request_types" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_request_types_is_active" ON "request_types" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_request_types_created_by" ON "request_types" ("created_by");

-- ==================== APPROVAL_REQUESTS ====================
CREATE TABLE IF NOT EXISTS "approval_requests" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "request_type_id" UUID NOT NULL REFERENCES "request_types"(id) ON DELETE CASCADE,
  "requester_id" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "data" JSONB DEFAULT '{}',
  "attachments" JSONB DEFAULT '[]',
  "status" VARCHAR(255) DEFAULT 'pending',
  "priority" VARCHAR(255) DEFAULT 'normal',
  "due_date" TIMESTAMPTZ,
  "approved_by" VARCHAR(255),
  "approved_at" TIMESTAMPTZ,
  "rejected_by" VARCHAR(255),
  "rejected_at" TIMESTAMPTZ,
  "rejection_reason" TEXT,
  "cancelled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_approval_requests_workspace_id" ON "approval_requests" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_request_type_id" ON "approval_requests" ("request_type_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_requester_id" ON "approval_requests" ("requester_id");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_status" ON "approval_requests" ("status");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_priority" ON "approval_requests" ("priority");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_created_at" ON "approval_requests" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_approval_requests_workspace_id_status" ON "approval_requests" ("workspace_id", "status");

-- ==================== APPROVAL_REQUEST_APPROVERS ====================
CREATE TABLE IF NOT EXISTS "approval_request_approvers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL REFERENCES "approval_requests"(id) ON DELETE CASCADE,
  "approver_id" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "comments" TEXT,
  "responded_at" TIMESTAMPTZ,
  "sort_order" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_approval_request_approvers_request_id" ON "approval_request_approvers" ("request_id");
CREATE INDEX IF NOT EXISTS "idx_approval_request_approvers_approver_id" ON "approval_request_approvers" ("approver_id");
CREATE INDEX IF NOT EXISTS "idx_approval_request_approvers_status" ON "approval_request_approvers" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_approval_request_approvers_request_id_approver_id" ON "approval_request_approvers" ("request_id", "approver_id");

-- ==================== APPROVAL_REQUEST_COMMENTS ====================
CREATE TABLE IF NOT EXISTS "approval_request_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "request_id" UUID NOT NULL REFERENCES "approval_requests"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "is_internal" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_approval_request_comments_request_id" ON "approval_request_comments" ("request_id");
CREATE INDEX IF NOT EXISTS "idx_approval_request_comments_user_id" ON "approval_request_comments" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_approval_request_comments_created_at" ON "approval_request_comments" ("created_at");

-- ==================== AUTOPILOT_SESSIONS ====================
CREATE TABLE IF NOT EXISTS "autopilot_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "session_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "messages" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_autopilot_sessions_session_id" ON "autopilot_sessions" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_sessions_workspace_id_user_id" ON "autopilot_sessions" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_sessions_workspace_id" ON "autopilot_sessions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_sessions_user_id" ON "autopilot_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_sessions_updated_at" ON "autopilot_sessions" ("updated_at");

-- ==================== WHITEBOARDS ====================
CREATE TABLE IF NOT EXISTS "whiteboards" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "elements" JSONB DEFAULT '[]',
  "app_state" JSONB DEFAULT '{}',
  "files" JSONB DEFAULT '{}',
  "thumbnail_url" VARCHAR(255),
  "is_public" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_whiteboards_workspace_id" ON "whiteboards" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_whiteboards_created_by" ON "whiteboards" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_whiteboards_is_public" ON "whiteboards" ("is_public");
CREATE INDEX IF NOT EXISTS "idx_whiteboards_created_at" ON "whiteboards" ("created_at");

-- ==================== WHITEBOARD_COLLABORATORS ====================
CREATE TABLE IF NOT EXISTS "whiteboard_collaborators" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whiteboard_id" UUID NOT NULL REFERENCES "whiteboards"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "permission" VARCHAR(255) DEFAULT 'edit',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_whiteboard_collaborators_whiteboard_id" ON "whiteboard_collaborators" ("whiteboard_id");
CREATE INDEX IF NOT EXISTS "idx_whiteboard_collaborators_user_id" ON "whiteboard_collaborators" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_whiteboard_collaborators_whiteboard_id_user_id" ON "whiteboard_collaborators" ("whiteboard_id", "user_id");

-- ==================== BOTS ====================
CREATE TABLE IF NOT EXISTS "bots" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "display_name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "avatar_url" VARCHAR(255),
  "status" VARCHAR(255) DEFAULT 'draft',
  "bot_type" VARCHAR(255) DEFAULT 'custom',
  "settings" JSONB DEFAULT '{}',
  "permissions" JSONB DEFAULT '[]',
  "webhook_secret" VARCHAR(255),
  "is_public" BOOLEAN DEFAULT false,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bots_workspace_id" ON "bots" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bots_workspace_id_name" ON "bots" ("workspace_id", "name");
CREATE INDEX IF NOT EXISTS "idx_bots_status" ON "bots" ("status");
CREATE INDEX IF NOT EXISTS "idx_bots_bot_type" ON "bots" ("bot_type");
CREATE INDEX IF NOT EXISTS "idx_bots_created_by" ON "bots" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_bots_is_public" ON "bots" ("is_public");

-- ==================== BOT_TRIGGERS ====================
CREATE TABLE IF NOT EXISTS "bot_triggers" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "trigger_type" VARCHAR(255) NOT NULL,
  "trigger_config" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT true,
  "priority" INTEGER DEFAULT 0,
  "cooldown_seconds" INTEGER DEFAULT 0,
  "conditions" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bot_triggers_bot_id" ON "bot_triggers" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_bot_triggers_trigger_type" ON "bot_triggers" ("trigger_type");
CREATE INDEX IF NOT EXISTS "idx_bot_triggers_is_active" ON "bot_triggers" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_bot_triggers_priority" ON "bot_triggers" ("priority");

-- ==================== BOT_ACTIONS ====================
CREATE TABLE IF NOT EXISTS "bot_actions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "trigger_id" UUID REFERENCES "bot_triggers"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "action_type" VARCHAR(255) NOT NULL,
  "action_config" JSONB DEFAULT '{}',
  "execution_order" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT true,
  "failure_policy" VARCHAR(255) DEFAULT 'continue',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bot_actions_bot_id" ON "bot_actions" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_bot_actions_trigger_id" ON "bot_actions" ("trigger_id");
CREATE INDEX IF NOT EXISTS "idx_bot_actions_action_type" ON "bot_actions" ("action_type");
CREATE INDEX IF NOT EXISTS "idx_bot_actions_execution_order" ON "bot_actions" ("execution_order");
CREATE INDEX IF NOT EXISTS "idx_bot_actions_is_active" ON "bot_actions" ("is_active");

-- ==================== BOT_INSTALLATIONS ====================
CREATE TABLE IF NOT EXISTS "bot_installations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "channel_id" UUID REFERENCES "channels"(id) ON DELETE CASCADE,
  "conversation_id" UUID REFERENCES "conversations"(id) ON DELETE CASCADE,
  "installed_by" VARCHAR(255) NOT NULL,
  "is_active" BOOLEAN DEFAULT true,
  "settings_override" JSONB DEFAULT '{}',
  "installed_at" TIMESTAMPTZ DEFAULT now(),
  "uninstalled_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_bot_installations_bot_id" ON "bot_installations" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_bot_installations_channel_id" ON "bot_installations" ("channel_id");
CREATE INDEX IF NOT EXISTS "idx_bot_installations_conversation_id" ON "bot_installations" ("conversation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bot_installations_bot_id_channel_id" ON "bot_installations" ("bot_id", "channel_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bot_installations_bot_id_conversation_id" ON "bot_installations" ("bot_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "idx_bot_installations_is_active" ON "bot_installations" ("is_active");

-- ==================== BOT_EXECUTION_LOGS ====================
CREATE TABLE IF NOT EXISTS "bot_execution_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "bot_id" UUID NOT NULL REFERENCES "bots"(id) ON DELETE CASCADE,
  "trigger_id" UUID REFERENCES "bot_triggers"(id) ON DELETE CASCADE,
  "action_id" UUID REFERENCES "bot_actions"(id) ON DELETE CASCADE,
  "installation_id" UUID REFERENCES "bot_installations"(id) ON DELETE CASCADE,
  "channel_id" UUID,
  "conversation_id" UUID,
  "message_id" UUID,
  "triggered_by_user" VARCHAR(255),
  "trigger_type" VARCHAR(255),
  "trigger_data" JSONB DEFAULT '{}',
  "action_type" VARCHAR(255),
  "action_input" JSONB DEFAULT '{}',
  "action_output" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'pending',
  "error_message" TEXT,
  "execution_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_bot_id" ON "bot_execution_logs" ("bot_id");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_trigger_id" ON "bot_execution_logs" ("trigger_id");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_action_id" ON "bot_execution_logs" ("action_id");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_installation_id" ON "bot_execution_logs" ("installation_id");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_status" ON "bot_execution_logs" ("status");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_created_at" ON "bot_execution_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_bot_execution_logs_triggered_by_user" ON "bot_execution_logs" ("triggered_by_user");

-- ==================== BOT_USER_COOLDOWNS ====================
CREATE TABLE IF NOT EXISTS "bot_user_cooldowns" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trigger_id" UUID NOT NULL REFERENCES "bot_triggers"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "channel_id" UUID,
  "conversation_id" UUID,
  "last_triggered_at" TIMESTAMPTZ DEFAULT now(),
  "cooldown_until" TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_bot_user_cooldowns_trigger_id_user_id_channel_id" ON "bot_user_cooldowns" ("trigger_id", "user_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_bot_user_cooldowns_trigger_id_user_id_conversation_id" ON "bot_user_cooldowns" ("trigger_id", "user_id", "conversation_id");
CREATE INDEX IF NOT EXISTS "idx_bot_user_cooldowns_cooldown_until" ON "bot_user_cooldowns" ("cooldown_until");

-- ==================== BOT_SCHEDULED_JOBS ====================
CREATE TABLE IF NOT EXISTS "bot_scheduled_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "trigger_id" UUID NOT NULL REFERENCES "bot_triggers"(id) ON DELETE CASCADE,
  "installation_id" UUID NOT NULL REFERENCES "bot_installations"(id) ON DELETE CASCADE,
  "next_run_at" TIMESTAMPTZ NOT NULL,
  "last_run_at" TIMESTAMPTZ,
  "last_status" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_bot_scheduled_jobs_trigger_id" ON "bot_scheduled_jobs" ("trigger_id");
CREATE INDEX IF NOT EXISTS "idx_bot_scheduled_jobs_installation_id" ON "bot_scheduled_jobs" ("installation_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_bot_scheduled_jobs_trigger_id_installation_id" ON "bot_scheduled_jobs" ("trigger_id", "installation_id");
CREATE INDEX IF NOT EXISTS "idx_bot_scheduled_jobs_next_run_at" ON "bot_scheduled_jobs" ("next_run_at");
CREATE INDEX IF NOT EXISTS "idx_bot_scheduled_jobs_is_active" ON "bot_scheduled_jobs" ("is_active");

-- ==================== INTEGRATION_CATALOG ====================
CREATE TABLE IF NOT EXISTS "integration_catalog" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(255) NOT NULL,
  "provider" VARCHAR(255),
  "logo_url" TEXT,
  "website" TEXT,
  "documentation_url" TEXT,
  "version" VARCHAR(255) DEFAULT '1.0.0',
  "auth_type" VARCHAR(255) NOT NULL,
  "auth_config" JSONB DEFAULT '{}',
  "api_base_url" TEXT,
  "api_config" JSONB DEFAULT '{}',
  "supports_webhooks" BOOLEAN DEFAULT false,
  "webhook_config" JSONB DEFAULT '{}',
  "capabilities" JSONB DEFAULT '[]',
  "required_permissions" JSONB DEFAULT '[]',
  "features" JSONB DEFAULT '[]',
  "config_schema" JSONB DEFAULT '{}',
  "screenshots" JSONB DEFAULT '[]',
  "pricing_type" VARCHAR(255) DEFAULT 'free',
  "pricing_details" JSONB DEFAULT '{}',
  "is_verified" BOOLEAN DEFAULT false,
  "is_featured" BOOLEAN DEFAULT false,
  "is_active" BOOLEAN DEFAULT true,
  "install_count" INTEGER DEFAULT 0,
  "rating" TEXT,
  "review_count" INTEGER DEFAULT 0,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_catalog_slug" ON "integration_catalog" ("slug");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_category" ON "integration_catalog" ("category");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_auth_type" ON "integration_catalog" ("auth_type");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_provider" ON "integration_catalog" ("provider");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_active" ON "integration_catalog" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_featured" ON "integration_catalog" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_is_verified" ON "integration_catalog" ("is_verified");
CREATE INDEX IF NOT EXISTS "idx_integration_catalog_install_count" ON "integration_catalog" ("install_count");

-- ==================== INTEGRATION_CONNECTIONS ====================
CREATE TABLE IF NOT EXISTS "integration_connections" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "integration_id" UUID NOT NULL REFERENCES "integration_catalog"(id) ON DELETE CASCADE,
  "auth_type" VARCHAR(255) NOT NULL,
  "access_token" TEXT,
  "refresh_token" TEXT,
  "token_type" VARCHAR(255) DEFAULT 'Bearer',
  "scope" TEXT,
  "expires_at" TIMESTAMPTZ,
  "api_key" TEXT,
  "credentials" JSONB DEFAULT '{}',
  "external_id" VARCHAR(255),
  "external_email" VARCHAR(255),
  "external_name" VARCHAR(255),
  "external_avatar" TEXT,
  "external_metadata" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'active',
  "error_message" TEXT,
  "last_error_at" TIMESTAMPTZ,
  "config" JSONB DEFAULT '{}',
  "settings" JSONB DEFAULT '{}',
  "last_synced_at" TIMESTAMPTZ,
  "sync_cursor" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_integration_connections_workspace_id" ON "integration_connections" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_user_id" ON "integration_connections" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_integration_id" ON "integration_connections" ("integration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_integration_connections_workspace_id_user_id_integration_id" ON "integration_connections" ("workspace_id", "user_id", "integration_id");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_status" ON "integration_connections" ("status");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_is_active" ON "integration_connections" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_external_email" ON "integration_connections" ("external_email");
CREATE INDEX IF NOT EXISTS "idx_integration_connections_expires_at" ON "integration_connections" ("expires_at");

-- ==================== INTEGRATION_WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS "integration_webhooks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "connection_id" UUID NOT NULL REFERENCES "integration_connections"(id) ON DELETE CASCADE,
  "integration_id" UUID NOT NULL REFERENCES "integration_catalog"(id) ON DELETE CASCADE,
  "webhook_id" VARCHAR(255),
  "webhook_url" TEXT NOT NULL,
  "secret" TEXT,
  "events" JSONB DEFAULT '[]',
  "is_active" BOOLEAN DEFAULT true,
  "last_received_at" TIMESTAMPTZ,
  "failure_count" INTEGER DEFAULT 0,
  "last_failure_at" TIMESTAMPTZ,
  "last_failure_reason" TEXT,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_integration_webhooks_workspace_id" ON "integration_webhooks" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_integration_webhooks_connection_id" ON "integration_webhooks" ("connection_id");
CREATE INDEX IF NOT EXISTS "idx_integration_webhooks_integration_id" ON "integration_webhooks" ("integration_id");
CREATE INDEX IF NOT EXISTS "idx_integration_webhooks_webhook_id" ON "integration_webhooks" ("webhook_id");
CREATE INDEX IF NOT EXISTS "idx_integration_webhooks_is_active" ON "integration_webhooks" ("is_active");

-- ==================== INTEGRATION_SYNC_HISTORY ====================
CREATE TABLE IF NOT EXISTS "integration_sync_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "connection_id" UUID NOT NULL REFERENCES "integration_connections"(id) ON DELETE CASCADE,
  "sync_type" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) NOT NULL,
  "started_at" TIMESTAMPTZ DEFAULT now(),
  "completed_at" TIMESTAMPTZ,
  "items_processed" INTEGER DEFAULT 0,
  "items_created" INTEGER DEFAULT 0,
  "items_updated" INTEGER DEFAULT 0,
  "items_deleted" INTEGER DEFAULT 0,
  "error_message" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_integration_sync_history_connection_id" ON "integration_sync_history" ("connection_id");
CREATE INDEX IF NOT EXISTS "idx_integration_sync_history_status" ON "integration_sync_history" ("status");
CREATE INDEX IF NOT EXISTS "idx_integration_sync_history_sync_type" ON "integration_sync_history" ("sync_type");
CREATE INDEX IF NOT EXISTS "idx_integration_sync_history_started_at" ON "integration_sync_history" ("started_at");

-- ==================== PROJECT_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS "project_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(255) NOT NULL,
  "icon" VARCHAR(255),
  "color" VARCHAR(255),
  "structure" JSONB NOT NULL,
  "project_type" VARCHAR(255) DEFAULT 'kanban',
  "kanban_stages" JSONB,
  "custom_fields" JSONB DEFAULT '[]',
  "settings" JSONB DEFAULT '{}',
  "is_system" BOOLEAN DEFAULT false,
  "is_featured" BOOLEAN DEFAULT false,
  "usage_count" INTEGER DEFAULT 0,
  "created_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_project_templates_workspace_id" ON "project_templates" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_project_templates_category" ON "project_templates" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_project_templates_slug" ON "project_templates" ("slug");
CREATE INDEX IF NOT EXISTS "idx_project_templates_is_system" ON "project_templates" ("is_system");
CREATE INDEX IF NOT EXISTS "idx_project_templates_is_featured" ON "project_templates" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_project_templates_usage_count" ON "project_templates" ("usage_count");
CREATE INDEX IF NOT EXISTS "idx_project_templates_created_at" ON "project_templates" ("created_at");

-- ==================== AGENT_MEMORY ====================
CREATE TABLE IF NOT EXISTS "agent_memory" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "agent_id" VARCHAR(255),
  "memory_type" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "summary" TEXT,
  "context_type" VARCHAR(255),
  "context_id" UUID,
  "importance" INTEGER DEFAULT 5,
  "tags" JSONB DEFAULT '[]',
  "metadata" JSONB DEFAULT '{}',
  "embedding_id" VARCHAR(255),
  "expires_at" TIMESTAMPTZ,
  "access_count" INTEGER DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_agent_memory_workspace_id_user_id" ON "agent_memory" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_workspace_id_agent_id" ON "agent_memory" ("workspace_id", "agent_id");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_workspace_id_memory_type" ON "agent_memory" ("workspace_id", "memory_type");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_context_type_context_id" ON "agent_memory" ("context_type", "context_id");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_importance" ON "agent_memory" ("importance");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_expires_at" ON "agent_memory" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_is_active" ON "agent_memory" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_created_at" ON "agent_memory" ("created_at");

-- ==================== AGENT_MEMORY_PREFERENCES ====================
CREATE TABLE IF NOT EXISTS "agent_memory_preferences" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "preference_key" VARCHAR(255) NOT NULL,
  "preference_value" JSONB NOT NULL,
  "confidence" TEXT DEFAULT 0.5,
  "learned_from" JSONB DEFAULT '[]',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_agent_memory_preferences_workspace_id_user_id_preference_key" ON "agent_memory_preferences" ("workspace_id", "user_id", "preference_key");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_preferences_workspace_id_user_id" ON "agent_memory_preferences" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_agent_memory_preferences_confidence" ON "agent_memory_preferences" ("confidence");

-- ==================== DOCUMENT_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS "document_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "document_type" VARCHAR(255) NOT NULL,
  "category" VARCHAR(255),
  "icon" VARCHAR(255),
  "color" VARCHAR(255),
  "content" JSONB NOT NULL,
  "content_html" TEXT,
  "placeholders" JSONB DEFAULT '[]',
  "signature_fields" JSONB DEFAULT '[]',
  "settings" JSONB DEFAULT '{}',
  "is_system" BOOLEAN DEFAULT false,
  "is_featured" BOOLEAN DEFAULT false,
  "usage_count" INTEGER DEFAULT 0,
  "created_by" VARCHAR(255),
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_document_templates_workspace_id" ON "document_templates" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_document_templates_document_type" ON "document_templates" ("document_type");
CREATE INDEX IF NOT EXISTS "idx_document_templates_category" ON "document_templates" ("category");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_templates_slug" ON "document_templates" ("slug");
CREATE INDEX IF NOT EXISTS "idx_document_templates_is_system" ON "document_templates" ("is_system");
CREATE INDEX IF NOT EXISTS "idx_document_templates_is_featured" ON "document_templates" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_document_templates_is_deleted" ON "document_templates" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_document_templates_usage_count" ON "document_templates" ("usage_count");
CREATE INDEX IF NOT EXISTS "idx_document_templates_created_by" ON "document_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_document_templates_created_at" ON "document_templates" ("created_at");

-- ==================== DOCUMENTS ====================
CREATE TABLE IF NOT EXISTS "documents" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "template_id" UUID REFERENCES "document_templates"(id) ON DELETE CASCADE,
  "document_number" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "document_type" VARCHAR(255) NOT NULL,
  "content" JSONB NOT NULL,
  "content_html" TEXT,
  "content_text" TEXT,
  "placeholder_values" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'draft',
  "version" INTEGER DEFAULT 1,
  "previous_version_id" UUID REFERENCES "documents"(id) ON DELETE CASCADE,
  "settings" JSONB DEFAULT '{}',
  "expires_at" TIMESTAMPTZ,
  "signed_at" TIMESTAMPTZ,
  "archived_at" TIMESTAMPTZ,
  "archived_by" VARCHAR(255),
  "view_count" INTEGER DEFAULT 0,
  "last_viewed_at" TIMESTAMPTZ,
  "created_by" VARCHAR(255) NOT NULL,
  "updated_by" VARCHAR(255),
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_documents_workspace_id" ON "documents" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_documents_template_id" ON "documents" ("template_id");
CREATE INDEX IF NOT EXISTS "idx_documents_document_type" ON "documents" ("document_type");
CREATE INDEX IF NOT EXISTS "idx_documents_status" ON "documents" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_documents_document_number" ON "documents" ("document_number");
CREATE INDEX IF NOT EXISTS "idx_documents_created_by" ON "documents" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_documents_expires_at" ON "documents" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_documents_is_deleted" ON "documents" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_documents_workspace_id_status" ON "documents" ("workspace_id", "status");
CREATE INDEX IF NOT EXISTS "idx_documents_workspace_id_document_type" ON "documents" ("workspace_id", "document_type");
CREATE INDEX IF NOT EXISTS "idx_documents_created_at" ON "documents" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_documents_updated_at" ON "documents" ("updated_at");

-- ==================== DOCUMENT_RECIPIENTS ====================
CREATE TABLE IF NOT EXISTS "document_recipients" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "documents"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "email" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "role" VARCHAR(255) DEFAULT 'signer',
  "signing_order" INTEGER DEFAULT 0,
  "status" VARCHAR(255) DEFAULT 'pending',
  "access_token" VARCHAR(255) NOT NULL UNIQUE,
  "access_code" VARCHAR(255),
  "message" TEXT,
  "viewed_at" TIMESTAMPTZ,
  "signed_at" TIMESTAMPTZ,
  "declined_at" TIMESTAMPTZ,
  "decline_reason" TEXT,
  "reminder_sent_at" TIMESTAMPTZ,
  "reminder_count" INTEGER DEFAULT 0,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_document_recipients_document_id" ON "document_recipients" ("document_id");
CREATE INDEX IF NOT EXISTS "idx_document_recipients_user_id" ON "document_recipients" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_document_recipients_email" ON "document_recipients" ("email");
CREATE INDEX IF NOT EXISTS "idx_document_recipients_status" ON "document_recipients" ("status");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_recipients_access_token" ON "document_recipients" ("access_token");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_recipients_document_id_email" ON "document_recipients" ("document_id", "email");
CREATE INDEX IF NOT EXISTS "idx_document_recipients_signing_order" ON "document_recipients" ("signing_order");
CREATE INDEX IF NOT EXISTS "idx_document_recipients_created_at" ON "document_recipients" ("created_at");

-- ==================== DOCUMENT_SIGNATURES ====================
CREATE TABLE IF NOT EXISTS "document_signatures" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "documents"(id) ON DELETE CASCADE,
  "recipient_id" UUID NOT NULL REFERENCES "document_recipients"(id) ON DELETE CASCADE,
  "signature_field_id" VARCHAR(255) NOT NULL,
  "signature_type" VARCHAR(255) NOT NULL,
  "signature_data" TEXT NOT NULL,
  "typed_name" VARCHAR(255),
  "font_family" VARCHAR(255),
  "position_x" TEXT,
  "position_y" TEXT,
  "width" TEXT,
  "height" TEXT,
  "page_number" INTEGER DEFAULT 1,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "device_info" JSONB DEFAULT '{}',
  "signed_at" TIMESTAMPTZ DEFAULT now(),
  "certificate_hash" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_document_signatures_document_id" ON "document_signatures" ("document_id");
CREATE INDEX IF NOT EXISTS "idx_document_signatures_recipient_id" ON "document_signatures" ("recipient_id");
CREATE INDEX IF NOT EXISTS "idx_document_signatures_signature_field_id" ON "document_signatures" ("signature_field_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_document_signatures_document_id_recipient_id_signature_field_id" ON "document_signatures" ("document_id", "recipient_id", "signature_field_id");
CREATE INDEX IF NOT EXISTS "idx_document_signatures_signed_at" ON "document_signatures" ("signed_at");
CREATE INDEX IF NOT EXISTS "idx_document_signatures_created_at" ON "document_signatures" ("created_at");

-- ==================== DOCUMENT_ACTIVITY_LOGS ====================
CREATE TABLE IF NOT EXISTS "document_activity_logs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "document_id" UUID NOT NULL REFERENCES "documents"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "recipient_id" UUID REFERENCES "document_recipients"(id) ON DELETE CASCADE,
  "action" VARCHAR(255) NOT NULL,
  "details" TEXT,
  "old_values" JSONB,
  "new_values" JSONB,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_document_id" ON "document_activity_logs" ("document_id");
CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_user_id" ON "document_activity_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_recipient_id" ON "document_activity_logs" ("recipient_id");
CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_action" ON "document_activity_logs" ("action");
CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_created_at" ON "document_activity_logs" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_document_activity_logs_document_id_action" ON "document_activity_logs" ("document_id", "action");

-- ==================== USER_SIGNATURES ====================
CREATE TABLE IF NOT EXISTS "user_signatures" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "signature_type" VARCHAR(255) NOT NULL,
  "signature_data" TEXT NOT NULL,
  "typed_name" VARCHAR(255),
  "font_family" VARCHAR(255),
  "is_default" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_signatures_workspace_id" ON "user_signatures" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_user_signatures_user_id" ON "user_signatures" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_user_signatures_workspace_id_user_id" ON "user_signatures" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_user_signatures_is_default" ON "user_signatures" ("is_default");
CREATE INDEX IF NOT EXISTS "idx_user_signatures_is_deleted" ON "user_signatures" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_user_signatures_created_at" ON "user_signatures" ("created_at");

-- ==================== BUDGETS ====================
CREATE TABLE IF NOT EXISTS "budgets" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "project_id" UUID REFERENCES "projects"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "budget_type" VARCHAR(255) NOT NULL DEFAULT 'project',
  "total_budget" TEXT NOT NULL DEFAULT 0,
  "currency" VARCHAR(255) NOT NULL DEFAULT 'USD',
  "start_date" DATE,
  "end_date" DATE,
  "alert_threshold" TEXT NOT NULL DEFAULT 80,
  "status" VARCHAR(255) NOT NULL DEFAULT 'active',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_budgets_workspace_id" ON "budgets" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_budgets_project_id" ON "budgets" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_budgets_created_by" ON "budgets" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_budgets_status" ON "budgets" ("status");
CREATE INDEX IF NOT EXISTS "idx_budgets_is_deleted" ON "budgets" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_budgets_workspace_id_project_id" ON "budgets" ("workspace_id", "project_id");
CREATE INDEX IF NOT EXISTS "idx_budgets_start_date" ON "budgets" ("start_date");
CREATE INDEX IF NOT EXISTS "idx_budgets_end_date" ON "budgets" ("end_date");

-- ==================== BUDGET_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS "budget_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL REFERENCES "budgets"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "allocated_amount" TEXT NOT NULL DEFAULT 0,
  "category_type" VARCHAR(255) NOT NULL DEFAULT 'other',
  "cost_nature" VARCHAR(255) NOT NULL DEFAULT 'variable',
  "color" VARCHAR(255),
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_budget_categories_budget_id" ON "budget_categories" ("budget_id");
CREATE INDEX IF NOT EXISTS "idx_budget_categories_category_type" ON "budget_categories" ("category_type");
CREATE INDEX IF NOT EXISTS "idx_budget_categories_cost_nature" ON "budget_categories" ("cost_nature");
CREATE INDEX IF NOT EXISTS "idx_budget_categories_is_deleted" ON "budget_categories" ("is_deleted");

-- ==================== BUDGET_EXPENSES ====================
CREATE TABLE IF NOT EXISTS "budget_expenses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL REFERENCES "budgets"(id) ON DELETE CASCADE,
  "category_id" UUID REFERENCES "budget_categories"(id) ON DELETE CASCADE,
  "task_id" UUID REFERENCES "tasks"(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "amount" TEXT NOT NULL,
  "currency" VARCHAR(255) NOT NULL DEFAULT 'USD',
  "quantity" TEXT DEFAULT '1',
  "unit_price" TEXT,
  "unit_of_measure" VARCHAR(255),
  "expense_type" VARCHAR(255) NOT NULL DEFAULT 'manual',
  "expense_date" DATE NOT NULL,
  "billable" BOOLEAN NOT NULL DEFAULT true,
  "approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" VARCHAR(255),
  "approved_at" TIMESTAMPTZ,
  "rejected" BOOLEAN NOT NULL DEFAULT false,
  "rejection_reason" TEXT,
  "rejected_at" TIMESTAMPTZ,
  "approval_request_id" UUID,
  "receipt_url" VARCHAR(255),
  "receipt_file_name" VARCHAR(255),
  "vendor" VARCHAR(255),
  "invoice_number" VARCHAR(255),
  "notes" TEXT,
  "metadata" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_budget_expenses_budget_id" ON "budget_expenses" ("budget_id");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_category_id" ON "budget_expenses" ("category_id");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_task_id" ON "budget_expenses" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_created_by" ON "budget_expenses" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_expense_date" ON "budget_expenses" ("expense_date");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_expense_type" ON "budget_expenses" ("expense_type");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_billable" ON "budget_expenses" ("billable");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_approved" ON "budget_expenses" ("approved");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_is_deleted" ON "budget_expenses" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_budget_expenses_budget_id_expense_date" ON "budget_expenses" ("budget_id", "expense_date");

-- ==================== BILLING_RATES ====================
CREATE TABLE IF NOT EXISTS "billing_rates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "role" VARCHAR(255),
  "rate_name" VARCHAR(255),
  "hourly_rate" TEXT NOT NULL,
  "currency" VARCHAR(255) NOT NULL DEFAULT 'USD',
  "effective_from" DATE NOT NULL,
  "effective_to" DATE,
  "is_active" BOOLEAN DEFAULT true,
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_billing_rates_workspace_id" ON "billing_rates" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_user_id" ON "billing_rates" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_role" ON "billing_rates" ("role");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_is_active" ON "billing_rates" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_is_deleted" ON "billing_rates" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_workspace_id_user_id" ON "billing_rates" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_effective_from" ON "billing_rates" ("effective_from");
CREATE INDEX IF NOT EXISTS "idx_billing_rates_effective_to" ON "billing_rates" ("effective_to");

-- ==================== TIME_ENTRIES ====================
CREATE TABLE IF NOT EXISTS "time_entries" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "start_time" TIMESTAMPTZ NOT NULL,
  "end_time" TIMESTAMPTZ,
  "duration_seconds" INTEGER NOT NULL DEFAULT 0,
  "billable" BOOLEAN NOT NULL DEFAULT true,
  "billing_rate" TEXT,
  "billing_rate_id" UUID REFERENCES "billing_rates"(id) ON DELETE CASCADE,
  "billed_amount" TEXT,
  "currency" VARCHAR(255) NOT NULL DEFAULT 'USD',
  "is_running" BOOLEAN NOT NULL DEFAULT false,
  "is_approved" BOOLEAN NOT NULL DEFAULT false,
  "approved_by" VARCHAR(255),
  "approved_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_time_entries_workspace_id" ON "time_entries" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_task_id" ON "time_entries" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_user_id" ON "time_entries" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_start_time" ON "time_entries" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_time_entries_is_running" ON "time_entries" ("is_running");
CREATE INDEX IF NOT EXISTS "idx_time_entries_billable" ON "time_entries" ("billable");
CREATE INDEX IF NOT EXISTS "idx_time_entries_is_approved" ON "time_entries" ("is_approved");
CREATE INDEX IF NOT EXISTS "idx_time_entries_is_deleted" ON "time_entries" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_time_entries_workspace_id_user_id" ON "time_entries" ("workspace_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_time_entries_task_id_user_id" ON "time_entries" ("task_id", "user_id");

-- ==================== TASK_BUDGET_ALLOCATIONS ====================
CREATE TABLE IF NOT EXISTS "task_budget_allocations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "budget_id" UUID NOT NULL REFERENCES "budgets"(id) ON DELETE CASCADE,
  "category_id" UUID NOT NULL REFERENCES "budget_categories"(id) ON DELETE CASCADE,
  "allocated_amount" TEXT NOT NULL DEFAULT 0,
  "notes" TEXT,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_budget_allocations_task_id" ON "task_budget_allocations" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_budget_allocations_budget_id" ON "task_budget_allocations" ("budget_id");
CREATE INDEX IF NOT EXISTS "idx_task_budget_allocations_category_id" ON "task_budget_allocations" ("category_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_budget_allocations_task_id_category_id" ON "task_budget_allocations" ("task_id", "category_id");

-- ==================== TASK_ASSIGNEE_RATES ====================
CREATE TABLE IF NOT EXISTS "task_assignee_rates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "task_id" UUID NOT NULL REFERENCES "tasks"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "hourly_rate" TEXT NOT NULL,
  "currency" VARCHAR(255) NOT NULL DEFAULT 'USD',
  "notes" TEXT,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_task_assignee_rates_task_id" ON "task_assignee_rates" ("task_id");
CREATE INDEX IF NOT EXISTS "idx_task_assignee_rates_user_id" ON "task_assignee_rates" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_task_assignee_rates_task_id_user_id" ON "task_assignee_rates" ("task_id", "user_id");

-- ==================== BUDGET_ALERTS ====================
CREATE TABLE IF NOT EXISTS "budget_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "budget_id" UUID NOT NULL REFERENCES "budgets"(id) ON DELETE CASCADE,
  "alert_type" VARCHAR(255) NOT NULL,
  "threshold_percentage" TEXT,
  "current_spent" TEXT,
  "total_budget" TEXT,
  "message" TEXT NOT NULL,
  "sent_to" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB DEFAULT '{}',
  "sent_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_budget_alerts_budget_id" ON "budget_alerts" ("budget_id");
CREATE INDEX IF NOT EXISTS "idx_budget_alerts_alert_type" ON "budget_alerts" ("alert_type");
CREATE INDEX IF NOT EXISTS "idx_budget_alerts_sent_at" ON "budget_alerts" ("sent_at");

-- ==================== AUTOPILOT_BRIEFINGS ====================
CREATE TABLE IF NOT EXISTS "autopilot_briefings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "briefing_type" VARCHAR(255) NOT NULL,
  "content" JSONB NOT NULL,
  "generated_at" TIMESTAMPTZ DEFAULT now(),
  "is_read" BOOLEAN DEFAULT false,
  "read_at" TIMESTAMPTZ,
  "expires_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS "idx_autopilot_briefings_user_id_workspace_id" ON "autopilot_briefings" ("user_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_briefings_briefing_type" ON "autopilot_briefings" ("briefing_type");
CREATE INDEX IF NOT EXISTS "idx_autopilot_briefings_generated_at" ON "autopilot_briefings" ("generated_at");
CREATE INDEX IF NOT EXISTS "idx_autopilot_briefings_is_read" ON "autopilot_briefings" ("is_read");
CREATE INDEX IF NOT EXISTS "idx_autopilot_briefings_expires_at" ON "autopilot_briefings" ("expires_at");

-- ==================== AUTOPILOT_ALERTS ====================
CREATE TABLE IF NOT EXISTS "autopilot_alerts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "alert_type" VARCHAR(255) NOT NULL,
  "entity_type" VARCHAR(255) NOT NULL,
  "entity_id" UUID NOT NULL,
  "priority" VARCHAR(255) DEFAULT 'normal',
  "title" VARCHAR(255) NOT NULL,
  "message" TEXT NOT NULL,
  "action_url" VARCHAR(255),
  "is_sent" BOOLEAN DEFAULT false,
  "sent_at" TIMESTAMPTZ,
  "is_dismissed" BOOLEAN DEFAULT false,
  "dismissed_at" TIMESTAMPTZ,
  "metadata" JSONB DEFAULT '{}',
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_user_id_workspace_id" ON "autopilot_alerts" ("user_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_alert_type" ON "autopilot_alerts" ("alert_type");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_entity_type_entity_id" ON "autopilot_alerts" ("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_priority" ON "autopilot_alerts" ("priority");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_is_sent" ON "autopilot_alerts" ("is_sent");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_is_dismissed" ON "autopilot_alerts" ("is_dismissed");
CREATE INDEX IF NOT EXISTS "idx_autopilot_alerts_created_at" ON "autopilot_alerts" ("created_at");

-- ==================== AUTOPILOT_SUGGESTIONS_CACHE ====================
CREATE TABLE IF NOT EXISTS "autopilot_suggestions_cache" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "suggestions" JSONB NOT NULL,
  "context_hash" VARCHAR(255),
  "generated_at" TIMESTAMPTZ DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "hit_count" INTEGER DEFAULT 0,
  "last_accessed_at" TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_autopilot_suggestions_cache_user_id_workspace_id" ON "autopilot_suggestions_cache" ("user_id", "workspace_id");
CREATE INDEX IF NOT EXISTS "idx_autopilot_suggestions_cache_expires_at" ON "autopilot_suggestions_cache" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_autopilot_suggestions_cache_generated_at" ON "autopilot_suggestions_cache" ("generated_at");

-- ==================== BLOG_POSTS ====================
CREATE TABLE IF NOT EXISTS "blog_posts" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT,
  "featured_image" VARCHAR(255),
  "images" JSONB DEFAULT '[]',
  "author_id" VARCHAR(255) NOT NULL,
  "status" VARCHAR(255) DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "view_count" INTEGER DEFAULT 0,
  "like_count" INTEGER DEFAULT 0,
  "comment_count" INTEGER DEFAULT 0,
  "rating_count" INTEGER DEFAULT 0,
  "rating_average" TEXT DEFAULT 0,
  "read_time" INTEGER,
  "seo_meta_title" VARCHAR(255),
  "seo_meta_description" TEXT,
  "is_featured" BOOLEAN DEFAULT false,
  "is_deleted" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_posts_slug" ON "blog_posts" ("slug");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_author_id" ON "blog_posts" ("author_id");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_status" ON "blog_posts" ("status");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_published_at" ON "blog_posts" ("published_at");
CREATE INDEX IF NOT EXISTS "idx_blog_posts_rating_average" ON "blog_posts" ("rating_average");

-- ==================== BLOG_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS "blog_categories" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "post_count" INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_categories_slug" ON "blog_categories" ("slug");

-- ==================== BLOG_TAGS ====================
CREATE TABLE IF NOT EXISTS "blog_tags" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "slug" VARCHAR(255) NOT NULL,
  "post_count" INTEGER DEFAULT 0
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_tags_slug" ON "blog_tags" ("slug");

-- ==================== BLOG_POST_CATEGORIES ====================
CREATE TABLE IF NOT EXISTS "blog_post_categories" (
  "post_id" UUID NOT NULL REFERENCES "blog_posts"(id) ON DELETE CASCADE,
  "category_id" UUID NOT NULL REFERENCES "blog_categories"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_post_categories_post_id_category_id" ON "blog_post_categories" ("post_id", "category_id");

-- ==================== BLOG_POST_TAGS ====================
CREATE TABLE IF NOT EXISTS "blog_post_tags" (
  "post_id" UUID NOT NULL REFERENCES "blog_posts"(id) ON DELETE CASCADE,
  "tag_id" UUID NOT NULL REFERENCES "blog_tags"(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_blog_post_tags_post_id_tag_id" ON "blog_post_tags" ("post_id", "tag_id");

-- ==================== BLOG_COMMENTS ====================
CREATE TABLE IF NOT EXISTS "blog_comments" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL REFERENCES "blog_posts"(id) ON DELETE CASCADE,
  "parent_id" UUID REFERENCES "blog_comments"(id) ON DELETE CASCADE,
  "author_name" VARCHAR(255) NOT NULL,
  "author_email" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "is_approved" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_blog_comments_post_id" ON "blog_comments" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_blog_comments_is_approved" ON "blog_comments" ("is_approved");

-- ==================== BLOG_POST_LIKES ====================
CREATE TABLE IF NOT EXISTS "blog_post_likes" (
  "post_id" UUID NOT NULL REFERENCES "blog_posts"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "ip_address" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_blog_post_likes_post_id" ON "blog_post_likes" ("post_id");

-- ==================== BLOG_RATINGS ====================
CREATE TABLE IF NOT EXISTS "blog_ratings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "post_id" UUID NOT NULL REFERENCES "blog_posts"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255),
  "user_email" VARCHAR(255),
  "user_name" VARCHAR(255),
  "rating" INTEGER NOT NULL,
  "review" TEXT,
  "ip_address" VARCHAR(255),
  "is_verified_purchase" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_blog_ratings_post_id" ON "blog_ratings" ("post_id");
CREATE INDEX IF NOT EXISTS "idx_blog_ratings_user_id" ON "blog_ratings" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_blog_ratings_rating" ON "blog_ratings" ("rating");
CREATE INDEX IF NOT EXISTS "idx_blog_ratings_created_at" ON "blog_ratings" ("created_at");

-- ==================== FORM_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS "form_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "slug" VARCHAR(255) NOT NULL,
  "fields" JSONB NOT NULL DEFAULT '[]',
  "pages" JSONB NOT NULL DEFAULT '[]',
  "settings" JSONB NOT NULL DEFAULT '{}',
  "branding" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'draft',
  "published_at" TIMESTAMPTZ,
  "closed_at" TIMESTAMPTZ,
  "view_count" INTEGER DEFAULT 0,
  "response_count" INTEGER DEFAULT 0,
  "is_deleted" BOOLEAN DEFAULT false,
  "deleted_at" TIMESTAMPTZ,
  "deleted_by" VARCHAR(255),
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_form_templates_workspace_id" ON "form_templates" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_form_templates_slug" ON "form_templates" ("slug");
CREATE INDEX IF NOT EXISTS "idx_form_templates_created_by" ON "form_templates" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_form_templates_status" ON "form_templates" ("status");
CREATE INDEX IF NOT EXISTS "idx_form_templates_is_deleted" ON "form_templates" ("is_deleted");
CREATE INDEX IF NOT EXISTS "idx_form_templates_published_at" ON "form_templates" ("published_at");

-- ==================== FORM_RESPONSES ====================
CREATE TABLE IF NOT EXISTS "form_responses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" UUID NOT NULL REFERENCES "form_templates"(id) ON DELETE CASCADE,
  "workspace_id" UUID REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "respondent_id" VARCHAR(255),
  "respondent_email" VARCHAR(255),
  "respondent_name" VARCHAR(255),
  "responses" JSONB NOT NULL,
  "ip_address" VARCHAR(255),
  "user_agent" TEXT,
  "submission_time_seconds" INTEGER,
  "status" VARCHAR(255) DEFAULT 'submitted',
  "is_complete" BOOLEAN DEFAULT true,
  "submitted_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "idx_form_responses_form_id" ON "form_responses" ("form_id");
CREATE INDEX IF NOT EXISTS "idx_form_responses_respondent_id" ON "form_responses" ("respondent_id");
CREATE INDEX IF NOT EXISTS "idx_form_responses_respondent_email" ON "form_responses" ("respondent_email");
CREATE INDEX IF NOT EXISTS "idx_form_responses_submitted_at" ON "form_responses" ("submitted_at");
CREATE INDEX IF NOT EXISTS "idx_form_responses_form_id_respondent_id" ON "form_responses" ("form_id", "respondent_id");

-- ==================== FORM_FILE_UPLOADS ====================
CREATE TABLE IF NOT EXISTS "form_file_uploads" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" UUID NOT NULL REFERENCES "form_templates"(id) ON DELETE CASCADE,
  "response_id" UUID NOT NULL REFERENCES "form_responses"(id) ON DELETE CASCADE,
  "field_id" VARCHAR(255) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "file_url" VARCHAR(255) NOT NULL,
  "file_size" BIGINT NOT NULL,
  "mime_type" VARCHAR(255) NOT NULL,
  "uploaded_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_form_file_uploads_form_id" ON "form_file_uploads" ("form_id");
CREATE INDEX IF NOT EXISTS "idx_form_file_uploads_response_id" ON "form_file_uploads" ("response_id");
CREATE INDEX IF NOT EXISTS "idx_form_file_uploads_field_id" ON "form_file_uploads" ("field_id");

-- ==================== FORM_SHARE_LINKS ====================
CREATE TABLE IF NOT EXISTS "form_share_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" UUID NOT NULL REFERENCES "form_templates"(id) ON DELETE CASCADE,
  "share_token" VARCHAR(255) NOT NULL,
  "access_level" VARCHAR(255) DEFAULT 'respond',
  "require_password" BOOLEAN DEFAULT false,
  "password_hash" VARCHAR(255),
  "expires_at" TIMESTAMPTZ,
  "max_responses" INTEGER,
  "response_count" INTEGER DEFAULT 0,
  "is_active" BOOLEAN DEFAULT true,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_form_share_links_form_id" ON "form_share_links" ("form_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_form_share_links_share_token" ON "form_share_links" ("share_token");
CREATE INDEX IF NOT EXISTS "idx_form_share_links_is_active" ON "form_share_links" ("is_active");

-- ==================== FORM_NOTIFICATIONS ====================
CREATE TABLE IF NOT EXISTS "form_notifications" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" UUID NOT NULL REFERENCES "form_templates"(id) ON DELETE CASCADE,
  "event_type" VARCHAR(255) NOT NULL,
  "recipient_email" VARCHAR(255) NOT NULL,
  "sent_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_form_notifications_form_id" ON "form_notifications" ("form_id");
CREATE INDEX IF NOT EXISTS "idx_form_notifications_event_type" ON "form_notifications" ("event_type");

-- ==================== FORM_ANALYTICS ====================
CREATE TABLE IF NOT EXISTS "form_analytics" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "form_id" UUID NOT NULL REFERENCES "form_templates"(id) ON DELETE CASCADE,
  "total_views" INTEGER DEFAULT 0,
  "total_responses" INTEGER DEFAULT 0,
  "completion_rate" TEXT DEFAULT 0,
  "avg_completion_time_seconds" INTEGER,
  "field_stats" JSONB DEFAULT '{}',
  "last_calculated_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_form_analytics_form_id" ON "form_analytics" ("form_id");

-- ==================== WORKFLOWS ====================
CREATE TABLE IF NOT EXISTS "workflows" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "created_by" VARCHAR(255) NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "icon" VARCHAR(255),
  "color" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT 'true',
  "trigger_type" VARCHAR(255) NOT NULL,
  "trigger_config" JSONB DEFAULT '{}',
  "run_count" INTEGER DEFAULT '0',
  "success_count" INTEGER DEFAULT '0',
  "failure_count" INTEGER DEFAULT '0',
  "last_run_at" TIMESTAMPTZ,
  "last_run_status" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflows_workspace_id" ON "workflows" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workflows_created_by" ON "workflows" ("created_by");
CREATE INDEX IF NOT EXISTS "idx_workflows_is_active" ON "workflows" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflows_trigger_type" ON "workflows" ("trigger_type");
CREATE INDEX IF NOT EXISTS "idx_workflows_workspace_id_is_active" ON "workflows" ("workspace_id", "is_active");

-- ==================== WORKFLOW_STEPS ====================
CREATE TABLE IF NOT EXISTS "workflow_steps" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "step_order" INTEGER NOT NULL,
  "step_type" VARCHAR(255) NOT NULL,
  "step_name" VARCHAR(255),
  "step_config" JSONB DEFAULT '{}',
  "parent_step_id" UUID REFERENCES "workflow_steps"(id) ON DELETE CASCADE,
  "branch_path" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT 'true',
  "position_x" INTEGER DEFAULT '0',
  "position_y" INTEGER DEFAULT '0',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_steps_workflow_id" ON "workflow_steps" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_parent_step_id" ON "workflow_steps" ("parent_step_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_steps_workflow_id_step_order" ON "workflow_steps" ("workflow_id", "step_order");

-- ==================== WORKFLOW_EXECUTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "triggered_by" VARCHAR(255),
  "trigger_source" VARCHAR(255),
  "trigger_data" JSONB DEFAULT '{}',
  "status" VARCHAR(255) DEFAULT 'pending',
  "current_step_id" UUID,
  "context" JSONB DEFAULT '{}',
  "error_message" TEXT,
  "steps_completed" INTEGER DEFAULT '0',
  "steps_total" INTEGER DEFAULT '0',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_executions_workflow_id" ON "workflow_executions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_status" ON "workflow_executions" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_triggered_by" ON "workflow_executions" ("triggered_by");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_created_at" ON "workflow_executions" ("created_at");
CREATE INDEX IF NOT EXISTS "idx_workflow_executions_workflow_id_status" ON "workflow_executions" ("workflow_id", "status");

-- ==================== WORKFLOW_STEP_EXECUTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_step_executions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "execution_id" UUID NOT NULL REFERENCES "workflow_executions"(id) ON DELETE CASCADE,
  "step_id" UUID NOT NULL REFERENCES "workflow_steps"(id) ON DELETE CASCADE,
  "status" VARCHAR(255) DEFAULT 'pending',
  "input_data" JSONB DEFAULT '{}',
  "output_data" JSONB DEFAULT '{}',
  "condition_result" BOOLEAN,
  "error_message" TEXT,
  "retry_count" INTEGER DEFAULT '0',
  "started_at" TIMESTAMPTZ,
  "completed_at" TIMESTAMPTZ,
  "execution_time_ms" INTEGER,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_execution_id" ON "workflow_step_executions" ("execution_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_step_id" ON "workflow_step_executions" ("step_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_status" ON "workflow_step_executions" ("status");
CREATE INDEX IF NOT EXISTS "idx_workflow_step_executions_execution_id_step_id" ON "workflow_step_executions" ("execution_id", "step_id");

-- ==================== WORKFLOW_ENTITY_SUBSCRIPTIONS ====================
CREATE TABLE IF NOT EXISTS "workflow_entity_subscriptions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "entity_type" VARCHAR(255) NOT NULL,
  "event_type" VARCHAR(255) NOT NULL,
  "filter_config" JSONB DEFAULT '{}',
  "is_active" BOOLEAN DEFAULT 'true',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workflow_id" ON "workflow_entity_subscriptions" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workspace_id" ON "workflow_entity_subscriptions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_entity_type_event_type" ON "workflow_entity_subscriptions" ("entity_type", "event_type");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_is_active" ON "workflow_entity_subscriptions" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflow_entity_subscriptions_workspace_id_entity_type_event_type_is_active" ON "workflow_entity_subscriptions" ("workspace_id", "entity_type", "event_type", "is_active");

-- ==================== AUTOMATION_TEMPLATES ====================
CREATE TABLE IF NOT EXISTS "automation_templates" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(255) NOT NULL,
  "icon" VARCHAR(255),
  "color" VARCHAR(255),
  "template_config" JSONB NOT NULL,
  "variables" JSONB DEFAULT '[]',
  "is_featured" BOOLEAN DEFAULT 'false',
  "is_system" BOOLEAN DEFAULT 'false',
  "use_count" INTEGER DEFAULT '0',
  "created_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_automation_templates_category" ON "automation_templates" ("category");
CREATE INDEX IF NOT EXISTS "idx_automation_templates_is_featured" ON "automation_templates" ("is_featured");
CREATE INDEX IF NOT EXISTS "idx_automation_templates_is_system" ON "automation_templates" ("is_system");
CREATE INDEX IF NOT EXISTS "idx_automation_templates_use_count" ON "automation_templates" ("use_count");

-- ==================== WORKFLOW_SCHEDULED_JOBS ====================
CREATE TABLE IF NOT EXISTS "workflow_scheduled_jobs" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "cron_expression" VARCHAR(255) NOT NULL,
  "timezone" VARCHAR(255) DEFAULT 'UTC',
  "next_run_at" TIMESTAMPTZ NOT NULL,
  "last_run_at" TIMESTAMPTZ,
  "is_active" BOOLEAN DEFAULT 'true',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_workflow_id" ON "workflow_scheduled_jobs" ("workflow_id");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_next_run_at" ON "workflow_scheduled_jobs" ("next_run_at");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_is_active" ON "workflow_scheduled_jobs" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_workflow_scheduled_jobs_is_active_next_run_at" ON "workflow_scheduled_jobs" ("is_active", "next_run_at");

-- ==================== WORKFLOW_WEBHOOKS ====================
CREATE TABLE IF NOT EXISTS "workflow_webhooks" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workflow_id" UUID NOT NULL REFERENCES "workflows"(id) ON DELETE CASCADE,
  "webhook_key" VARCHAR(255) NOT NULL,
  "secret" VARCHAR(255),
  "allowed_ips" JSONB DEFAULT '[]',
  "is_active" BOOLEAN DEFAULT 'true',
  "last_triggered_at" TIMESTAMPTZ,
  "trigger_count" INTEGER DEFAULT '0',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_webhooks_workflow_id" ON "workflow_webhooks" ("workflow_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_webhooks_webhook_key" ON "workflow_webhooks" ("webhook_key");
CREATE INDEX IF NOT EXISTS "idx_workflow_webhooks_is_active" ON "workflow_webhooks" ("is_active");

-- ==================== WORKFLOW_VARIABLES ====================
CREATE TABLE IF NOT EXISTS "workflow_variables" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "name" VARCHAR(255) NOT NULL,
  "value" TEXT,
  "value_type" VARCHAR(255) DEFAULT 'string',
  "is_secret" BOOLEAN DEFAULT 'false',
  "description" TEXT,
  "created_by" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_workflow_variables_workspace_id" ON "workflow_variables" ("workspace_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_workflow_variables_workspace_id_name" ON "workflow_variables" ("workspace_id", "name");

-- ==================== SCHEDULED_ACTIONS ====================
CREATE TABLE IF NOT EXISTS "scheduled_actions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "action_type" VARCHAR(255) NOT NULL,
  "action_config" JSONB NOT NULL,
  "scheduled_at" TIMESTAMPTZ NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "executed_at" TIMESTAMPTZ,
  "result" JSONB,
  "description" TEXT,
  "retry_count" INTEGER DEFAULT '0',
  "max_retries" INTEGER DEFAULT '3',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_scheduled_actions_workspace_id" ON "scheduled_actions" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_actions_user_id" ON "scheduled_actions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_scheduled_actions_status" ON "scheduled_actions" ("status");
CREATE INDEX IF NOT EXISTS "idx_scheduled_actions_scheduled_at" ON "scheduled_actions" ("scheduled_at");
CREATE INDEX IF NOT EXISTS "idx_scheduled_actions_status_scheduled_at" ON "scheduled_actions" ("status", "scheduled_at");

-- ==================== FEEDBACK ====================
CREATE TABLE IF NOT EXISTS "feedback" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "type" VARCHAR(255) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "description" TEXT NOT NULL,
  "status" VARCHAR(255) DEFAULT 'pending',
  "priority" VARCHAR(255) DEFAULT 'medium',
  "category" VARCHAR(255),
  "attachments" JSONB DEFAULT '[]',
  "app_version" VARCHAR(255),
  "device_info" JSONB DEFAULT '{}',
  "resolution_notes" TEXT,
  "resolved_at" TIMESTAMPTZ,
  "resolved_by" VARCHAR(255),
  "notified_at" TIMESTAMPTZ,
  "assigned_to" VARCHAR(255),
  "duplicate_of_id" UUID,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_feedback_user_id" ON "feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_type" ON "feedback" ("type");
CREATE INDEX IF NOT EXISTS "idx_feedback_status" ON "feedback" ("status");
CREATE INDEX IF NOT EXISTS "idx_feedback_priority" ON "feedback" ("priority");
CREATE INDEX IF NOT EXISTS "idx_feedback_created_at" ON "feedback" ("created_at");

-- ==================== FEEDBACK_RESPONSES ====================
CREATE TABLE IF NOT EXISTS "feedback_responses" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "feedback_id" UUID NOT NULL REFERENCES "feedback"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "content" TEXT NOT NULL,
  "is_internal" BOOLEAN DEFAULT false,
  "status_change" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_feedback_responses_feedback_id" ON "feedback_responses" ("feedback_id");
CREATE INDEX IF NOT EXISTS "idx_feedback_responses_created_at" ON "feedback_responses" ("created_at");

-- ==================== ACCOUNT_DELETION_FEEDBACK ====================
CREATE TABLE IF NOT EXISTS "account_deletion_feedback" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "user_email" VARCHAR(255) NOT NULL,
  "user_name" VARCHAR(255),
  "reason" VARCHAR(255) NOT NULL,
  "reason_details" TEXT,
  "feedback_response" TEXT,
  "was_retained" BOOLEAN DEFAULT false,
  "deleted_account" BOOLEAN DEFAULT false,
  "status" VARCHAR(255) DEFAULT 'pending',
  "priority" VARCHAR(255) DEFAULT 'normal',
  "admin_notes" TEXT,
  "reviewed_at" TIMESTAMPTZ,
  "reviewed_by" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_user_id" ON "account_deletion_feedback" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_user_email" ON "account_deletion_feedback" ("user_email");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_reason" ON "account_deletion_feedback" ("reason");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_status" ON "account_deletion_feedback" ("status");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_priority" ON "account_deletion_feedback" ("priority");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_was_retained" ON "account_deletion_feedback" ("was_retained");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_deleted_account" ON "account_deletion_feedback" ("deleted_account");
CREATE INDEX IF NOT EXISTS "idx_account_deletion_feedback_created_at" ON "account_deletion_feedback" ("created_at");

-- ==================== SLACK_WHITEBOARD_INSTALLATIONS ====================
CREATE TABLE IF NOT EXISTS "slack_whiteboard_installations" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "team_id" VARCHAR(255) NOT NULL,
  "team_name" VARCHAR(255) NOT NULL,
  "bot_token" VARCHAR(255) NOT NULL,
  "bot_user_id" VARCHAR(255) NOT NULL,
  "installer_user_id" VARCHAR(255) NOT NULL,
  "user_token" VARCHAR(255),
  "scope" VARCHAR(255) NOT NULL,
  "webhook_url" VARCHAR(255),
  "webhook_channel" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "uninstalled_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_whiteboard_installations_team_id" ON "slack_whiteboard_installations" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_installations_bot_user_id" ON "slack_whiteboard_installations" ("bot_user_id");
CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_installations_is_active" ON "slack_whiteboard_installations" ("is_active");

-- ==================== SLACK_WHITEBOARD_LINKS ====================
CREATE TABLE IF NOT EXISTS "slack_whiteboard_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "whiteboard_id" UUID NOT NULL REFERENCES "whiteboards"(id) ON DELETE CASCADE,
  "team_id" VARCHAR(255) NOT NULL,
  "channel_id" VARCHAR(255),
  "creator_slack_user_id" VARCHAR(255) NOT NULL,
  "message_ts" VARCHAR(255),
  "is_shared" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_links_whiteboard_id" ON "slack_whiteboard_links" ("whiteboard_id");
CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_links_team_id" ON "slack_whiteboard_links" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_links_team_id_channel_id" ON "slack_whiteboard_links" ("team_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_slack_whiteboard_links_creator_slack_user_id" ON "slack_whiteboard_links" ("creator_slack_user_id");

-- ==================== SLACK_SETUP_SESSIONS ====================
CREATE TABLE IF NOT EXISTS "slack_setup_sessions" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "setup_token" VARCHAR(255) NOT NULL,
  "slack_data" JSONB NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "completed" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_setup_sessions_setup_token" ON "slack_setup_sessions" ("setup_token");
CREATE INDEX IF NOT EXISTS "idx_slack_setup_sessions_expires_at" ON "slack_setup_sessions" ("expires_at");
CREATE INDEX IF NOT EXISTS "idx_slack_setup_sessions_completed" ON "slack_setup_sessions" ("completed");

-- ==================== SLACK_PROJECT_LINKS ====================
CREATE TABLE IF NOT EXISTS "slack_project_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "project_id" UUID NOT NULL REFERENCES "projects"(id) ON DELETE CASCADE,
  "team_id" VARCHAR(255) NOT NULL,
  "channel_id" VARCHAR(255),
  "creator_slack_user_id" VARCHAR(255) NOT NULL,
  "message_ts" VARCHAR(255),
  "is_shared" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_project_links_project_id" ON "slack_project_links" ("project_id");
CREATE INDEX IF NOT EXISTS "idx_slack_project_links_team_id" ON "slack_project_links" ("team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_project_links_team_id_channel_id" ON "slack_project_links" ("team_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_slack_project_links_creator_slack_user_id" ON "slack_project_links" ("creator_slack_user_id");

-- ==================== SLACK_USER_MAPPINGS ====================
CREATE TABLE IF NOT EXISTS "slack_user_mappings" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "deskive_user_id" VARCHAR(255) NOT NULL,
  "slack_user_id" VARCHAR(255) NOT NULL,
  "slack_team_id" VARCHAR(255) NOT NULL,
  "slack_email" VARCHAR(255),
  "slack_name" VARCHAR(255),
  "slack_avatar" TEXT,
  "user_access_token" TEXT,
  "is_active" BOOLEAN DEFAULT true,
  "onboarding_completed" BOOLEAN DEFAULT false,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_user_mappings_deskive_user_id" ON "slack_user_mappings" ("deskive_user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_user_mappings_slack_user_id_slack_team_id" ON "slack_user_mappings" ("slack_user_id", "slack_team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_user_mappings_slack_team_id" ON "slack_user_mappings" ("slack_team_id");
CREATE INDEX IF NOT EXISTS "idx_slack_user_mappings_slack_email" ON "slack_user_mappings" ("slack_email");

-- ==================== SLACK_CALENDAR_CHANNEL_LINKS ====================
CREATE TABLE IF NOT EXISTS "slack_calendar_channel_links" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "workspace_id" UUID NOT NULL REFERENCES "workspaces"(id) ON DELETE CASCADE,
  "team_id" VARCHAR(255) NOT NULL,
  "channel_id" VARCHAR(255) NOT NULL,
  "channel_name" VARCHAR(255),
  "creator_slack_user_id" VARCHAR(255) NOT NULL,
  "notification_settings" JSONB DEFAULT '{}',
  "reminder_minutes" JSONB DEFAULT '[]',
  "is_active" BOOLEAN DEFAULT true,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_calendar_channel_links_workspace_id" ON "slack_calendar_channel_links" ("workspace_id");
CREATE INDEX IF NOT EXISTS "idx_slack_calendar_channel_links_team_id" ON "slack_calendar_channel_links" ("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_slack_calendar_channel_links_team_id_channel_id" ON "slack_calendar_channel_links" ("team_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_slack_calendar_channel_links_is_active" ON "slack_calendar_channel_links" ("is_active");

-- ==================== SLACK_EVENT_MESSAGES ====================
CREATE TABLE IF NOT EXISTS "slack_event_messages" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "event_id" UUID NOT NULL REFERENCES "calendar_events"(id) ON DELETE CASCADE,
  "team_id" VARCHAR(255) NOT NULL,
  "channel_id" VARCHAR(255) NOT NULL,
  "message_ts" VARCHAR(255) NOT NULL,
  "message_type" VARCHAR(255) DEFAULT 'event_created',
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_slack_event_messages_event_id" ON "slack_event_messages" ("event_id");
CREATE INDEX IF NOT EXISTS "idx_slack_event_messages_team_id_channel_id" ON "slack_event_messages" ("team_id", "channel_id");
CREATE INDEX IF NOT EXISTS "idx_slack_event_messages_message_ts" ON "slack_event_messages" ("message_ts");

-- ==================== USER_KEYS ====================
CREATE TABLE IF NOT EXISTS "user_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(255) NOT NULL,
  "public_key" TEXT NOT NULL,
  "device_id" VARCHAR(255) NOT NULL,
  "device_name" VARCHAR(255),
  "is_active" BOOLEAN DEFAULT true,
  "last_used_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_user_keys_user_id" ON "user_keys" ("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_user_keys_user_id_device_id" ON "user_keys" ("user_id", "device_id");
CREATE INDEX IF NOT EXISTS "idx_user_keys_is_active" ON "user_keys" ("is_active");

-- ==================== CONVERSATION_KEYS ====================
CREATE TABLE IF NOT EXISTS "conversation_keys" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"(id) ON DELETE CASCADE,
  "user_id" VARCHAR(255) NOT NULL,
  "encrypted_key" TEXT NOT NULL,
  "created_by" VARCHAR(255),
  "key_version" INTEGER DEFAULT 1,
  "created_at" TIMESTAMPTZ DEFAULT now(),
  "updated_at" TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_conversation_keys_conversation_id_user_id" ON "conversation_keys" ("conversation_id", "user_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_keys_conversation_id" ON "conversation_keys" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_conversation_keys_user_id" ON "conversation_keys" ("user_id");

-- ==================== KEY_ROTATION_HISTORY ====================
CREATE TABLE IF NOT EXISTS "key_rotation_history" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversation_id" UUID NOT NULL REFERENCES "conversations"(id) ON DELETE CASCADE,
  "old_key_version" INTEGER NOT NULL,
  "new_key_version" INTEGER NOT NULL,
  "rotated_by" VARCHAR(255) NOT NULL,
  "rotation_reason" VARCHAR(255),
  "created_at" TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_key_rotation_history_conversation_id" ON "key_rotation_history" ("conversation_id");
CREATE INDEX IF NOT EXISTS "idx_key_rotation_history_created_at" ON "key_rotation_history" ("created_at");
