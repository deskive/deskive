/**
 * Deskive Database Schema Definition
 * Using database's migration system (working format)
 */

export const schema = {
  // ==================== WORKSPACES ====================
  workspaces: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'logo', type: 'text', nullable: true },
      { name: 'website', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'owner_id', type: 'string', nullable: false },
      { name: 'max_members', type: 'integer', default: 10 },
      { name: 'max_storage_gb', type: 'integer', default: 10 },
      { name: 'settings', type: 'jsonb', default: '{}' },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['owner_id'] }, { columns: ['is_active'] }, { columns: ['created_at'] }],
  },

  // ==================== WORKSPACE SUBSCRIPTIONS ====================
  workspace_subscriptions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'plan', type: 'string', nullable: false, default: 'free' }, // free, starter, professional, enterprise
      { name: 'billing_cycle', type: 'string', nullable: true }, // month, year
      { name: 'status', type: 'string', nullable: false, default: 'active' }, // active, canceled, expired, past_due
      { name: 'source', type: 'string', nullable: true }, // stripe, apple, google
      { name: 'stripe_customer_id', type: 'string', nullable: true },
      { name: 'stripe_subscription_id', type: 'string', nullable: true },
      { name: 'apple_product_id', type: 'string', nullable: true },
      { name: 'apple_transaction_id', type: 'string', nullable: true },
      { name: 'apple_original_transaction_id', type: 'string', nullable: true },
      { name: 'google_product_id', type: 'string', nullable: true },
      { name: 'google_purchase_token', type: 'string', nullable: true },
      { name: 'google_order_id', type: 'string', nullable: true },
      { name: 'current_period_start', type: 'timestamptz', nullable: true },
      { name: 'current_period_end', type: 'timestamptz', nullable: true },
      { name: 'cancel_at_period_end', type: 'boolean', default: false },
      { name: 'trial_end', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'], unique: true },
      { columns: ['status'] },
      { columns: ['source'] },
      { columns: ['plan'] },
      { columns: ['stripe_subscription_id'] },
      { columns: ['apple_original_transaction_id'] },
      { columns: ['google_order_id'] },
      { columns: ['current_period_end'] },
    ],
  },

  workspace_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', nullable: false, default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'invited_at', type: 'timestamptz', nullable: true },
      { name: 'invited_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
    ],
  },

  workspace_settings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'key', type: 'string', nullable: false },
      { name: 'value', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['workspace_id', 'key'], unique: true }, { columns: ['workspace_id'] }],
  },

  workspace_invites: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'email', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'invited_by', type: 'string', nullable: false },
      { name: 'token', type: 'string', unique: true, nullable: false },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'pending' },
      { name: 'accepted_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['email'] },
      { columns: ['status'] },
      { columns: ['expires_at'] },
      { columns: ['token'], unique: true },
    ],
  },

  // ==================== CHANNELS ====================
  channels: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'type', type: 'string', default: 'channel' },
      { name: 'is_private', type: 'boolean', default: false },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'archived_by', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['is_private'] },
      { columns: ['is_archived'] },
      { columns: ['created_by'] },
    ],
  },

  // ==================== MESSAGES ====================
  messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'channel_id', type: 'uuid', nullable: true, references: { table: 'channels' } },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: true }, // Nullable for E2EE messages
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'encrypted_content', type: 'text', nullable: true }, // E2EE encrypted message content
      { name: 'encryption_metadata', type: 'jsonb', nullable: true }, // Encryption algorithm, nonce, version
      { name: 'is_encrypted', type: 'boolean', default: false }, // Flag for encrypted messages
      { name: 'thread_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'reply_count', type: 'integer', default: 0 },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'mentions', type: 'jsonb', default: '[]' },
      { name: 'linked_content', type: 'jsonb', default: '[]' },
      { name: 'reactions', type: 'jsonb', default: '{}' },
      { name: 'is_edited', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'is_bookmarked', type: 'boolean', default: false },
      { name: 'bookmarked_at', type: 'timestamptz', nullable: true },
      { name: 'bookmarked_by', type: 'string', nullable: true },
      { name: 'is_pinned', type: 'boolean', default: false },
      { name: 'pinned_at', type: 'timestamptz', nullable: true },
      { name: 'pinned_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['channel_id', 'created_at'] },
      { columns: ['conversation_id', 'created_at'] },
      { columns: ['user_id'] },
      { columns: ['thread_id'] },
      { columns: ['parent_id'] },
      { columns: ['is_deleted'] },
      { columns: ['is_bookmarked'] },
      { columns: ['conversation_id', 'is_bookmarked'] },
      { columns: ['is_pinned'] },
      { columns: ['conversation_id', 'is_pinned'] },
      { columns: ['channel_id', 'is_pinned'] },
    ],
  },

  message_reactions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'emoji', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id', 'user_id', 'emoji'], unique: true },
      { columns: ['message_id'] },
      { columns: ['user_id'] },
    ],
  },

  message_read_receipts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'read_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id', 'user_id'], unique: true },
      { columns: ['message_id'] },
      { columns: ['user_id'] },
      { columns: ['read_at'] },
    ],
  },

  // Poll votes - tracks individual votes on polls (one vote per user per poll)
  poll_votes: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'message_id', type: 'uuid', nullable: false, references: { table: 'messages' } },
      { name: 'poll_id', type: 'string', nullable: false },
      { name: 'option_id', type: 'string', nullable: false },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['message_id'] },
      { columns: ['poll_id'] },
      { columns: ['user_id'] },
      { columns: ['message_id', 'poll_id', 'user_id'], unique: true },
    ],
  },

  // Scheduled messages - messages to be sent at a future time
  scheduled_messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'channel_id', type: 'uuid', nullable: true, references: { table: 'channels' } },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'mentions', type: 'jsonb', default: '[]' },
      { name: 'linked_content', type: 'jsonb', default: '[]' },
      { name: 'thread_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'scheduled_at', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'pending' },
      { name: 'sent_at', type: 'timestamptz', nullable: true },
      { name: 'sent_message_id', type: 'uuid', nullable: true, references: { table: 'messages' } },
      { name: 'failure_reason', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['channel_id'] },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
      { columns: ['scheduled_at'] },
      { columns: ['status'] },
      { columns: ['status', 'scheduled_at'] },
    ],
  },

  // ==================== PROJECTS ====================
  projects: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'type', type: 'string', default: 'kanban' },
      { name: 'status', type: 'string', default: 'active' },
      { name: 'priority', type: 'string', nullable: true },
      { name: 'owner_id', type: 'string', nullable: true },
      { name: 'lead_id', type: 'string', nullable: true },
      { name: 'start_date', type: 'date', nullable: true },
      { name: 'end_date', type: 'date', nullable: true },
      { name: 'estimated_hours', type: 'numeric', nullable: true },
      { name: 'actual_hours', type: 'numeric', nullable: true },
      { name: 'budget', type: 'numeric', nullable: true },
      { name: 'is_template', type: 'boolean', default: false },
      {
        name: 'kanban_stages',
        type: 'jsonb',
        default:
          '[{"id": "todo", "name": "To Do", "order": 1, "color": "#3B82F6"}, {"id": "in_progress", "name": "In Progress", "order": 2, "color": "#F59E0B"}, {"id": "done", "name": "Done", "order": 3, "color": "#10B981"}]',
      },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'archived_by', type: 'string', nullable: true },
      { name: 'settings', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['status'] },
      { columns: ['owner_id'] },
      { columns: ['type'] },
      { columns: ['priority'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== PROJECT MEMBERS ====================
  project_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'invited_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'notification_settings', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id', 'user_id'], unique: true },
      { columns: ['project_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== TASKS ====================
  tasks: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'sprint_id', type: 'uuid', nullable: true },
      { name: 'parent_task_id', type: 'uuid', nullable: true, references: { table: 'tasks' } },
      { name: 'task_type', type: 'string', nullable: false, default: 'task' },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'status', type: 'string', default: 'todo' },
      { name: 'priority', type: 'string', default: 'medium' },
      { name: 'assigned_to', type: 'jsonb', nullable: true }, // Array of user IDs
      { name: 'assignee_team_member_id', type: 'uuid', nullable: true },
      { name: 'reporter_team_member_id', type: 'uuid', nullable: true },
      { name: 'due_date', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'completed_by', type: 'string', nullable: true },
      { name: 'estimated_hours', type: 'numeric', nullable: true },
      { name: 'actual_hours', type: 'numeric', nullable: true },
      { name: 'story_points', type: 'integer', nullable: true },
      { name: 'labels', type: 'jsonb', default: '[]' },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'custom_fields', type: 'jsonb', default: '[]' }, // Per-task custom fields: array of { id, name, fieldType, value, options? }
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'updated_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] },
      { columns: ['sprint_id'] },
      { columns: ['assigned_to'] },
      { columns: ['assignee_team_member_id'] },
      { columns: ['reporter_team_member_id'] },
      { columns: ['status'] },
      { columns: ['priority'] },
      { columns: ['due_date'] },
      { columns: ['parent_task_id'] },
      { columns: ['task_type'] },
    ],
  },

  // ==================== TASK CUSTOM FIELD DEFINITIONS ====================
  // Project-level custom field definitions (like Notion properties)
  task_custom_field_definitions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'field_type', type: 'string', nullable: false }, // text, number, date, select, multi_select, checkbox, url, email, phone, person, relation
      { name: 'description', type: 'text', nullable: true },
      { name: 'options', type: 'jsonb', default: '[]' }, // For select/multi_select: [{ id, label, color }]
      { name: 'default_value', type: 'jsonb', nullable: true }, // Default value for the field
      { name: 'is_required', type: 'boolean', default: false },
      { name: 'is_visible', type: 'boolean', default: true },
      { name: 'sort_order', type: 'integer', default: 0 },
      { name: 'settings', type: 'jsonb', default: '{}' }, // Additional settings (e.g., number format, date format)
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] },
      { columns: ['project_id', 'name'], unique: true },
      { columns: ['field_type'] },
      { columns: ['is_visible'] },
      { columns: ['sort_order'] },
      { columns: ['created_at'] },
    ],
  },

  task_comments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_html', type: 'text', nullable: true },
      { name: 'attachments', type: 'jsonb', default: '[]' },
      { name: 'is_edited', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id'] },
      { columns: ['user_id'] },
      { columns: ['created_at'] },
      { columns: ['is_deleted'] },
    ],
  },

  // ==================== FILES & FOLDERS ====================
  folders: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'folders' } },
      { name: 'parent_ids', type: 'jsonb', nullable: true },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['parent_id'] },
      { columns: ['is_deleted'] },
      { columns: ['created_by'] },
      { columns: ['created_at'] },
    ],
  },

  files: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'storage_path', type: 'text', nullable: false },
      { name: 'url', type: 'text', nullable: true },
      { name: 'mime_type', type: 'string', nullable: true },
      { name: 'size', type: 'bigint', nullable: true },
      { name: 'uploaded_by', type: 'string', nullable: true },
      { name: 'folder_id', type: 'uuid', nullable: true, references: { table: 'folders' } },
      { name: 'parent_folder_ids', type: 'jsonb', default: '{}' },
      { name: 'version', type: 'integer', default: 1 },
      { name: 'previous_version_id', type: 'uuid', nullable: true, references: { table: 'files' } },
      { name: 'file_hash', type: 'string', nullable: true },
      { name: 'virus_scan_status', type: 'string', default: 'pending' },
      { name: 'virus_scan_at', type: 'timestamptz', nullable: true },
      { name: 'extracted_text', type: 'text', nullable: true },
      { name: 'ocr_status', type: 'string', nullable: true },
      { name: 'is_ai_generated', type: 'boolean', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'starred', type: 'boolean', default: false },
      { name: 'starred_at', type: 'timestamptz', nullable: true },
      { name: 'starred_by', type: 'string', nullable: true },
      { name: 'last_opened_at', type: 'timestamptz', nullable: true },
      { name: 'last_opened_by', type: 'string', nullable: true },
      { name: 'open_count', type: 'integer', default: 0 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['folder_id'] },
      { columns: ['uploaded_by'] },
      { columns: ['is_deleted'] },
      { columns: ['mime_type'] },
      { columns: ['file_hash'] },
      { columns: ['starred'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== FILE SHARES ====================
  file_shares: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'file_id', type: 'uuid', nullable: false, references: { table: 'files' } },
      { name: 'shared_by', type: 'string', nullable: false },
      { name: 'shared_with', type: 'string', nullable: true }, // null for public links
      { name: 'share_token', type: 'string', unique: true, nullable: false },
      { name: 'share_type', type: 'string', default: 'user' }, // 'link' | 'user' - public link vs specific user
      { name: 'access_level', type: 'string', default: 'view' }, // 'view' | 'download' | 'edit'
      { name: 'permissions', type: 'jsonb', default: '{}' }, // Legacy: detailed permissions
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'password', type: 'string', nullable: true }, // Password protection for links
      { name: 'max_downloads', type: 'integer', nullable: true }, // Download limit
      { name: 'download_count', type: 'integer', default: 0 },
      { name: 'view_count', type: 'integer', default: 0 }, // Track views
      { name: 'last_accessed_at', type: 'timestamptz', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['file_id'] },
      { columns: ['shared_by'] },
      { columns: ['shared_with'] },
      { columns: ['share_token'], unique: true },
      { columns: ['share_type'] },
      { columns: ['expires_at'] },
      { columns: ['is_active'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== FILE COMMENTS ====================
  file_comments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'file_id', type: 'uuid', nullable: false, references: { table: 'files' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'file_comments' } }, // For replies/threads
      { name: 'is_resolved', type: 'boolean', default: false }, // Mark comment as resolved
      { name: 'resolved_by', type: 'string', nullable: true },
      { name: 'resolved_at', type: 'timestamptz', nullable: true },
      { name: 'is_edited', type: 'boolean', default: false },
      { name: 'edited_at', type: 'timestamptz', nullable: true },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' }, // For mentions, attachments, etc.
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['file_id'] },
      { columns: ['user_id'] },
      { columns: ['parent_id'] },
      { columns: ['is_resolved'] },
      { columns: ['is_deleted'] },
      { columns: ['created_at'] },
      { columns: ['file_id', 'is_deleted'] },
    ],
  },

  // ==================== OFFLINE FILES ====================
  offline_files: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'file_id', type: 'uuid', nullable: false, references: { table: 'files' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'sync_status', type: 'string', default: 'pending' }, // pending, syncing, synced, error, outdated
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'synced_version', type: 'integer', default: 1 }, // Track which file version is synced locally
      { name: 'auto_sync', type: 'boolean', default: true }, // Auto-sync when file is updated
      { name: 'priority', type: 'integer', default: 0 }, // Sync priority (higher = sync first)
      { name: 'file_size', type: 'bigint', nullable: false }, // For tracking offline storage usage
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['file_id', 'user_id'], unique: true }, // One offline entry per file per user
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['sync_status'] },
      { columns: ['auto_sync'] },
      { columns: ['user_id', 'workspace_id'] },
    ],
  },

  // ==================== CHANNEL MEMBERS ====================
  channel_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'channel_id', type: 'uuid', nullable: false, references: { table: 'channels' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'permissions', type: 'jsonb', default: '[]' },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'added_by', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_read_at', type: 'timestamptz', nullable: true },
      { name: 'notification_settings', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
    ],
    indexes: [
      { columns: ['channel_id', 'user_id'], unique: true },
      { columns: ['channel_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== CONVERSATIONS ====================
  conversations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'type', type: 'string', default: 'direct' },
      { name: 'name', type: 'string', nullable: true },
      { name: 'description', type: 'text', nullable: true },
      { name: 'participants', type: 'jsonb', nullable: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'archived_by', type: 'string', nullable: true },
      { name: 'last_message_at', type: 'timestamptz', nullable: true },
      { name: 'message_count', type: 'integer', default: 0 },
      { name: 'settings', type: 'jsonb', default: '{}' },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['created_by'] },
      { columns: ['is_active'] },
      { columns: ['is_archived'] },
      { columns: ['last_message_at'] },
      { columns: ['created_at'] },
    ],
  },

  conversation_members: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'member' },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'is_starred', type: 'boolean', default: false },
      { name: 'starred_at', type: 'timestamptz', nullable: true },
      { name: 'last_read_at', type: 'timestamptz', nullable: true },
      { name: 'last_read_message_id', type: 'uuid', nullable: true },
      { name: 'joined_at', type: 'timestamptz', default: 'now()' },
      { name: 'left_at', type: 'timestamptz', nullable: true },
      { name: 'notifications_enabled', type: 'boolean', default: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['conversation_id', 'user_id'], unique: true },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
      { columns: ['is_active'] },
      { columns: ['is_starred'] },
      { columns: ['joined_at'] },
    ],
  },

  // ==================== CALENDAR & EVENTS ====================
  // ==================== EVENT CATEGORIES ====================
  event_categories: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'color', type: 'string', nullable: false },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'description_file_ids', type: 'jsonb', default: '[]' },
      { name: 'is_default', type: 'boolean', default: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['workspace_id', 'name'], unique: true },
      { columns: ['created_by'] },
    ],
  },

  // ==================== MEETING ROOMS ====================
  meeting_rooms: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'location', type: 'string', nullable: true },
      { name: 'capacity', type: 'integer', default: 10 },
      { name: 'room_type', type: 'string', default: 'conference' },
      { name: 'equipment', type: 'jsonb', default: '[]' },
      { name: 'amenities', type: 'jsonb', default: '[]' },
      { name: 'status', type: 'string', default: 'available' },
      { name: 'booking_policy', type: 'string', default: 'open' },
      { name: 'working_hours', type: 'jsonb', default: '{}' },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'room_code', type: 'string', unique: true, nullable: true },
      { name: 'floor', type: 'string', nullable: true },
      { name: 'building', type: 'string', nullable: true },
      { name: 'thumbnail_url', type: 'text', nullable: true },
      { name: 'images', type: 'jsonb', default: '[]' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['status'] },
      { columns: ['capacity'] },
      { columns: ['room_type'] },
      { columns: ['is_active'] },
      { columns: ['room_code'], unique: true },
    ],
  },

  calendar_events: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: false },
      { name: 'all_day', type: 'boolean', default: false },
      { name: 'location', type: 'string', nullable: true },
      { name: 'organizer_id', type: 'string', nullable: true },
      { name: 'attendees', type: 'jsonb', default: '[]' },
      { name: 'recurrence_rule', type: 'jsonb', nullable: true },
      { name: 'is_recurring', type: 'boolean', default: false },
      {
        name: 'parent_event_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'calendar_events' },
      },
      { name: 'meeting_url', type: 'text', nullable: true },
      { name: 'visibility', type: 'string', default: 'private' },
      { name: 'busy_status', type: 'string', default: 'busy' },
      { name: 'priority', type: 'string', default: 'normal' },
      { name: 'status', type: 'string', default: 'confirmed' },
      { name: 'room_id', type: 'uuid', nullable: true },
      { name: 'category_id', type: 'uuid', nullable: true },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"file_attachment": [], "note_attachment": [], "event_attachment": []}',
      },
      { name: 'drive_attachment', type: 'jsonb', default: '[]' },
      { name: 'description_file_ids', type: 'jsonb', default: '[]' },
      { name: 'last_modified_by', type: 'string', nullable: true },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      // Google Calendar sync fields
      { name: 'google_calendar_event_id', type: 'string', nullable: true }, // Google Calendar event ID for synced events
      {
        name: 'google_calendar_connection_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'google_calendar_connections' },
      },
      { name: 'synced_from_google', type: 'boolean', default: false }, // True if event was synced from Google
      { name: 'google_calendar_html_link', type: 'text', nullable: true }, // Direct link to event in Google Calendar
      { name: 'google_calendar_updated_at', type: 'timestamptz', nullable: true }, // Last update time from Google
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['organizer_id'] },
      { columns: ['start_time'] },
      { columns: ['end_time'] },
      { columns: ['all_day'] },
      { columns: ['is_recurring'] },
      { columns: ['parent_event_id'] },
      { columns: ['room_id'] },
      { columns: ['status'] },
      { columns: ['google_calendar_event_id'] },
      { columns: ['google_calendar_connection_id'] },
      { columns: ['synced_from_google'] },
    ],
  },

  meeting_bookings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'room_id', type: 'uuid', nullable: false, references: { table: 'meeting_rooms' } },
      { name: 'event_id', type: 'uuid', nullable: true, references: { table: 'calendar_events' } },
      { name: 'booked_by', type: 'string', nullable: false },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'confirmed' },
      { name: 'purpose', type: 'string', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'attendee_count', type: 'integer', nullable: true },
      { name: 'required_equipment', type: 'jsonb', default: '[]' },
      { name: 'catering_requirements', type: 'jsonb', default: '{}' },
      { name: 'is_recurring', type: 'boolean', default: false },
      { name: 'recurring_pattern_id', type: 'string', nullable: true },
      { name: 'cancelled_at', type: 'timestamptz', nullable: true },
      { name: 'cancelled_by', type: 'string', nullable: true },
      { name: 'cancellation_reason', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['room_id'] },
      { columns: ['start_time', 'end_time'] },
      { columns: ['booked_by'] },
      { columns: ['status'] },
      { columns: ['event_id'] },
      { columns: ['is_recurring'] },
    ],
  },

  // Room bookings table (alias for meeting_bookings for backward compatibility)
  room_bookings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'room_id', type: 'uuid', nullable: false, references: { table: 'meeting_rooms' } },
      { name: 'event_id', type: 'uuid', nullable: true, references: { table: 'calendar_events' } },
      { name: 'booked_by', type: 'string', nullable: false },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: false },
      { name: 'status', type: 'string', default: 'confirmed' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['room_id'] },
      { columns: ['start_time', 'end_time'] },
      { columns: ['status'] },
      { columns: ['event_id'] },
    ],
  },

  // Event attendees table
  event_attendees: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'email', type: 'string', nullable: true },
      { name: 'name', type: 'string', nullable: true },
      { name: 'status', type: 'string', default: 'pending' }, // pending, accepted, declined, tentative
      { name: 'response_message', type: 'text', nullable: true },
      { name: 'responded_at', type: 'timestamptz', nullable: true },
      { name: 'is_organizer', type: 'boolean', default: false },
      { name: 'is_required', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['user_id'] },
      { columns: ['status'] },
      { columns: ['event_id', 'user_id'], unique: true },
    ],
  },

  // Event reminders table
  event_reminders: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'reminder_time', type: 'integer', nullable: false }, // minutes before event
      { name: 'notification_type', type: 'string', default: 'email' }, // email, push, in-app
      { name: 'is_sent', type: 'boolean', default: false },
      { name: 'sent_at', type: 'timestamptz', nullable: true },
      { name: 'scheduled_for', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['user_id'] },
      { columns: ['is_sent'] },
      { columns: ['scheduled_for'] },
    ],
  },

  // Event bot assignments (linking bots to calendar events)
  event_bot_assignments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'user_id', type: 'string', nullable: false }, // Creator of the assignment (bot owner)
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'settings', type: 'jsonb', default: '{}' }, // Bot-specific settings for this event
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['bot_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['event_id', 'bot_id'], unique: true },
    ],
  },

  // Project bot assignments (linking bots to projects)
  project_bot_assignments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'user_id', type: 'string', nullable: false }, // Creator of the assignment (bot owner)
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'settings', type: 'jsonb', default: '{}' }, // Bot-specific settings for this project
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] },
      { columns: ['bot_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['project_id', 'bot_id'], unique: true },
    ],
  },

  // ==================== NOTES ====================
  notes: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'title', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'content_text', type: 'text', nullable: true },
      { name: 'parent_id', type: 'uuid', nullable: true, references: { table: 'notes' } },
      { name: 'author_id', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'last_edited_by', type: 'string', nullable: true },
      { name: 'position', type: 'integer', default: 0 },
      {
        name: 'template_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'note_templates' },
      },
      { name: 'view_count', type: 'integer', default: 0 },
      { name: 'is_published', type: 'boolean', default: false },
      { name: 'published_at', type: 'timestamptz', nullable: true },
      { name: 'slug', type: 'string', nullable: true },
      { name: 'cover_image', type: 'text', nullable: true },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'tags', type: 'jsonb', default: '[]' },
      {
        name: 'attachments',
        type: 'jsonb',
        default: '{"note_attachment": [], "file_attachment": [], "event_attachment": []}',
      },
      { name: 'is_template', type: 'boolean', default: false },
      { name: 'is_public', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'is_favorite', type: 'boolean', default: false },
      { name: 'collaborative_data', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['parent_id'] },
      { columns: ['is_favorite'] },
      { columns: ['is_published'] },
      { columns: ['is_template'] },
      { columns: ['template_id'] },
      { columns: ['slug'] },
      { columns: ['created_at'] },
    ],
  },

  note_templates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'content', type: 'text', nullable: false },
      { name: 'category', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'is_public', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['category'] },
      { columns: ['is_public'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== ACTIVITY LOGS ====================
  activity_logs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'action', type: 'string', nullable: false },
      { name: 'entity_type', type: 'string', nullable: false },
      { name: 'entity_id', type: 'uuid', nullable: false },
      { name: 'old_values', type: 'jsonb', nullable: true },
      { name: 'new_values', type: 'jsonb', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['action'] },
      { columns: ['entity_type'] },
      { columns: ['entity_id'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== USER SETTINGS & AUTH TOKENS ====================
  user_settings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', unique: true, nullable: false },
      { name: 'theme', type: 'string', default: 'light' },
      { name: 'language', type: 'string', default: 'en' },
      { name: 'timezone', type: 'string', default: 'UTC' },
      { name: 'date_format', type: 'string', default: 'MM/dd/yyyy' },
      { name: 'time_format', type: 'string', default: '12h' },
      { name: 'notifications', type: 'jsonb', default: '{}' },
      { name: 'privacy', type: 'jsonb', default: '{}' },
      { name: 'editor_preferences', type: 'jsonb', default: '{}' },
      { name: 'dashboard_layout', type: 'jsonb', default: '{}' },
      { name: 'sidebar_collapsed', type: 'boolean', default: false },
      // { name: 'tab_arrangement', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'], unique: true },
      { columns: ['theme'] },
      { columns: ['language'] },
      { columns: ['created_at'] },
    ],
  },

  password_reset_tokens: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'token', type: 'string', unique: true, nullable: false },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'is_used', type: 'boolean', default: false },
      { name: 'used_at', type: 'timestamptz', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['token'], unique: true },
      { columns: ['expires_at'] },
      { columns: ['is_used'] },
    ],
  },

  email_verification_tokens: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'email', type: 'string', nullable: false },
      { name: 'token', type: 'string', unique: true, nullable: false },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'is_verified', type: 'boolean', default: false },
      { name: 'verified_at', type: 'timestamptz', nullable: true },
      { name: 'attempts', type: 'integer', default: 0 },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['email'] },
      { columns: ['token'], unique: true },
      { columns: ['expires_at'] },
      { columns: ['is_verified'] },
    ],
  },
  // ==================== ENHANCED FEATURES ====================
  task_dependencies: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'depends_on_task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'dependency_type', type: 'string', default: 'blocks' },
      { name: 'lag_days', type: 'integer', default: 0 },
      { name: 'is_critical_path', type: 'boolean', default: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id', 'depends_on_task_id'], unique: true },
      { columns: ['task_id'] },
      { columns: ['depends_on_task_id'] },
      { columns: ['dependency_type'] },
      { columns: ['is_critical_path'] },
    ],
  },

  integration_logs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'integration_type', type: 'string', nullable: false },
      { name: 'action', type: 'string', nullable: false },
      { name: 'direction', type: 'string', nullable: false },
      { name: 'status', type: 'string', nullable: false },
      { name: 'request_data', type: 'jsonb', nullable: true },
      { name: 'response_data', type: 'jsonb', nullable: true },
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'error_code', type: 'string', nullable: true },
      { name: 'retry_count', type: 'integer', default: 0 },
      { name: 'max_retries', type: 'integer', default: 3 },
      { name: 'next_retry_at', type: 'timestamptz', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'triggered_by', type: 'string', nullable: true },
      { name: 'entity_type', type: 'string', nullable: true },
      { name: 'entity_id', type: 'uuid', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['integration_type'] },
      { columns: ['status'] },
      { columns: ['action'] },
      { columns: ['created_at'] },
      { columns: ['entity_type', 'entity_id'] },
    ],
  },

  user_activity_logs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'session_id', type: 'string', nullable: true },
      { name: 'action', type: 'string', nullable: false },
      { name: 'category', type: 'string', nullable: false },
      { name: 'details', type: 'string', nullable: true },
      { name: 'entity_type', type: 'string', nullable: true },
      { name: 'entity_id', type: 'uuid', nullable: true },
      { name: 'previous_values', type: 'jsonb', nullable: true },
      { name: 'new_values', type: 'jsonb', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'referer', type: 'string', nullable: true },
      { name: 'duration_ms', type: 'integer', nullable: true },
      { name: 'device_info', type: 'jsonb', nullable: true },
      { name: 'location_info', type: 'jsonb', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['action'] },
      { columns: ['category'] },
      { columns: ['entity_type', 'entity_id'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== AI SERVICES ====================
  ai_generations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'service_type', type: 'string', nullable: false },
      { name: 'prompt', type: 'text', nullable: false },
      { name: 'response', type: 'text', nullable: true },
      { name: 'parameters', type: 'jsonb', default: '{}' },
      { name: 'usage', type: 'jsonb', default: '{}' },
      { name: 'status', type: 'string', default: 'completed' },
      { name: 'error', type: 'text', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['service_type'] },
      { columns: ['status'] },
      { columns: ['created_at'] },
    ],
  },

  ai_usage_stats: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', unique: true, nullable: false },
      { name: 'total_requests', type: 'integer', default: 0 },
      { name: 'tokens_used', type: 'bigint', default: 0 },
      { name: 'images_generated', type: 'integer', default: 0 },
      { name: 'characters_translated', type: 'bigint', default: 0 },
      { name: 'last_reset', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'], unique: true },
      { columns: ['total_requests'] },
      { columns: ['last_reset'] },
    ],
  },

  chat_sessions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'title', type: 'string', default: 'New Chat' },
      { name: 'context', type: 'string', nullable: true },
      { name: 'personality', type: 'string', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['user_id'] }, { columns: ['created_at'] }, { columns: ['updated_at'] }],
  },

  chat_messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'session_id', type: 'uuid', nullable: false, references: { table: 'chat_sessions' } },
      { name: 'role', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'timestamp', type: 'timestamptz', default: 'now()' },
      { name: 'metadata', type: 'jsonb', default: '{}' },
    ],
    indexes: [{ columns: ['session_id'] }, { columns: ['timestamp'] }, { columns: ['role'] }],
  },

  // ==================== VIDEO CALLS ====================
  video_calls: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'livekit_room_id', type: 'string', nullable: false },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'host_user_id', type: 'string', nullable: false },
      { name: 'call_type', type: 'string', nullable: false, default: 'video' }, // 'audio' | 'video'
      { name: 'is_group_call', type: 'boolean', default: false },
      { name: 'status', type: 'string', default: 'scheduled' }, // 'scheduled' | 'active' | 'ended' | 'cancelled'
      { name: 'is_recording', type: 'boolean', default: false },
      { name: 'scheduled_start_time', type: 'timestamptz', nullable: true },
      { name: 'scheduled_end_time', type: 'timestamptz', nullable: true },
      { name: 'actual_start_time', type: 'timestamptz', nullable: true },
      { name: 'actual_end_time', type: 'timestamptz', nullable: true },
      { name: 'invitees', type: 'jsonb', default: '[]' }, // Array of user IDs (host + attendees)
      { name: 'settings', type: 'jsonb', default: '{}' }, // videoQuality, maxParticipants, etc.
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['host_user_id'] },
      { columns: ['status'] },
      { columns: ['call_type'] },
      { columns: ['livekit_room_id'], unique: true },
      { columns: ['scheduled_start_time'] },
      { columns: ['actual_start_time'] },
      { columns: ['created_at'] },
    ],
  },

  video_call_join_requests: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'display_name', type: 'string', nullable: false },
      { name: 'message', type: 'text', nullable: true },
      { name: 'status', type: 'string', default: 'pending' }, // 'pending' | 'accepted' | 'rejected'
      { name: 'requested_at', type: 'timestamptz', default: 'now()' },
      { name: 'responded_at', type: 'timestamptz', nullable: true },
      { name: 'responded_by', type: 'string', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
    ],
    indexes: [
      { columns: ['video_call_id'] },
      { columns: ['user_id'] },
      { columns: ['status'] },
      { columns: ['requested_at'] },
      { columns: ['video_call_id', 'user_id'], unique: true },
    ],
  },

  video_call_participants: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'livekit_participant_id', type: 'string', nullable: true },
      { name: 'display_name', type: 'string', nullable: true },
      { name: 'role', type: 'string', default: 'participant' }, // 'host' | 'participant'
      { name: 'status', type: 'string', default: 'invited' }, // 'invited' | 'declined' | 'joined' | 'left'
      { name: 'joined_at', type: 'timestamptz', nullable: true },
      { name: 'left_at', type: 'timestamptz', nullable: true },
      { name: 'duration_seconds', type: 'integer', default: 0 },
      { name: 'is_audio_muted', type: 'boolean', default: false },
      { name: 'is_video_muted', type: 'boolean', default: false },
      { name: 'is_screen_sharing', type: 'boolean', default: false },
      { name: 'is_hand_raised', type: 'boolean', default: false },
      { name: 'connection_quality', type: 'string', nullable: true }, // 'excellent' | 'good' | 'poor'
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['video_call_id'] },
      { columns: ['user_id'] },
      { columns: ['video_call_id', 'user_id'] },
      { columns: ['joined_at'] },
      { columns: ['left_at'] },
      { columns: ['status'] },
    ],
  },

  video_call_recordings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'livekit_recording_id', type: 'string', nullable: false },
      { name: 'recording_url', type: 'text', nullable: true },
      { name: 'transcript_url', type: 'text', nullable: true },
      { name: 'duration_seconds', type: 'integer', default: 0 },
      { name: 'file_size_bytes', type: 'bigint', default: 0 },
      { name: 'status', type: 'string', default: 'recording' }, // 'recording' | 'processing' | 'completed' | 'failed'
      { name: 'started_at', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['video_call_id'] },
      { columns: ['livekit_recording_id'], unique: true },
      { columns: ['status'] },
      { columns: ['created_at'] },
    ],
  },

  video_call_transcripts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'full_text', type: 'text', nullable: false },
      { name: 'segments', type: 'jsonb', default: '[]' }, // Array of transcript segments with speaker, timestamp
      { name: 'language', type: 'string', default: 'en' },
      { name: 'duration_seconds', type: 'integer', default: 0 },
      { name: 'word_count', type: 'integer', default: 0 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['video_call_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
    ],
  },

  meeting_summaries: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'video_call_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'video_calls' },
      },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'summary', type: 'text', nullable: false },
      { name: 'key_points', type: 'jsonb', default: '[]' }, // Array of key discussion points
      { name: 'action_items', type: 'jsonb', default: '[]' }, // Array of { task, assignee, deadline, status }
      { name: 'decisions', type: 'jsonb', default: '[]' }, // Array of decisions made
      { name: 'topics_discussed', type: 'jsonb', default: '[]' }, // Array of topics/themes
      { name: 'sentiment', type: 'string', nullable: true }, // 'positive' | 'neutral' | 'negative'
      { name: 'participants', type: 'jsonb', default: '[]' }, // Array of participant names
      { name: 'generated_by', type: 'string', default: 'ai' }, // 'ai' | 'manual'
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['video_call_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== SEARCH HISTORY ====================
  search_history: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'query', type: 'string', nullable: false },
      { name: 'result_count', type: 'integer', default: 0 },
      { name: 'content_types', type: 'jsonb', default: '[]' }, // types searched
      { name: 'filters', type: 'jsonb', default: '{}' }, // applied filters
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
      { columns: ['query'] },
    ],
  },

  // Saved Searches - User-saved search queries with filters and results
  saved_searches: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: false }, // User-defined name for the saved search
      { name: 'query', type: 'string', nullable: false }, // The search query
      { name: 'type', type: 'string', nullable: false }, // Search type: all, messages, files, etc.
      { name: 'mode', type: 'string', nullable: false }, // Search mode: full-text, semantic, hybrid
      { name: 'filters', type: 'jsonb', default: '{}' }, // Applied filters
      { name: 'results_snapshot', type: 'jsonb', default: '[]' }, // Snapshot of search results at time of saving
      { name: 'result_count', type: 'integer', default: 0 }, // Number of results when saved
      { name: 'tags', type: 'jsonb', default: '[]' }, // User tags for organization
      { name: 'is_notification_enabled', type: 'boolean', default: false }, // Enable notifications for new results
      { name: 'shared_with', type: 'jsonb', default: '[]' }, // Array of user IDs this search is shared with
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== NOTIFICATIONS SYSTEM ====================
  notifications: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
      { name: 'type', type: 'string', nullable: false }, // SYSTEM, REMINDER, PROJECT, TASK, CALENDAR, FILE, MESSAGE, etc.
      { name: 'title', type: 'string', nullable: false },
      { name: 'message', type: 'text', nullable: true },
      { name: 'data', type: 'jsonb', default: '{}' }, // Additional metadata
      { name: 'action_url', type: 'string', nullable: true }, // Click action URL
      { name: 'priority', type: 'string', default: 'normal' }, // low, normal, high, urgent
      { name: 'category', type: 'string', nullable: true }, // projects, tasks, calendar, files, messages, etc.
      { name: 'entity_type', type: 'string', nullable: true }, // project, task, event, file, message
      { name: 'entity_id', type: 'uuid', nullable: true }, // ID of the related entity
      { name: 'actor_id', type: 'string', nullable: true }, // User who triggered the notification
      { name: 'is_read', type: 'boolean', default: false },
      { name: 'is_archived', type: 'boolean', default: false },
      { name: 'read_at', type: 'timestamptz', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      // Scheduled notification fields
      { name: 'scheduled_at', type: 'timestamptz', nullable: true }, // When to send the notification (null = send immediately)
      { name: 'is_scheduled', type: 'boolean', default: false }, // Whether this is a scheduled notification
      { name: 'is_sent', type: 'boolean', default: false }, // Whether the scheduled notification has been sent
      { name: 'sent_at', type: 'timestamptz', nullable: true }, // When the notification was actually sent
      { name: 'schedule_status', type: 'string', default: 'pending' }, // pending, sent, failed, cancelled
      { name: 'retry_count', type: 'integer', default: 0 }, // Number of retry attempts for failed sends
      { name: 'max_retries', type: 'integer', default: 3 }, // Maximum retry attempts
      { name: 'last_retry_at', type: 'timestamptz', nullable: true }, // Last retry attempt timestamp
      { name: 'failure_reason', type: 'text', nullable: true }, // Reason for failure if any
      { name: 'sent_via', type: 'jsonb', default: '{}' }, // Channels used
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['type'] },
      { columns: ['category'] },
      { columns: ['is_read'] },
      { columns: ['is_archived'] },
      { columns: ['priority'] },
      { columns: ['entity_type', 'entity_id'] },
      { columns: ['user_id', 'is_read'] },
      { columns: ['user_id', 'workspace_id', 'is_read'] },
      { columns: ['created_at'] },
      { columns: ['expires_at'] },
      // Scheduled notification indexes for efficient cron job queries
      { columns: ['scheduled_at'] },
      { columns: ['is_scheduled', 'is_sent'] },
      { columns: ['is_scheduled', 'schedule_status'] },
      { columns: ['scheduled_at', 'is_sent', 'schedule_status'] }, // Composite index for pending scheduled notifications
    ],
  },

  notification_preferences: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', unique: true, nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
      { name: 'global_enabled', type: 'boolean', default: true },
      { name: 'in_app_enabled', type: 'boolean', default: true },
      { name: 'email_enabled', type: 'boolean', default: true },
      { name: 'push_enabled', type: 'boolean', default: true },
      { name: 'sound_enabled', type: 'boolean', default: true },
      { name: 'do_not_disturb', type: 'boolean', default: false },
      { name: 'quiet_hours_start', type: 'time', nullable: true }, // e.g., '22:00:00'
      { name: 'quiet_hours_end', type: 'time', nullable: true }, // e.g., '08:00:00'
      { name: 'frequency', type: 'string', default: 'immediate' }, // immediate, digest, daily, weekly
      { name: 'digest_time', type: 'time', nullable: true }, // Time for digest delivery
      { name: 'categories', type: 'jsonb', default: {} },
      { name: 'muted_workspaces', type: 'jsonb', default: [] }, // Array of workspace IDs
      { name: 'muted_projects', type: 'jsonb', default: [] }, // Array of project IDs
      { name: 'muted_channels', type: 'jsonb', default: [] }, // Array of channel IDs
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['do_not_disturb'] },
      { columns: ['created_at'] },
    ],
  },

  push_subscriptions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'endpoint', type: 'text', unique: true, nullable: false },
      { name: 'keys', type: 'jsonb', nullable: true }, // p256dh and auth keys
      { name: 'device_type', type: 'string', nullable: true }, // desktop, mobile, tablet
      { name: 'browser', type: 'string', nullable: true },
      { name: 'os', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_used_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['endpoint'], unique: true },
      { columns: ['is_active'] },
      { columns: ['last_used_at'] },
    ],
  },

  // FCM Device Tokens for Flutter mobile app
  device_tokens: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'fcm_token', type: 'text', unique: true, nullable: false },
      { name: 'platform', type: 'string', nullable: false }, // android or ios
      { name: 'device_name', type: 'string', nullable: true },
      { name: 'device_id', type: 'string', nullable: true }, // Unique device identifier
      { name: 'app_version', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_used_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['fcm_token'], unique: true },
      { columns: ['platform'] },
      { columns: ['is_active'] },
      { columns: ['user_id', 'is_active'] },
      { columns: ['last_used_at'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== GOOGLE DRIVE INTEGRATION ====================
  // User-specific connection within workspace: Each user connects their own Google Drive
  // Any workspace member can connect/disconnect their own Google Drive
  google_drive_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this Google Drive
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'google_email', type: 'string', nullable: true },
      { name: 'google_name', type: 'string', nullable: true },
      { name: 'google_picture', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['google_email'] },
    ],
  },

  // ==================== DROPBOX INTEGRATION ====================
  // User-specific connection within workspace: Each user connects their own Dropbox
  // Any workspace member can connect/disconnect their own Dropbox
  dropbox_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this Dropbox
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'account_id', type: 'string', nullable: true }, // Dropbox account ID
      { name: 'dropbox_email', type: 'string', nullable: true },
      { name: 'dropbox_name', type: 'string', nullable: true },
      { name: 'dropbox_picture', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['dropbox_email'] },
      { columns: ['account_id'] },
    ],
  },

  // ==================== YOUTUBE INTEGRATION ====================
  // User-specific YouTube connection within workspace
  youtube_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected YouTube
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'google_user_id', type: 'string', nullable: true }, // Google account ID
      { name: 'google_email', type: 'string', nullable: true },
      { name: 'google_name', type: 'string', nullable: true },
      { name: 'google_picture', type: 'text', nullable: true },
      { name: 'channel_id', type: 'string', nullable: true }, // YouTube channel ID
      { name: 'channel_title', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true },
      { columns: ['is_active'] },
      { columns: ['google_email'] },
      { columns: ['channel_id'] },
    ],
  },

  // ==================== SLACK INTEGRATION ====================
  // User-specific Slack connection within workspace
  slack_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this Slack
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'team_id', type: 'string', nullable: true }, // Slack team/workspace ID
      { name: 'team_name', type: 'string', nullable: true },
      { name: 'slack_user_id', type: 'string', nullable: true }, // Slack user ID
      { name: 'slack_email', type: 'string', nullable: true },
      { name: 'slack_name', type: 'string', nullable: true },
      { name: 'slack_picture', type: 'text', nullable: true },
      { name: 'bot_user_id', type: 'string', nullable: true }, // Bot user ID if using bot token
      { name: 'bot_access_token', type: 'text', nullable: true }, // Bot token for sending messages
      { name: 'incoming_webhook_url', type: 'text', nullable: true }, // Webhook URL
      { name: 'incoming_webhook_channel', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['team_id'] },
      { columns: ['slack_user_id'] },
    ],
  },

  // ==================== TWITTER/X INTEGRATION ====================
  // User-specific Twitter connection within workspace
  twitter_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this Twitter
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'twitter_user_id', type: 'string', nullable: true }, // Twitter user ID
      { name: 'twitter_username', type: 'string', nullable: true }, // @handle
      { name: 'twitter_name', type: 'string', nullable: true }, // Display name
      { name: 'twitter_picture', type: 'text', nullable: true },
      { name: 'twitter_verified', type: 'boolean', default: false },
      { name: 'followers_count', type: 'integer', default: 0 },
      { name: 'following_count', type: 'integer', default: 0 },
      { name: 'tweet_count', type: 'integer', default: 0 },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['twitter_user_id'] },
      { columns: ['twitter_username'] },
    ],
  },

  // ==================== TELEGRAM INTEGRATION ====================
  // User-specific Telegram bot connection within workspace (Bot Token based, not OAuth)
  telegram_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this Telegram bot
      { name: 'bot_token', type: 'text', nullable: false }, // Telegram bot token from @BotFather (should be encrypted)
      { name: 'bot_id', type: 'string', nullable: false }, // Telegram bot ID
      { name: 'bot_username', type: 'string', nullable: false }, // Bot username (without @)
      { name: 'bot_name', type: 'string', nullable: true }, // Bot display name
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['bot_id'] },
      { columns: ['bot_username'] },
    ],
  },

  // ==================== OPENAI INTEGRATION ====================
  // User-specific OpenAI connection within workspace (API key based, not OAuth)
  openai_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this OpenAI
      { name: 'api_key', type: 'text', nullable: false }, // OpenAI API key (should be encrypted in production)
      { name: 'organization_id', type: 'string', nullable: true }, // OpenAI organization ID (optional)
      { name: 'is_validated', type: 'boolean', default: false }, // Whether API key has been validated
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_used_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
    ],
  },

  // ==================== SENDGRID INTEGRATION ====================
  // User-specific SendGrid connection within workspace (API key based, not OAuth)
  sendgrid_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected this SendGrid
      { name: 'api_key', type: 'text', nullable: false }, // Encrypted SendGrid API key
      { name: 'sender_email', type: 'string', nullable: false }, // Default sender email
      { name: 'sender_name', type: 'string', nullable: true }, // Default sender name
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['sender_email'] },
    ],
  },

  // ==================== EMAIL CONNECTIONS ====================
  // Supports both OAuth (Gmail) and SMTP/IMAP providers
  email_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'provider', type: 'string', nullable: false, default: 'gmail' }, // 'gmail' | 'smtp_imap'
      // OAuth fields (for Gmail)
      { name: 'access_token', type: 'text', nullable: true },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      // SMTP fields (for sending emails)
      { name: 'smtp_host', type: 'string', nullable: true },
      { name: 'smtp_port', type: 'integer', nullable: true },
      { name: 'smtp_secure', type: 'boolean', default: true }, // true for SSL/TLS
      { name: 'smtp_user', type: 'string', nullable: true },
      { name: 'smtp_password', type: 'text', nullable: true }, // encrypted
      // IMAP fields (for receiving emails)
      { name: 'imap_host', type: 'string', nullable: true },
      { name: 'imap_port', type: 'integer', nullable: true },
      { name: 'imap_secure', type: 'boolean', default: true }, // true for SSL/TLS
      { name: 'imap_user', type: 'string', nullable: true },
      { name: 'imap_password', type: 'text', nullable: true }, // encrypted
      // Common fields
      { name: 'email_address', type: 'string', nullable: true },
      { name: 'display_name', type: 'string', nullable: true },
      { name: 'profile_picture', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'notifications_enabled', type: 'boolean', default: true },
      { name: 'auto_create_events', type: 'boolean', default: false }, // Auto-create calendar events from emails
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'last_history_id', type: 'string', nullable: true }, // Gmail history ID
      { name: 'last_uid', type: 'string', nullable: true }, // IMAP last processed UID
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      // Changed: Allow multiple connections per provider, but same email can't be added twice
      { columns: ['workspace_id', 'user_id', 'email_address'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['provider'] },
      { columns: ['is_active'] },
      { columns: ['notifications_enabled'] },
      { columns: ['email_address'] },
    ],
  },

  // ==================== EMAIL PRIORITIES ====================
  // Stores AI-analyzed email priorities for syncing between frontend and mobile
  email_priorities: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      {
        name: 'connection_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'email_connections' },
      },
      { name: 'email_id', type: 'string', nullable: false }, // Gmail/IMAP message ID
      { name: 'level', type: 'string', nullable: false }, // 'high' | 'medium' | 'low' | 'none'
      { name: 'score', type: 'integer', nullable: false }, // 0-10 scale
      { name: 'reason', type: 'text', nullable: true },
      { name: 'factors', type: 'jsonb', default: '[]' }, // Array of factor strings
      { name: 'analyzed_at', type: 'timestamptz', default: 'now()' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id', 'email_id'], unique: true },
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['connection_id'] },
      { columns: ['email_id'] },
      { columns: ['level'] },
      { columns: ['analyzed_at'] },
    ],
  },

  // ==================== GOOGLE CALENDAR CONNECTIONS ====================
  // User-specific connection within workspace: Each user connects their own Google Calendar
  google_calendar_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'google_email', type: 'string', nullable: true },
      { name: 'google_name', type: 'string', nullable: true },
      { name: 'google_picture', type: 'text', nullable: true },
      { name: 'calendar_id', type: 'string', default: 'primary' }, // Deprecated: use selected_calendars instead
      { name: 'selected_calendars', type: 'jsonb', default: '[]' }, // Array of {id, name, color, primary} objects
      { name: 'available_calendars', type: 'jsonb', default: '[]' }, // All available calendars from Google
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'sync_token', type: 'text', nullable: true }, // Deprecated: sync tokens now per-calendar
      { name: 'calendar_sync_tokens', type: 'jsonb', default: '{}' }, // Map of calendarId -> syncToken
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true },
      { columns: ['is_active'] },
      { columns: ['google_email'] },
    ],
  },

  // ==================== GITHUB CONNECTIONS ====================
  // User-specific GitHub connection within workspace
  github_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who connected GitHub
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true }, // GitHub App tokens may have refresh
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true }, // GitHub OAuth tokens don't expire by default
      { name: 'github_id', type: 'string', nullable: true }, // GitHub user ID
      { name: 'github_login', type: 'string', nullable: true }, // GitHub username
      { name: 'github_name', type: 'string', nullable: true },
      { name: 'github_email', type: 'string', nullable: true },
      { name: 'github_avatar', type: 'text', nullable: true },
      { name: 'installation_id', type: 'string', nullable: true }, // GitHub App installation ID
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true }, // One connection per user per workspace
      { columns: ['is_active'] },
      { columns: ['github_login'] },
    ],
  },

  // ==================== GITHUB ISSUE LINKS ====================
  // Links GitHub issues/PRs to Deskive project tasks
  github_issue_links: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      {
        name: 'github_connection_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'github_connections' },
      },
      // GitHub issue/PR details
      { name: 'issue_type', type: 'string', nullable: false }, // 'issue' | 'pull_request'
      { name: 'issue_number', type: 'integer', nullable: false },
      { name: 'issue_id', type: 'string', nullable: false }, // GitHub's internal issue ID
      { name: 'repo_owner', type: 'string', nullable: false },
      { name: 'repo_name', type: 'string', nullable: false },
      { name: 'repo_full_name', type: 'string', nullable: false },
      { name: 'title', type: 'string', nullable: false },
      { name: 'state', type: 'string', nullable: false }, // 'open' | 'closed' | 'merged'
      { name: 'html_url', type: 'text', nullable: false },
      { name: 'author_login', type: 'string', nullable: true },
      { name: 'author_avatar', type: 'text', nullable: true },
      { name: 'labels', type: 'jsonb', default: '[]' }, // Array of {name, color}
      { name: 'created_at_github', type: 'timestamptz', nullable: true },
      { name: 'updated_at_github', type: 'timestamptz', nullable: true },
      { name: 'closed_at_github', type: 'timestamptz', nullable: true },
      { name: 'merged_at_github', type: 'timestamptz', nullable: true }, // For PRs only
      // Sync settings
      { name: 'auto_update_task_status', type: 'boolean', default: false }, // Auto-complete task when issue closes
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'linked_by', type: 'string', nullable: false }, // User who created the link
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['task_id'] },
      { columns: ['github_connection_id'] },
      { columns: ['repo_full_name', 'issue_number'], unique: false }, // For finding by repo+issue
      { columns: ['task_id', 'repo_full_name', 'issue_number'], unique: true }, // Prevent duplicate links
      { columns: ['state'] },
      { columns: ['issue_type'] },
    ],
  },

  // ==================== GOOGLE SHEETS CONNECTIONS ====================
  // User-specific Google Sheets connection within workspace
  google_sheets_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'access_token', type: 'text', nullable: false },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'google_email', type: 'string', nullable: true },
      { name: 'google_name', type: 'string', nullable: true },
      { name: 'google_picture', type: 'text', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'], unique: true },
      { columns: ['is_active'] },
      { columns: ['google_email'] },
    ],
  },

  // ==================== GOOGLE SHEETS SYNCS ====================
  // Sync configurations for importing/exporting data between Deskive and Google Sheets
  google_sheets_syncs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      {
        name: 'connection_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'google_sheets_connections' },
      },
      { name: 'spreadsheet_id', type: 'string', nullable: false },
      { name: 'spreadsheet_name', type: 'string', nullable: false },
      { name: 'sheet_name', type: 'string', nullable: false },
      { name: 'sync_type', type: 'string', nullable: false }, // 'import' | 'export' | 'bidirectional'
      { name: 'deskive_entity', type: 'string', nullable: false }, // 'tasks' | 'contacts' | 'custom'
      { name: 'column_mapping', type: 'jsonb', default: '{}' },
      { name: 'sync_frequency', type: 'string', default: 'manual' }, // 'manual' | 'hourly' | 'daily'
      { name: 'last_sync_at', type: 'timestamptz', nullable: true },
      { name: 'last_sync_status', type: 'string', nullable: true }, // 'success' | 'failed' | 'in_progress'
      { name: 'last_sync_error', type: 'text', nullable: true },
      { name: 'last_row_count', type: 'integer', default: 0 },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['connection_id'] },
      { columns: ['spreadsheet_id'] },
      { columns: ['workspace_id', 'spreadsheet_id', 'sheet_name'], unique: true },
      { columns: ['sync_frequency'] },
      { columns: ['is_active'] },
    ],
  },

  // ==================== REQUEST & APPROVAL ====================
  // Request types define the different kinds of requests (leave, expense, purchase, etc.)
  request_types: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'icon', type: 'string', default: 'file-text' },
      { name: 'color', type: 'string', default: '#6366f1' },
      { name: 'fields_config', type: 'jsonb', default: '[]' }, // Custom fields definition
      { name: 'default_approvers', type: 'jsonb', default: '[]' }, // Default approver user IDs
      { name: 'require_all_approvers', type: 'boolean', default: false }, // All must approve vs any one
      { name: 'allow_attachments', type: 'boolean', default: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['is_active'] },
      { columns: ['created_by'] },
    ],
  },

  // Approval requests - the actual submitted requests
  approval_requests: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      {
        name: 'request_type_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'request_types' },
      },
      { name: 'requester_id', type: 'string', nullable: false },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'data', type: 'jsonb', default: '{}' }, // Custom field values
      { name: 'attachments', type: 'jsonb', default: '[]' }, // File attachments
      { name: 'status', type: 'string', default: 'pending' }, // pending, approved, rejected, cancelled
      { name: 'priority', type: 'string', default: 'normal' }, // low, normal, high, urgent
      { name: 'due_date', type: 'timestamptz', nullable: true },
      { name: 'approved_by', type: 'string', nullable: true },
      { name: 'approved_at', type: 'timestamptz', nullable: true },
      { name: 'rejected_by', type: 'string', nullable: true },
      { name: 'rejected_at', type: 'timestamptz', nullable: true },
      { name: 'rejection_reason', type: 'text', nullable: true },
      { name: 'cancelled_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['request_type_id'] },
      { columns: ['requester_id'] },
      { columns: ['status'] },
      { columns: ['priority'] },
      { columns: ['created_at'] },
      { columns: ['workspace_id', 'status'] },
    ],
  },

  // Approvers assigned to each request
  approval_request_approvers: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'request_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'approval_requests' },
      },
      { name: 'approver_id', type: 'string', nullable: false },
      { name: 'status', type: 'string', default: 'pending' }, // pending, approved, rejected
      { name: 'comments', type: 'text', nullable: true },
      { name: 'responded_at', type: 'timestamptz', nullable: true },
      { name: 'sort_order', type: 'integer', default: 0 }, // For sequential approvals
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['request_id'] },
      { columns: ['approver_id'] },
      { columns: ['status'] },
      { columns: ['request_id', 'approver_id'], unique: true },
    ],
  },

  // Comments on approval requests
  approval_request_comments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'request_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'approval_requests' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'is_internal', type: 'boolean', default: false }, // Internal notes only for approvers
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['request_id'] }, { columns: ['user_id'] }, { columns: ['created_at'] }],
  },

  // ==================== AUTOPILOT SESSIONS ====================
  // Stores AutoPilot AI assistant conversation sessions for persistence
  autopilot_sessions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'session_id', type: 'string', nullable: false }, // Unique session identifier
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'messages', type: 'jsonb', default: '[]' }, // Array of conversation messages
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['session_id'], unique: true },
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['updated_at'] },
    ],
  },

  // ==================== WHITEBOARD ====================
  // Collaborative whiteboard with Excalidraw integration
  whiteboards: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'elements', type: 'jsonb', default: '[]' }, // Excalidraw elements
      { name: 'app_state', type: 'jsonb', default: '{}' }, // Excalidraw app state
      { name: 'files', type: 'jsonb', default: '{}' }, // Excalidraw binary files
      { name: 'thumbnail_url', type: 'string', nullable: true }, // Preview image
      { name: 'is_public', type: 'boolean', default: false },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['is_public'] },
      { columns: ['created_at'] },
    ],
  },

  // Whiteboard collaborators for access control
  whiteboard_collaborators: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'whiteboard_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'whiteboards' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'permission', type: 'string', default: 'edit' }, // view, edit, admin
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['whiteboard_id'] },
      { columns: ['user_id'] },
      { columns: ['whiteboard_id', 'user_id'], unique: true },
    ],
  },

  // ==================== CHAT BOTS ====================
  // Custom bot builder for chat automation

  // Bot definitions
  bots: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false }, // Unique identifier (slug)
      { name: 'display_name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'avatar_url', type: 'string', nullable: true },
      { name: 'status', type: 'string', default: 'draft' }, // draft, active, inactive
      { name: 'bot_type', type: 'string', default: 'custom' }, // custom, ai_assistant, webhook
      { name: 'settings', type: 'jsonb', default: '{}' }, // rate_limit, response_delay, etc.
      { name: 'permissions', type: 'jsonb', default: '[]' }, // Allowed actions
      { name: 'webhook_secret', type: 'string', nullable: true }, // For webhook bots
      { name: 'is_public', type: 'boolean', default: false }, // Shareable across workspaces
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['workspace_id', 'name'], unique: true },
      { columns: ['status'] },
      { columns: ['bot_type'] },
      { columns: ['created_by'] },
      { columns: ['is_public'] },
    ],
  },

  // Bot triggers - when bot activates
  bot_triggers: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'trigger_type', type: 'string', nullable: false }, // keyword, regex, schedule, webhook, mention, any_message
      { name: 'trigger_config', type: 'jsonb', default: '{}' }, // Type-specific configuration
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'priority', type: 'integer', default: 0 }, // Higher = runs first
      { name: 'cooldown_seconds', type: 'integer', default: 0 }, // Per-user cooldown
      { name: 'conditions', type: 'jsonb', default: '{}' }, // Additional filters
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['bot_id'] },
      { columns: ['trigger_type'] },
      { columns: ['is_active'] },
      { columns: ['priority'] },
    ],
  },

  // Bot actions - what bot does when triggered
  bot_actions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'trigger_id', type: 'uuid', nullable: true, references: { table: 'bot_triggers' } }, // Optional link to specific trigger
      { name: 'name', type: 'string', nullable: false },
      { name: 'action_type', type: 'string', nullable: false }, // send_message, send_ai_message, create_task, create_event, call_webhook, send_email
      { name: 'action_config', type: 'jsonb', default: '{}' }, // Type-specific configuration
      { name: 'execution_order', type: 'integer', default: 0 }, // Order of execution
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'failure_policy', type: 'string', default: 'continue' }, // continue, stop, retry
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['bot_id'] },
      { columns: ['trigger_id'] },
      { columns: ['action_type'] },
      { columns: ['execution_order'] },
      { columns: ['is_active'] },
    ],
  },

  // Bot installations - where bot is installed (channels/DMs)
  bot_installations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'channel_id', type: 'uuid', nullable: true, references: { table: 'channels' } },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'conversations' },
      },
      { name: 'installed_by', type: 'string', nullable: false },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'settings_override', type: 'jsonb', default: '{}' }, // Per-installation overrides
      { name: 'installed_at', type: 'timestamptz', default: 'now()' },
      { name: 'uninstalled_at', type: 'timestamptz', nullable: true },
    ],
    indexes: [
      { columns: ['bot_id'] },
      { columns: ['channel_id'] },
      { columns: ['conversation_id'] },
      { columns: ['bot_id', 'channel_id'], unique: true },
      { columns: ['bot_id', 'conversation_id'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  // Bot execution logs - audit trail
  bot_execution_logs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'bot_id', type: 'uuid', nullable: false, references: { table: 'bots' } },
      { name: 'trigger_id', type: 'uuid', nullable: true, references: { table: 'bot_triggers' } },
      { name: 'action_id', type: 'uuid', nullable: true, references: { table: 'bot_actions' } },
      {
        name: 'installation_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'bot_installations' },
      },
      { name: 'channel_id', type: 'uuid', nullable: true },
      { name: 'conversation_id', type: 'uuid', nullable: true },
      { name: 'message_id', type: 'uuid', nullable: true },
      { name: 'triggered_by_user', type: 'string', nullable: true },
      { name: 'trigger_type', type: 'string', nullable: true },
      { name: 'trigger_data', type: 'jsonb', default: '{}' },
      { name: 'action_type', type: 'string', nullable: true },
      { name: 'action_input', type: 'jsonb', default: '{}' },
      { name: 'action_output', type: 'jsonb', default: '{}' },
      { name: 'status', type: 'string', default: 'pending' }, // pending, running, success, failed, skipped
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['bot_id'] },
      { columns: ['trigger_id'] },
      { columns: ['action_id'] },
      { columns: ['installation_id'] },
      { columns: ['status'] },
      { columns: ['created_at'] },
      { columns: ['triggered_by_user'] },
    ],
  },

  // Bot user cooldowns - per-user rate limiting
  bot_user_cooldowns: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'trigger_id', type: 'uuid', nullable: false, references: { table: 'bot_triggers' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'channel_id', type: 'uuid', nullable: true },
      { name: 'conversation_id', type: 'uuid', nullable: true },
      { name: 'last_triggered_at', type: 'timestamptz', default: 'now()' },
      { name: 'cooldown_until', type: 'timestamptz', nullable: false },
    ],
    indexes: [
      { columns: ['trigger_id', 'user_id', 'channel_id'] },
      { columns: ['trigger_id', 'user_id', 'conversation_id'] },
      { columns: ['cooldown_until'] },
    ],
  },

  // Bot scheduled jobs - cron trigger tracking
  bot_scheduled_jobs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'trigger_id', type: 'uuid', nullable: false, references: { table: 'bot_triggers' } },
      {
        name: 'installation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'bot_installations' },
      },
      { name: 'next_run_at', type: 'timestamptz', nullable: false },
      { name: 'last_run_at', type: 'timestamptz', nullable: true },
      { name: 'last_status', type: 'string', nullable: true }, // success, failed
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['trigger_id'] },
      { columns: ['installation_id'] },
      { columns: ['trigger_id', 'installation_id'], unique: true },
      { columns: ['next_run_at'] },
      { columns: ['is_active'] },
    ],
  },

  // ==================== SUBSCRIPTION MANAGEMENT ====================
  // Subscription and payment management is handled by database platform
  // Deskive queries subscription data via database (single source of truth)
  // No local subscription/payment tables needed

  // ==================== INTEGRATION FRAMEWORK ====================
  // Scalable integration system supporting 170+ third-party apps
  // Config-driven approach: Add new integrations via JSON config, not code

  // Integration Catalog - Available integrations in the marketplace
  integration_catalog: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'slug', type: 'string', nullable: false }, // e.g., 'google-drive', 'slack', 'notion'
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'category', type: 'string', nullable: false }, // COMMUNICATION, FILE_STORAGE, CALENDAR, etc.
      { name: 'provider', type: 'string', nullable: true }, // e.g., 'Google', 'Microsoft', 'Slack'
      { name: 'logo_url', type: 'text', nullable: true },
      { name: 'website', type: 'text', nullable: true },
      { name: 'documentation_url', type: 'text', nullable: true },
      { name: 'version', type: 'string', default: '1.0.0' },
      // Authentication Configuration (JSON with provider-specific settings)
      { name: 'auth_type', type: 'string', nullable: false }, // oauth2, oauth1, api_key, webhook_only, basic_auth
      { name: 'auth_config', type: 'jsonb', default: '{}' },
      // auth_config for OAuth2: { authorizationUrl, tokenUrl, revokeUrl, userInfoUrl, scopes, clientIdEnvKey, clientSecretEnvKey, extraAuthParams }
      // API Configuration
      { name: 'api_base_url', type: 'text', nullable: true },
      { name: 'api_config', type: 'jsonb', default: '{}' }, // { defaultHeaders, rateLimiting, retryConfig }
      // Webhook Configuration
      { name: 'supports_webhooks', type: 'boolean', default: false },
      { name: 'webhook_config', type: 'jsonb', default: '{}' }, // { events, signatureHeader, signatureAlgorithm }
      // Capabilities & Features
      { name: 'capabilities', type: 'jsonb', default: '[]' }, // ['read_files', 'write_files', 'send_messages']
      { name: 'required_permissions', type: 'jsonb', default: '[]' },
      { name: 'features', type: 'jsonb', default: '[]' }, // Human-readable feature list for UI
      { name: 'config_schema', type: 'jsonb', default: '{}' }, // JSON Schema for user configuration form
      { name: 'screenshots', type: 'jsonb', default: '[]' },
      // Marketplace Metadata
      { name: 'pricing_type', type: 'string', default: 'free' }, // free, freemium, paid
      { name: 'pricing_details', type: 'jsonb', default: '{}' },
      { name: 'is_verified', type: 'boolean', default: false },
      { name: 'is_featured', type: 'boolean', default: false },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'install_count', type: 'integer', default: 0 },
      { name: 'rating', type: 'numeric', nullable: true },
      { name: 'review_count', type: 'integer', default: 0 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['slug'], unique: true },
      { columns: ['category'] },
      { columns: ['auth_type'] },
      { columns: ['provider'] },
      { columns: ['is_active'] },
      { columns: ['is_featured'] },
      { columns: ['is_verified'] },
      { columns: ['install_count'] },
    ],
  },

  // Integration Connections - User connections to integrations (unified storage)
  integration_connections: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      {
        name: 'integration_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'integration_catalog' },
      },

      // Authentication Credentials (encrypted at rest)
      { name: 'auth_type', type: 'string', nullable: false }, // mirrors integration auth_type
      { name: 'access_token', type: 'text', nullable: true },
      { name: 'refresh_token', type: 'text', nullable: true },
      { name: 'token_type', type: 'string', default: 'Bearer' },
      { name: 'scope', type: 'text', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'api_key', type: 'text', nullable: true }, // For API key auth
      { name: 'credentials', type: 'jsonb', default: '{}' }, // Flexible field for other auth methods

      // Provider Account Info
      { name: 'external_id', type: 'string', nullable: true }, // Provider's user/account ID
      { name: 'external_email', type: 'string', nullable: true },
      { name: 'external_name', type: 'string', nullable: true },
      { name: 'external_avatar', type: 'text', nullable: true },
      { name: 'external_metadata', type: 'jsonb', default: '{}' },

      // Connection State
      { name: 'status', type: 'string', default: 'active' }, // active, expired, revoked, error
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'last_error_at', type: 'timestamptz', nullable: true },

      // User Configuration
      { name: 'config', type: 'jsonb', default: '{}' }, // User settings for this connection
      { name: 'settings', type: 'jsonb', default: '{}' },

      // Sync Tracking
      { name: 'last_synced_at', type: 'timestamptz', nullable: true },
      { name: 'sync_cursor', type: 'text', nullable: true }, // For incremental sync

      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['integration_id'] },
      { columns: ['workspace_id', 'user_id', 'integration_id'], unique: true },
      { columns: ['status'] },
      { columns: ['is_active'] },
      { columns: ['external_email'] },
      { columns: ['expires_at'] },
    ],
  },

  // Integration Webhooks - Webhook subscriptions for integrations
  integration_webhooks: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      {
        name: 'connection_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'integration_connections' },
      },
      {
        name: 'integration_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'integration_catalog' },
      },

      // Webhook Configuration
      { name: 'webhook_id', type: 'string', nullable: true }, // External webhook ID from provider
      { name: 'webhook_url', type: 'text', nullable: false }, // Our endpoint URL
      { name: 'secret', type: 'text', nullable: true }, // For signature verification
      { name: 'events', type: 'jsonb', default: '[]' }, // Subscribed events

      // Status & Health
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_received_at', type: 'timestamptz', nullable: true },
      { name: 'failure_count', type: 'integer', default: 0 },
      { name: 'last_failure_at', type: 'timestamptz', nullable: true },
      { name: 'last_failure_reason', type: 'text', nullable: true },

      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['connection_id'] },
      { columns: ['integration_id'] },
      { columns: ['webhook_id'] },
      { columns: ['is_active'] },
    ],
  },

  // Integration Sync History - Track sync operations
  integration_sync_history: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'connection_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'integration_connections' },
      },
      { name: 'sync_type', type: 'string', nullable: false }, // full, incremental, webhook
      { name: 'status', type: 'string', nullable: false }, // pending, running, completed, failed
      { name: 'started_at', type: 'timestamptz', default: 'now()' },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'items_processed', type: 'integer', default: 0 },
      { name: 'items_created', type: 'integer', default: 0 },
      { name: 'items_updated', type: 'integer', default: 0 },
      { name: 'items_deleted', type: 'integer', default: 0 },
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['connection_id'] },
      { columns: ['status'] },
      { columns: ['sync_type'] },
      { columns: ['started_at'] },
    ],
  },

  // ==================== PROJECT TEMPLATES ====================
  // System and user-created project templates for quick project setup
  project_templates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } }, // null for system templates
      { name: 'name', type: 'string', nullable: false },
      { name: 'slug', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'category', type: 'string', nullable: false }, // software_development, marketing, hr, etc.
      { name: 'icon', type: 'string', nullable: true }, // Icon name or emoji
      { name: 'color', type: 'string', nullable: true }, // Hex color for UI
      { name: 'structure', type: 'jsonb', nullable: false }, // Template structure with sections/tasks
      { name: 'project_type', type: 'string', default: 'kanban' }, // kanban, scrum, waterfall
      { name: 'kanban_stages', type: 'jsonb', nullable: true }, // Custom stages for this template
      { name: 'custom_fields', type: 'jsonb', default: '[]' }, // Custom field definitions
      { name: 'settings', type: 'jsonb', default: '{}' }, // Additional template settings
      { name: 'is_system', type: 'boolean', default: false }, // true for built-in templates
      { name: 'is_featured', type: 'boolean', default: false }, // Featured in gallery
      { name: 'usage_count', type: 'integer', default: 0 }, // Track popularity
      { name: 'created_by', type: 'string', nullable: true }, // null for system templates
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['category'] },
      { columns: ['slug'], unique: true },
      { columns: ['is_system'] },
      { columns: ['is_featured'] },
      { columns: ['usage_count'] },
      { columns: ['created_at'] },
    ],
  },

  // ===========================================
  // SUPER AGENT MEMORY TABLES
  // ===========================================

  /**
   * Agent Memory - Stores episodic, preference, and long-term memories for Super Agents
   * Enables agents to remember context, learn from interactions, and make intelligent decisions
   */
  agent_memory: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'agent_id', type: 'string', nullable: true }, // e.g., 'autopilot', 'project-agent', 'task-agent'
      { name: 'memory_type', type: 'string', nullable: false }, // 'episodic', 'preference', 'long_term', 'decision'
      { name: 'content', type: 'text', nullable: false },
      { name: 'summary', type: 'text', nullable: true }, // AI-generated summary for quick retrieval
      { name: 'context_type', type: 'string', nullable: true }, // 'task', 'chat', 'note', 'meeting', 'project', 'file'
      { name: 'context_id', type: 'uuid', nullable: true },
      { name: 'importance', type: 'integer', default: 5 }, // 1-10 scale
      { name: 'tags', type: 'jsonb', default: '[]' }, // Array of tags for filtering
      { name: 'metadata', type: 'jsonb', default: '{}' }, // Flexible metadata
      { name: 'embedding_id', type: 'string', nullable: true }, // Qdrant vector ID
      { name: 'expires_at', type: 'timestamptz', nullable: true }, // For time-limited memories
      { name: 'access_count', type: 'integer', default: 0 }, // Track retrieval frequency
      { name: 'last_accessed_at', type: 'timestamptz', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['workspace_id', 'agent_id'] },
      { columns: ['workspace_id', 'memory_type'] },
      { columns: ['context_type', 'context_id'] },
      { columns: ['importance'] },
      { columns: ['expires_at'] },
      { columns: ['is_active'] },
      { columns: ['created_at'] },
    ],
  },

  /**
   * Agent Memory Preferences - Stores learned user preferences and behavior patterns
   * Allows agents to personalize responses based on observed user patterns
   */
  agent_memory_preferences: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'preference_key', type: 'string', nullable: false }, // e.g., 'task_default_priority', 'preferred_meeting_time'
      { name: 'preference_value', type: 'jsonb', nullable: false },
      { name: 'confidence', type: 'numeric', default: 0.5 }, // 0-1 confidence score
      { name: 'learned_from', type: 'jsonb', default: '[]' }, // Array of memory IDs that contributed
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id', 'user_id', 'preference_key'], unique: true },
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['confidence'] },
    ],
  },
  // ==================== DOCUMENT BUILDER ====================
  // Document templates for proposals, contracts, invoices, and SOWs
  /**
   * Document Templates - Stores templates for proposals, contracts, invoices, and SOWs
   * workspace_id is nullable for system templates (available to all workspaces)
   */
  document_templates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'slug', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'document_type', type: 'string', nullable: false }, // 'proposal' | 'contract' | 'invoice' | 'sow'
      { name: 'category', type: 'string', nullable: true }, // 'sales' | 'legal' | 'freelance' | 'consulting'
      { name: 'icon', type: 'string', nullable: true },
      { name: 'color', type: 'string', nullable: true },
      { name: 'content', type: 'jsonb', nullable: false }, // Quill Delta format with placeholders
      { name: 'content_html', type: 'text', nullable: true }, // Pre-rendered HTML for preview
      { name: 'placeholders', type: 'jsonb', default: '[]' }, // [{key, label, type, required, defaultValue}]
      { name: 'signature_fields', type: 'jsonb', default: '[]' }, // [{id, label, required}]
      { name: 'settings', type: 'jsonb', default: '{}' }, // page_size, margins, header, footer, styling
      { name: 'is_system', type: 'boolean', default: false },
      { name: 'is_featured', type: 'boolean', default: false },
      { name: 'usage_count', type: 'integer', default: 0 },
      { name: 'created_by', type: 'string', nullable: true }, // null for system templates
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['document_type'] },
      { columns: ['category'] },
      { columns: ['slug'], unique: true },
      { columns: ['is_system'] },
      { columns: ['is_featured'] },
      { columns: ['is_deleted'] },
      { columns: ['usage_count'] },
      { columns: ['created_by'] },
      { columns: ['created_at'] },
    ],
  },
  /**
   * Documents - Document instances created from templates
   * Stores actual documents with filled content and signature status
   */
  documents: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      {
        name: 'template_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'document_templates' },
      },
      { name: 'document_number', type: 'string', nullable: false }, // e.g., 'PROP-2025-001', 'INV-2025-042'
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'document_type', type: 'string', nullable: false }, // 'proposal' | 'contract' | 'invoice' | 'sow'
      { name: 'content', type: 'jsonb', nullable: false }, // Quill Delta format (filled content)
      { name: 'content_html', type: 'text', nullable: true }, // Rendered HTML
      { name: 'content_text', type: 'text', nullable: true }, // Plain text for search
      { name: 'placeholder_values', type: 'jsonb', default: '{}' }, // Filled placeholder values
      { name: 'status', type: 'string', default: 'draft' }, // 'draft' | 'pending_signature' | 'partially_signed' | 'signed' | 'expired' | 'declined' | 'archived'
      { name: 'version', type: 'integer', default: 1 },
      {
        name: 'previous_version_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'documents' },
      },
      { name: 'settings', type: 'jsonb', default: '{}' }, // page_size, margins, styling overrides
      { name: 'expires_at', type: 'timestamptz', nullable: true }, // Document/signature expiration
      { name: 'signed_at', type: 'timestamptz', nullable: true }, // When all signatures collected
      { name: 'archived_at', type: 'timestamptz', nullable: true },
      { name: 'archived_by', type: 'string', nullable: true },
      { name: 'view_count', type: 'integer', default: 0 },
      { name: 'last_viewed_at', type: 'timestamptz', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'updated_by', type: 'string', nullable: true },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' }, // client_info, project_info, etc.
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['template_id'] },
      { columns: ['document_type'] },
      { columns: ['status'] },
      { columns: ['document_number'], unique: true },
      { columns: ['created_by'] },
      { columns: ['expires_at'] },
      { columns: ['is_deleted'] },
      { columns: ['workspace_id', 'status'] },
      { columns: ['workspace_id', 'document_type'] },
      { columns: ['created_at'] },
      { columns: ['updated_at'] },
    ],
  },
  /**
   * Document Recipients - People who need to sign or view documents
   * Tracks signing status and provides secure access tokens for external signers
   */
  document_recipients: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
      { name: 'user_id', type: 'string', nullable: true }, // Internal user (if applicable)
      { name: 'email', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'role', type: 'string', default: 'signer' }, // 'signer' | 'viewer' | 'approver' | 'cc'
      { name: 'signing_order', type: 'integer', default: 0 }, // Signing order (for sequential signing)
      { name: 'status', type: 'string', default: 'pending' }, // 'pending' | 'viewed' | 'signed' | 'declined' | 'expired'
      { name: 'access_token', type: 'string', unique: true, nullable: false }, // Secure token for external access
      { name: 'access_code', type: 'string', nullable: true }, // Optional PIN/access code
      { name: 'message', type: 'text', nullable: true }, // Personal message to recipient
      { name: 'viewed_at', type: 'timestamptz', nullable: true },
      { name: 'signed_at', type: 'timestamptz', nullable: true },
      { name: 'declined_at', type: 'timestamptz', nullable: true },
      { name: 'decline_reason', type: 'text', nullable: true },
      { name: 'reminder_sent_at', type: 'timestamptz', nullable: true },
      { name: 'reminder_count', type: 'integer', default: 0 },
      { name: 'ip_address', type: 'string', nullable: true }, // Captured at signing
      { name: 'user_agent', type: 'text', nullable: true }, // Captured at signing
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['document_id'] },
      { columns: ['user_id'] },
      { columns: ['email'] },
      { columns: ['status'] },
      { columns: ['access_token'], unique: true },
      { columns: ['document_id', 'email'], unique: true },
      { columns: ['signing_order'] },
      { columns: ['created_at'] },
    ],
  },
  /**
   * Document Signatures - Captured signatures for documents
   * Stores signature data (drawn or typed) with audit information
   */
  document_signatures: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
      {
        name: 'recipient_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'document_recipients' },
      },
      { name: 'signature_field_id', type: 'string', nullable: false }, // Matches signature_fields[].id in template
      { name: 'signature_type', type: 'string', nullable: false }, // 'drawn' | 'typed' | 'uploaded'
      { name: 'signature_data', type: 'text', nullable: false }, // Base64 image data or typed name
      { name: 'typed_name', type: 'string', nullable: true }, // If typed signature
      { name: 'font_family', type: 'string', nullable: true }, // Font used for typed signature
      { name: 'position_x', type: 'numeric', nullable: true }, // Position on page
      { name: 'position_y', type: 'numeric', nullable: true },
      { name: 'width', type: 'numeric', nullable: true },
      { name: 'height', type: 'numeric', nullable: true },
      { name: 'page_number', type: 'integer', default: 1 },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'device_info', type: 'jsonb', default: '{}' },
      { name: 'signed_at', type: 'timestamptz', default: 'now()' },
      { name: 'certificate_hash', type: 'string', nullable: true }, // For audit trail
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['document_id'] },
      { columns: ['recipient_id'] },
      { columns: ['signature_field_id'] },
      { columns: ['document_id', 'recipient_id', 'signature_field_id'], unique: true },
      { columns: ['signed_at'] },
      { columns: ['created_at'] },
    ],
  },
  /**
   * Document Activity Logs - Audit trail for all document actions
   * Tracks views, edits, signatures, and other document events
   */
  document_activity_logs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
      { name: 'user_id', type: 'string', nullable: true }, // null for external recipients
      {
        name: 'recipient_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'document_recipients' },
      },
      { name: 'action', type: 'string', nullable: false }, // 'created' | 'updated' | 'viewed' | 'signed' | 'declined' | 'sent' | 'reminded' | 'shared' | 'downloaded' | 'archived'
      { name: 'details', type: 'text', nullable: true },
      { name: 'old_values', type: 'jsonb', nullable: true },
      { name: 'new_values', type: 'jsonb', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['document_id'] },
      { columns: ['user_id'] },
      { columns: ['recipient_id'] },
      { columns: ['action'] },
      { columns: ['created_at'] },
      { columns: ['document_id', 'action'] },
    ],
  },
  /**
   * User Signatures - Saved signatures for users
   * Users can create multiple signatures (drawn, typed, uploaded) and reuse them
   */
  user_signatures: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // auth.users
      { name: 'name', type: 'string', nullable: false }, // e.g., "My Signature", "Formal", "Initials"
      { name: 'signature_type', type: 'string', nullable: false }, // 'drawn' | 'typed' | 'uploaded'
      { name: 'signature_data', type: 'text', nullable: false }, // Base64 image or typed text
      { name: 'typed_name', type: 'string', nullable: true }, // For typed signatures
      { name: 'font_family', type: 'string', nullable: true }, // For typed signatures
      { name: 'is_default', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['is_default'] },
      { columns: ['is_deleted'] },
      { columns: ['created_at'] },
    ],
  },
  // ==================== BUDGET MANAGEMENT ====================
  /**
   * Budgets - Main budget tracking for projects, tasks, phases
   * Supports multiple budget types with currency and alert thresholds
   */
  budgets: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'project_id', type: 'uuid', nullable: true, references: { table: 'projects' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'budget_type', type: 'string', nullable: false, default: 'project' }, // 'project' | 'task' | 'phase' | 'resource'
      { name: 'total_budget', type: 'numeric', nullable: false, default: 0 },
      { name: 'currency', type: 'string', nullable: false, default: 'USD' },
      { name: 'start_date', type: 'date', nullable: true },
      { name: 'end_date', type: 'date', nullable: true },
      { name: 'alert_threshold', type: 'numeric', nullable: false, default: 80 }, // Alert at 80%
      { name: 'status', type: 'string', nullable: false, default: 'active' }, // 'active' | 'exceeded' | 'completed' | 'archived'
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['project_id'] },
      { columns: ['created_by'] },
      { columns: ['status'] },
      { columns: ['is_deleted'] },
      { columns: ['workspace_id', 'project_id'] },
      { columns: ['start_date'] },
      { columns: ['end_date'] },
    ],
  },

  /**
   * Budget Categories - Organize budget into categories
   * Examples: labor, materials, software, travel, overhead
   */
  budget_categories: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'budget_id', type: 'uuid', nullable: false, references: { table: 'budgets' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'allocated_amount', type: 'numeric', nullable: false, default: 0 },
      { name: 'category_type', type: 'string', nullable: false, default: 'other' }, // 'labor' | 'materials' | 'software' | 'travel' | 'overhead' | 'other'
      { name: 'cost_nature', type: 'string', nullable: false, default: 'variable' }, // 'fixed' | 'variable'
      { name: 'color', type: 'string', nullable: true }, // For UI visualization
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['budget_id'] },
      { columns: ['category_type'] },
      { columns: ['cost_nature'] },
      { columns: ['is_deleted'] },
    ],
  },

  /**
   * Budget Expenses - Track all expenses against budgets
   * Links to tasks and categories, supports receipts
   */
  budget_expenses: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'budget_id', type: 'uuid', nullable: false, references: { table: 'budgets' } },
      {
        name: 'category_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'budget_categories' },
      },
      { name: 'task_id', type: 'uuid', nullable: true, references: { table: 'tasks' } },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'amount', type: 'numeric', nullable: false },
      { name: 'currency', type: 'string', nullable: false, default: 'USD' },
      { name: 'quantity', type: 'numeric', nullable: true, default: '1' },
      { name: 'unit_price', type: 'numeric', nullable: true },
      { name: 'unit_of_measure', type: 'string', nullable: true },
      { name: 'expense_type', type: 'string', nullable: false, default: 'manual' }, // 'time_tracked' | 'manual' | 'invoice' | 'purchase'
      { name: 'expense_date', type: 'date', nullable: false },
      { name: 'billable', type: 'boolean', nullable: false, default: true },
      { name: 'approved', type: 'boolean', nullable: false, default: false },
      { name: 'approved_by', type: 'string', nullable: true },
      { name: 'approved_at', type: 'timestamptz', nullable: true },
      { name: 'rejected', type: 'boolean', nullable: false, default: false },
      { name: 'rejection_reason', type: 'text', nullable: true },
      { name: 'rejected_at', type: 'timestamptz', nullable: true },
      { name: 'approval_request_id', type: 'uuid', nullable: true },
      { name: 'receipt_url', type: 'string', nullable: true },
      { name: 'receipt_file_name', type: 'string', nullable: true },
      { name: 'vendor', type: 'string', nullable: true },
      { name: 'invoice_number', type: 'string', nullable: true },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['budget_id'] },
      { columns: ['category_id'] },
      { columns: ['task_id'] },
      { columns: ['created_by'] },
      { columns: ['expense_date'] },
      { columns: ['expense_type'] },
      { columns: ['billable'] },
      { columns: ['approved'] },
      { columns: ['is_deleted'] },
      { columns: ['budget_id', 'expense_date'] },
    ],
  },

  /**
   * Billing Rates - Hourly rates for users and roles
   * Supports historical rate tracking with effective dates
   */
  billing_rates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: true }, // Specific user rate (null means role-based)
      { name: 'role', type: 'string', nullable: true }, // 'developer' | 'designer' | 'manager' | 'qa' | 'admin' | etc.
      { name: 'rate_name', type: 'string', nullable: true }, // Optional name for the rate
      { name: 'hourly_rate', type: 'numeric', nullable: false },
      { name: 'currency', type: 'string', nullable: false, default: 'USD' },
      { name: 'effective_from', type: 'date', nullable: false },
      { name: 'effective_to', type: 'date', nullable: true }, // null means currently active
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['role'] },
      { columns: ['is_active'] },
      { columns: ['is_deleted'] },
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['effective_from'] },
      { columns: ['effective_to'] },
    ],
  },

  /**
   * Time Entries - Track time spent on tasks
   * Automatically calculates billed amounts using billing rates
   */
  time_entries: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'start_time', type: 'timestamptz', nullable: false },
      { name: 'end_time', type: 'timestamptz', nullable: true },
      { name: 'duration_seconds', type: 'integer', nullable: false, default: 0 },
      { name: 'billable', type: 'boolean', nullable: false, default: true },
      { name: 'billing_rate', type: 'numeric', nullable: true }, // Cached rate at time of entry
      {
        name: 'billing_rate_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'billing_rates' },
      },
      { name: 'billed_amount', type: 'numeric', nullable: true }, // Auto-calculated
      { name: 'currency', type: 'string', nullable: false, default: 'USD' },
      { name: 'is_running', type: 'boolean', nullable: false, default: false },
      { name: 'is_approved', type: 'boolean', nullable: false, default: false },
      { name: 'approved_by', type: 'string', nullable: true },
      { name: 'approved_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['task_id'] },
      { columns: ['user_id'] },
      { columns: ['start_time'] },
      { columns: ['is_running'] },
      { columns: ['billable'] },
      { columns: ['is_approved'] },
      { columns: ['is_deleted'] },
      { columns: ['workspace_id', 'user_id'] },
      { columns: ['task_id', 'user_id'] },
    ],
  },

  /**
   * Task Budget Allocations - Category allocations for specific tasks
   * Links tasks to budget categories with allocated amounts
   * Used for task-level budget planning and expense tracking
   */
  task_budget_allocations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'budget_id', type: 'uuid', nullable: false, references: { table: 'budgets' } },
      {
        name: 'category_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'budget_categories' },
      },
      { name: 'allocated_amount', type: 'numeric', nullable: false, default: 0 },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id'] },
      { columns: ['budget_id'] },
      { columns: ['category_id'] },
      { columns: ['task_id', 'category_id'], unique: true }, // One allocation per task-category pair
    ],
  },

  /**
   * Task Assignee Rates - Hourly billing rates for assignees on specific tasks
   * Allows different rates for different team members on the same task
   */
  task_assignee_rates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'task_id', type: 'uuid', nullable: false, references: { table: 'tasks' } },
      { name: 'user_id', type: 'string', nullable: false }, // Assignee user ID
      { name: 'hourly_rate', type: 'numeric', nullable: false },
      { name: 'currency', type: 'string', nullable: false, default: 'USD' },
      { name: 'notes', type: 'text', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['task_id'] },
      { columns: ['user_id'] },
      { columns: ['task_id', 'user_id'], unique: true }, // One rate per task-assignee pair
    ],
  },

  /**
   * Budget Alerts - Notification history for budget thresholds
   * Tracks when budget alerts were sent to users
   */
  budget_alerts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'budget_id', type: 'uuid', nullable: false, references: { table: 'budgets' } },
      { name: 'alert_type', type: 'string', nullable: false }, // 'threshold_reached' | 'budget_exceeded' | 'approval_needed' | 'expense_approved' | 'expense_rejected'
      { name: 'threshold_percentage', type: 'numeric', nullable: true },
      { name: 'current_spent', type: 'numeric', nullable: true },
      { name: 'total_budget', type: 'numeric', nullable: true },
      { name: 'message', type: 'text', nullable: false },
      { name: 'sent_to', type: 'jsonb', nullable: false, default: '[]' }, // Array of user IDs
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'sent_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['budget_id'] }, { columns: ['alert_type'] }, { columns: ['sent_at'] }],
  },
  // ==================== AUTOPILOT PROACTIVE FEATURES ====================    /**     * Autopilot Briefings - Daily/weekly summaries for users     * Generated proactively to help users stay on top of their work     */
  autopilot_briefings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'briefing_type', type: 'string', nullable: false }, // 'daily', 'weekly', 'deadline_alert'
      { name: 'content', type: 'jsonb', nullable: false }, // { summary, tasks, events, highlights, recommendations }
      { name: 'generated_at', type: 'timestamptz', default: 'now()' },
      { name: 'is_read', type: 'boolean', default: false },
      { name: 'read_at', type: 'timestamptz', nullable: true },
      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
    ],
    indexes: [
      { columns: ['user_id', 'workspace_id'] },
      { columns: ['briefing_type'] },
      { columns: ['generated_at'] },
      { columns: ['is_read'] },
      { columns: ['expires_at'] },
    ],
  },
  /**     * Autopilot Alerts - Proactive deadline and reminder alerts     * Monitors tasks and events to alert users before deadlines     */
  autopilot_alerts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'alert_type', type: 'string', nullable: false }, // 'deadline_24h', 'deadline_3d', 'overdue', 'conflict', 'reminder'
      { name: 'entity_type', type: 'string', nullable: false }, // 'task', 'event', 'project'
      { name: 'entity_id', type: 'uuid', nullable: false },
      { name: 'priority', type: 'string', default: 'normal' }, // 'low', 'normal', 'high', 'urgent'
      { name: 'title', type: 'string', nullable: false },
      { name: 'message', type: 'text', nullable: false },
      { name: 'action_url', type: 'string', nullable: true },
      { name: 'is_sent', type: 'boolean', default: false },
      { name: 'sent_at', type: 'timestamptz', nullable: true },
      { name: 'is_dismissed', type: 'boolean', default: false },
      { name: 'dismissed_at', type: 'timestamptz', nullable: true },
      { name: 'metadata', type: 'jsonb', default: '{}' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id', 'workspace_id'] },
      { columns: ['alert_type'] },
      { columns: ['entity_type', 'entity_id'] },
      { columns: ['priority'] },
      { columns: ['is_sent'] },
      { columns: ['is_dismissed'] },
      { columns: ['created_at'] },
    ],
  },
  /**     * Autopilot Suggestions Cache - Pre-generated smart suggestions     * Caches AI-generated suggestions for faster home screen loading     */
  autopilot_suggestions_cache: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'suggestions', type: 'jsonb', nullable: false }, // Array of suggestion objects
      { name: 'context_hash', type: 'string', nullable: true }, // Hash for cache invalidation
      { name: 'generated_at', type: 'timestamptz', default: 'now()' },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'hit_count', type: 'integer', default: 0 },
      { name: 'last_accessed_at', type: 'timestamptz', nullable: true },
    ],
    indexes: [
      { columns: ['user_id', 'workspace_id'], unique: true },
      { columns: ['expires_at'] },
      { columns: ['generated_at'] },
    ],
  },

  // ==================== BLOG ====================

  blog_posts: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'title', type: 'string', nullable: false },
      { name: 'slug', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'excerpt', type: 'text', nullable: true },
      { name: 'featured_image', type: 'string', nullable: true },
      { name: 'images', type: 'jsonb', default: '[]' }, // Array of image URLs
      { name: 'author_id', type: 'string', nullable: false },
      { name: 'status', type: 'string', default: 'draft' },
      { name: 'published_at', type: 'timestamptz', nullable: true },
      { name: 'view_count', type: 'integer', default: 0 },
      { name: 'like_count', type: 'integer', default: 0 },
      { name: 'comment_count', type: 'integer', default: 0 },
      { name: 'rating_count', type: 'integer', default: 0 },
      { name: 'rating_average', type: 'numeric', default: 0 },
      { name: 'read_time', type: 'integer', nullable: true },
      { name: 'seo_meta_title', type: 'string', nullable: true },
      { name: 'seo_meta_description', type: 'text', nullable: true },
      { name: 'is_featured', type: 'boolean', default: false },
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['slug'], unique: true },
      { columns: ['author_id'] },
      { columns: ['status'] },
      { columns: ['published_at'] },
      { columns: ['rating_average'] },
    ],
  },

  blog_categories: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'string', nullable: false },
      { name: 'slug', type: 'string', nullable: false },
      { name: 'post_count', type: 'integer', default: 0 },
    ],
    indexes: [{ columns: ['slug'], unique: true }],
  },

  blog_tags: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'string', nullable: false },
      { name: 'slug', type: 'string', nullable: false },
      { name: 'post_count', type: 'integer', default: 0 },
    ],
    indexes: [{ columns: ['slug'], unique: true }],
  },

  blog_post_categories: {
    columns: [
      {
        name: 'post_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_posts' },
      },
      {
        name: 'category_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_categories' },
      },
    ],
    indexes: [{ columns: ['post_id', 'category_id'], unique: true }],
  },

  blog_post_tags: {
    columns: [
      {
        name: 'post_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_posts' },
      },
      { name: 'tag_id', type: 'uuid', nullable: false, references: { table: 'deskive_blog_tags' } },
    ],
    indexes: [{ columns: ['post_id', 'tag_id'], unique: true }],
  },

  blog_comments: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'post_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_posts' },
      },
      {
        name: 'parent_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'deskive_blog_comments' },
      },
      { name: 'author_name', type: 'string', nullable: false },
      { name: 'author_email', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'is_approved', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['post_id'] }, { columns: ['is_approved'] }],
  },

  blog_post_likes: {
    columns: [
      {
        name: 'post_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_posts' },
      },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['post_id'] }],
  },

  blog_ratings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'post_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'deskive_blog_posts' },
      },
      { name: 'user_id', type: 'string', nullable: true },
      { name: 'user_email', type: 'string', nullable: true },
      { name: 'user_name', type: 'string', nullable: true },
      { name: 'rating', type: 'integer', nullable: false }, // 1-5 stars
      { name: 'review', type: 'text', nullable: true },
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'is_verified_purchase', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['post_id'] },
      { columns: ['user_id'] },
      { columns: ['rating'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== FORMS ====================

  /**
   * Form Templates - Stores form definitions and configurations
   */
  form_templates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'slug', type: 'string', nullable: false },

      // Form configuration
      { name: 'fields', type: 'jsonb', nullable: false, default: '[]' },
      { name: 'pages', type: 'jsonb', nullable: false, default: '[]' },
      { name: 'settings', type: 'jsonb', nullable: false, default: '{}' },
      { name: 'branding', type: 'jsonb', default: '{}' },

      { name: 'status', type: 'string', default: 'draft' }, // 'draft', 'published', 'closed', 'archived'
      { name: 'published_at', type: 'timestamptz', nullable: true },
      { name: 'closed_at', type: 'timestamptz', nullable: true },

      // Analytics
      { name: 'view_count', type: 'integer', default: 0 },
      { name: 'response_count', type: 'integer', default: 0 },

      // Soft delete
      { name: 'is_deleted', type: 'boolean', default: false },
      { name: 'deleted_at', type: 'timestamptz', nullable: true },
      { name: 'deleted_by', type: 'string', nullable: true },

      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['slug'], unique: true },
      { columns: ['created_by'] },
      { columns: ['status'] },
      { columns: ['is_deleted'] },
      { columns: ['published_at'] },
    ],
  },

  /**
   * Form Responses - Stores individual form submissions
   */
  form_responses: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'form_id', type: 'uuid', nullable: false, references: { table: 'form_templates' } },
      { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },

      // Respondent info
      { name: 'respondent_id', type: 'string', nullable: true },
      { name: 'respondent_email', type: 'string', nullable: true },
      { name: 'respondent_name', type: 'string', nullable: true },

      // Response data
      { name: 'responses', type: 'jsonb', nullable: false },

      // Metadata
      { name: 'ip_address', type: 'string', nullable: true },
      { name: 'user_agent', type: 'text', nullable: true },
      { name: 'submission_time_seconds', type: 'integer', nullable: true },

      // Status
      { name: 'status', type: 'string', default: 'submitted' }, // 'submitted', 'draft'
      { name: 'is_complete', type: 'boolean', default: true },

      { name: 'submitted_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', nullable: true },
    ],
    indexes: [
      { columns: ['form_id'] },
      { columns: ['respondent_id'] },
      { columns: ['respondent_email'] },
      { columns: ['submitted_at'] },
      { columns: ['form_id', 'respondent_id'] },
    ],
  },

  /**
   * Form File Uploads - Stores files uploaded via form file upload fields
   */
  form_file_uploads: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'form_id', type: 'uuid', nullable: false, references: { table: 'form_templates' } },
      {
        name: 'response_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'form_responses' },
      },
      { name: 'field_id', type: 'string', nullable: false },

      { name: 'file_name', type: 'string', nullable: false },
      { name: 'file_url', type: 'string', nullable: false },
      { name: 'file_size', type: 'bigint', nullable: false },
      { name: 'mime_type', type: 'string', nullable: false },

      { name: 'uploaded_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['form_id'] }, { columns: ['response_id'] }, { columns: ['field_id'] }],
  },

  /**
   * Form Share Links - Public share links for forms
   */
  form_share_links: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'form_id', type: 'uuid', nullable: false, references: { table: 'form_templates' } },

      { name: 'share_token', type: 'string', nullable: false },
      { name: 'access_level', type: 'string', default: 'respond' }, // 'view_only', 'respond'

      { name: 'require_password', type: 'boolean', default: false },
      { name: 'password_hash', type: 'string', nullable: true },

      { name: 'expires_at', type: 'timestamptz', nullable: true },
      { name: 'max_responses', type: 'integer', nullable: true },
      { name: 'response_count', type: 'integer', default: 0 },

      { name: 'is_active', type: 'boolean', default: true },

      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['form_id'] },
      { columns: ['share_token'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  /**
   * Form Notifications - Email notifications for form events
   */
  form_notifications: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'form_id', type: 'uuid', nullable: false, references: { table: 'form_templates' } },

      { name: 'event_type', type: 'string', nullable: false }, // 'new_response', 'form_closed', 'response_limit_reached'
      { name: 'recipient_email', type: 'string', nullable: false },

      { name: 'sent_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['form_id'] }, { columns: ['event_type'] }],
  },

  /**
   * Form Analytics - Aggregated analytics for forms
   */
  form_analytics: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'form_id', type: 'uuid', nullable: false, references: { table: 'form_templates' } },

      { name: 'total_views', type: 'integer', default: 0 },
      { name: 'total_responses', type: 'integer', default: 0 },
      { name: 'completion_rate', type: 'numeric', default: 0 },
      { name: 'avg_completion_time_seconds', type: 'integer', nullable: true },

      // Field-level stats
      { name: 'field_stats', type: 'jsonb', default: '{}' },

      { name: 'last_calculated_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['form_id'], unique: true }],
  },
  // ============================================
  // ADVANCED WORKFLOW AUTOMATION SYSTEM
  // ============================================

  /**
   * Workflows - Container for multi-step automations
   * This extends the existing bots system with more advanced capabilities
   */
  workflows: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'icon', type: 'string', nullable: true },
      { name: 'color', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'trigger_type', type: 'string', nullable: false }, // entity_change, schedule, webhook, manual
      { name: 'trigger_config', type: 'jsonb', default: '{}' },
      { name: 'run_count', type: 'integer', default: '0' },
      { name: 'success_count', type: 'integer', default: '0' },
      { name: 'failure_count', type: 'integer', default: '0' },
      { name: 'last_run_at', type: 'timestamptz', nullable: true },
      { name: 'last_run_status', type: 'string', nullable: true }, // success, failed
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['created_by'] },
      { columns: ['is_active'] },
      { columns: ['trigger_type'] },
      { columns: ['workspace_id', 'is_active'] },
    ],
  },

  /**
   * Workflow Steps - Individual nodes in the workflow
   * Supports: action, condition, delay, loop, parallel, set_variable
   */
  workflow_steps: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'step_order', type: 'integer', nullable: false },
      { name: 'step_type', type: 'string', nullable: false }, // action, condition, delay, loop, parallel, set_variable, stop
      { name: 'step_name', type: 'string', nullable: true },
      { name: 'step_config', type: 'jsonb', default: '{}' },
      {
        name: 'parent_step_id',
        type: 'uuid',
        nullable: true,
        references: { table: 'workflow_steps' },
      }, // For branching
      { name: 'branch_path', type: 'string', nullable: true }, // 'true', 'false', or loop index
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'position_x', type: 'integer', default: '0' }, // For visual builder canvas
      { name: 'position_y', type: 'integer', default: '0' }, // For visual builder canvas
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['parent_step_id'] },
      { columns: ['workflow_id', 'step_order'] },
    ],
  },

  /**
   * Workflow Executions - Track each workflow run
   */
  workflow_executions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'triggered_by', type: 'string', nullable: true }, // User ID or 'system'
      { name: 'trigger_source', type: 'string', nullable: true }, // entity_change, schedule, manual, webhook
      { name: 'trigger_data', type: 'jsonb', default: '{}' }, // Data that triggered the workflow
      { name: 'status', type: 'string', default: 'pending' }, // pending, running, completed, failed, cancelled
      { name: 'current_step_id', type: 'uuid', nullable: true },
      { name: 'context', type: 'jsonb', default: '{}' }, // Variables passed between steps
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'steps_completed', type: 'integer', default: '0' },
      { name: 'steps_total', type: 'integer', default: '0' },
      { name: 'started_at', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['status'] },
      { columns: ['triggered_by'] },
      { columns: ['created_at'] },
      { columns: ['workflow_id', 'status'] },
    ],
  },

  /**
   * Workflow Step Executions - Track each step execution within a run
   */
  workflow_step_executions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'execution_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'workflow_executions' },
      },
      { name: 'step_id', type: 'uuid', nullable: false, references: { table: 'workflow_steps' } },
      { name: 'status', type: 'string', default: 'pending' }, // pending, running, completed, failed, skipped
      { name: 'input_data', type: 'jsonb', default: '{}' },
      { name: 'output_data', type: 'jsonb', default: '{}' },
      { name: 'condition_result', type: 'boolean', nullable: true }, // For condition steps
      { name: 'error_message', type: 'text', nullable: true },
      { name: 'retry_count', type: 'integer', default: '0' },
      { name: 'started_at', type: 'timestamptz', nullable: true },
      { name: 'completed_at', type: 'timestamptz', nullable: true },
      { name: 'execution_time_ms', type: 'integer', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['execution_id'] },
      { columns: ['step_id'] },
      { columns: ['status'] },
      { columns: ['execution_id', 'step_id'] },
    ],
  },

  /**
   * Entity Subscriptions - For entity-based triggers (task/note/event changes)
   */
  workflow_entity_subscriptions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'entity_type', type: 'string', nullable: false }, // task, note, event, file, project, message, approval
      { name: 'event_type', type: 'string', nullable: false }, // created, updated, deleted, status_changed, assigned, completed, etc.
      { name: 'filter_config', type: 'jsonb', default: '{}' }, // Filter by project, assignee, status, etc.
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['workspace_id'] },
      { columns: ['entity_type', 'event_type'] },
      { columns: ['is_active'] },
      { columns: ['workspace_id', 'entity_type', 'event_type', 'is_active'] },
    ],
  },

  /**
   * Automation Templates - Pre-built workflow templates
   */
  automation_templates: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'name', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: true },
      { name: 'category', type: 'string', nullable: false }, // project_management, communication, productivity, approvals, etc.
      { name: 'icon', type: 'string', nullable: true },
      { name: 'color', type: 'string', nullable: true },
      { name: 'template_config', type: 'jsonb', nullable: false }, // Full workflow definition
      { name: 'variables', type: 'jsonb', default: '[]' }, // Configurable variables when using template
      { name: 'is_featured', type: 'boolean', default: 'false' },
      { name: 'is_system', type: 'boolean', default: 'false' }, // System templates vs user-created
      { name: 'use_count', type: 'integer', default: '0' },
      { name: 'created_by', type: 'string', nullable: true }, // null for system templates
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['category'] },
      { columns: ['is_featured'] },
      { columns: ['is_system'] },
      { columns: ['use_count'] },
    ],
  },

  /**
   * Workflow Scheduled Jobs - For time-based workflow triggers
   */
  workflow_scheduled_jobs: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'cron_expression', type: 'string', nullable: false },
      { name: 'timezone', type: 'string', default: 'UTC' },
      { name: 'next_run_at', type: 'timestamptz', nullable: false },
      { name: 'last_run_at', type: 'timestamptz', nullable: true },
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['next_run_at'] },
      { columns: ['is_active'] },
      { columns: ['is_active', 'next_run_at'] },
    ],
  },

  /**
   * Workflow Webhooks - For webhook-triggered workflows
   */
  workflow_webhooks: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workflow_id', type: 'uuid', nullable: false, references: { table: 'workflows' } },
      { name: 'webhook_key', type: 'string', nullable: false }, // Unique key for webhook URL
      { name: 'secret', type: 'string', nullable: true }, // For signature verification
      { name: 'allowed_ips', type: 'jsonb', default: '[]' }, // IP whitelist
      { name: 'is_active', type: 'boolean', default: 'true' },
      { name: 'last_triggered_at', type: 'timestamptz', nullable: true },
      { name: 'trigger_count', type: 'integer', default: '0' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workflow_id'] },
      { columns: ['webhook_key'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  /**
   * Workflow Variables - Global variables for workflows
   */
  workflow_variables: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'name', type: 'string', nullable: false },
      { name: 'value', type: 'text', nullable: true },
      { name: 'value_type', type: 'string', default: 'string' }, // string, number, boolean, json
      { name: 'is_secret', type: 'boolean', default: 'false' }, // For API keys, passwords
      { name: 'description', type: 'text', nullable: true },
      { name: 'created_by', type: 'string', nullable: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['workspace_id'] }, { columns: ['workspace_id', 'name'], unique: true }],
  },
  scheduled_actions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'user_id', type: 'string', nullable: false }, // User who scheduled the action
      { name: 'action_type', type: 'string', nullable: false }, // send_email, send_notification, create_task, etc.
      { name: 'action_config', type: 'jsonb', nullable: false }, // Action parameters
      { name: 'scheduled_at', type: 'timestamptz', nullable: false }, // When to execute
      { name: 'status', type: 'string', default: 'pending' }, // pending, executing, completed, failed, cancelled
      { name: 'executed_at', type: 'timestamptz', nullable: true }, // Actual execution time
      { name: 'result', type: 'jsonb', nullable: true }, // Execution result or error
      { name: 'description', type: 'text', nullable: true }, // Human readable description
      { name: 'retry_count', type: 'integer', default: '0' },
      { name: 'max_retries', type: 'integer', default: '3' },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['user_id'] },
      { columns: ['status'] },
      { columns: ['scheduled_at'] },
      { columns: ['status', 'scheduled_at'] }, // For finding pending actions to execute
    ],
  },
  // ==================== USER FEEDBACK ====================
  /**
   * Feedback - User-submitted bugs, issues, and improvement suggestions
   * Global per user (not workspace-scoped)
   */
  feedback: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'type', type: 'string', nullable: false }, // bug, issue, improvement, feature_request
      { name: 'title', type: 'string', nullable: false },
      { name: 'description', type: 'text', nullable: false },
      { name: 'status', type: 'string', default: 'pending' }, // pending, in_review, in_progress, resolved, wont_fix, duplicate
      { name: 'priority', type: 'string', default: 'medium' }, // low, medium, high, critical
      { name: 'category', type: 'string', nullable: true }, // ui, performance, feature, security, other
      { name: 'attachments', type: 'jsonb', default: '[]' }, // [{ url, name, type, size }]
      { name: 'app_version', type: 'string', nullable: true },
      { name: 'device_info', type: 'jsonb', default: '{}' },
      { name: 'resolution_notes', type: 'text', nullable: true },
      { name: 'resolved_at', type: 'timestamptz', nullable: true },
      { name: 'resolved_by', type: 'string', nullable: true },
      { name: 'notified_at', type: 'timestamptz', nullable: true },
      { name: 'assigned_to', type: 'string', nullable: true },
      { name: 'duplicate_of_id', type: 'uuid', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['type'] },
      { columns: ['status'] },
      { columns: ['priority'] },
      { columns: ['created_at'] },
    ],
  },

  /**
   * Feedback Responses - Admin responses and status updates for feedback
   */
  feedback_responses: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'feedback_id', type: 'uuid', nullable: false, references: { table: 'feedback' } },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'content', type: 'text', nullable: false },
      { name: 'is_internal', type: 'boolean', default: false },
      { name: 'status_change', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['feedback_id'] }, { columns: ['created_at'] }],
  },

  /**
   * Account Deletion Feedback - Captures user feedback before account deletion
   * Part of the Account Deletion Exit Survey feature
   */
  account_deletion_feedback: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'user_email', type: 'string', nullable: false },
      { name: 'user_name', type: 'string', nullable: true },
      { name: 'reason', type: 'string', nullable: false }, // found_alternative, privacy_concerns, bugs_errors, missing_features, too_complicated, not_using, other
      { name: 'reason_details', type: 'text', nullable: true }, // Additional context for the reason
      { name: 'feedback_response', type: 'text', nullable: true }, // User's typed feedback
      { name: 'was_retained', type: 'boolean', default: false }, // Did user cancel deletion after survey?
      { name: 'deleted_account', type: 'boolean', default: false }, // Did user proceed with deletion?
      { name: 'status', type: 'string', default: 'pending' }, // pending, reviewed, actioned, resolved
      { name: 'priority', type: 'string', default: 'normal' }, // low, normal, high, urgent
      { name: 'admin_notes', type: 'text', nullable: true }, // Notes from admin review
      { name: 'reviewed_at', type: 'timestamptz', nullable: true },
      { name: 'reviewed_by', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['user_email'] },
      { columns: ['reason'] },
      { columns: ['status'] },
      { columns: ['priority'] },
      { columns: ['was_retained'] },
      { columns: ['deleted_account'] },
      { columns: ['created_at'] },
    ],
  },

  // ==================== SLACK WHITEBOARD INTEGRATION ====================

  /**
   * Stores Slack workspace installations for the Deskive Whiteboard app
   * One row per Slack workspace that installed the app from marketplace
   */
  slack_whiteboard_installations: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'team_name', type: 'string', nullable: false }, // Workspace name
      { name: 'bot_token', type: 'string', nullable: false }, // OAuth bot token
      { name: 'bot_user_id', type: 'string', nullable: false }, // Bot user ID
      { name: 'installer_user_id', type: 'string', nullable: false }, // Who installed the app
      { name: 'user_token', type: 'string', nullable: true }, // User OAuth token (optional)
      { name: 'scope', type: 'string', nullable: false }, // Granted permissions
      { name: 'webhook_url', type: 'string', nullable: true }, // Incoming webhook URL
      { name: 'webhook_channel', type: 'string', nullable: true }, // Default webhook channel
      { name: 'is_active', type: 'boolean', default: true }, // Installation active status
      { name: 'uninstalled_at', type: 'timestamptz', nullable: true }, // When app was uninstalled
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['team_id'], unique: true }, // One installation per workspace
      { columns: ['bot_user_id'] },
      { columns: ['is_active'] },
    ],
  },

  /**
   * Links Deskive whiteboards to Slack
   * Tracks which whiteboards were created from Slack marketplace app
   */
  slack_whiteboard_links: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'whiteboard_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'whiteboards' },
      },
      { name: 'team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'channel_id', type: 'string', nullable: true }, // Slack channel where created
      { name: 'creator_slack_user_id', type: 'string', nullable: false }, // Slack user who created it
      { name: 'message_ts', type: 'string', nullable: true }, // Slack message timestamp
      { name: 'is_shared', type: 'boolean', default: false }, // Shared in channel
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['whiteboard_id'] }, // Lookup by whiteboard
      { columns: ['team_id'] }, // Lookup by workspace
      { columns: ['team_id', 'channel_id'] }, // Workspace + channel
      { columns: ['creator_slack_user_id'] }, // User's whiteboards
    ],
  },

  /**
   * Temporary storage for Slack OAuth setup sessions
   * Stores Slack data while user completes login/register
   */
  slack_setup_sessions: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'setup_token', type: 'string', nullable: false },
      { name: 'slack_data', type: 'jsonb', nullable: false },
      { name: 'expires_at', type: 'timestamptz', nullable: false },
      { name: 'completed', type: 'boolean', default: false },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['setup_token'], unique: true },
      { columns: ['expires_at'] },
      { columns: ['completed'] },
    ],
  },

  /**
   * Links Deskive projects to Slack
   * Tracks which projects were created from Slack app
   */
  slack_project_links: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'project_id', type: 'uuid', nullable: false, references: { table: 'projects' } },
      { name: 'team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'channel_id', type: 'string', nullable: true }, // Slack channel where created
      { name: 'creator_slack_user_id', type: 'string', nullable: false }, // Slack user who created it
      { name: 'message_ts', type: 'string', nullable: true }, // Slack message timestamp
      { name: 'is_shared', type: 'boolean', default: false }, // Shared in channel
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['project_id'] }, // Lookup by project
      { columns: ['team_id'] }, // Lookup by workspace
      { columns: ['team_id', 'channel_id'] }, // Workspace + channel
      { columns: ['creator_slack_user_id'] }, // User's projects
    ],
  },

  /**
   * Maps Slack users to Deskive users
   * Created when user opens whiteboard from Slack for the first time
   */
  slack_user_mappings: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'deskive_user_id', type: 'string', nullable: false }, // Deskive user ID
      { name: 'slack_user_id', type: 'string', nullable: false }, // Slack user ID
      { name: 'slack_team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'slack_email', type: 'string', nullable: true }, // Slack user email
      { name: 'slack_name', type: 'string', nullable: true }, // Slack user name
      { name: 'slack_avatar', type: 'text', nullable: true }, // Slack user avatar URL
      { name: 'user_access_token', type: 'text', nullable: true }, // User-level access token
      { name: 'is_active', type: 'boolean', default: true }, // Mapping active status
      { name: 'onboarding_completed', type: 'boolean', default: false }, // User completed onboarding
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['deskive_user_id'] },
      { columns: ['slack_user_id', 'slack_team_id'], unique: true }, // One mapping per Slack user per team
      { columns: ['slack_team_id'] },
      { columns: ['slack_email'] },
    ],
  },
  /**
   * Links Deskive workspaces to Slack channels for calendar notifications
   * Allows users to receive event notifications in specific Slack channels
   */
  slack_calendar_channel_links: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
      { name: 'team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'channel_id', type: 'string', nullable: false }, // Slack channel ID
      { name: 'channel_name', type: 'string', nullable: true }, // Slack channel name
      { name: 'creator_slack_user_id', type: 'string', nullable: false }, // Slack user who linked
      { name: 'notification_settings', type: 'jsonb', default: '{}' },
      { name: 'reminder_minutes', type: 'jsonb', default: '[]' }, // Minutes before event to remind
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['workspace_id'] },
      { columns: ['team_id'] },
      { columns: ['team_id', 'channel_id'], unique: true }, // One link per channel per team
      { columns: ['is_active'] },
    ],
  },
  /**
   * Tracks Slack messages posted for calendar events
   * Used for updating messages when events change and tracking RSVPs
   */
  slack_event_messages: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'event_id', type: 'uuid', nullable: false, references: { table: 'calendar_events' } },
      { name: 'team_id', type: 'string', nullable: false }, // Slack workspace ID
      { name: 'channel_id', type: 'string', nullable: false }, // Slack channel ID
      { name: 'message_ts', type: 'string', nullable: false }, // Slack message timestamp
      { name: 'message_type', type: 'string', default: 'event_created' }, // event_created, reminder, update
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['event_id'] },
      { columns: ['team_id', 'channel_id'] },
      { columns: ['message_ts'] },
    ],
  },

  // ==================== END-TO-END ENCRYPTION (E2EE) ====================

  /**
   * Stores users' public keys for end-to-end encryption
   * Each user can have multiple devices with different keys
   */
  user_keys: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'public_key', type: 'text', nullable: false },
      { name: 'device_id', type: 'string', nullable: false },
      { name: 'device_name', type: 'string', nullable: true },
      { name: 'is_active', type: 'boolean', default: true },
      { name: 'last_used_at', type: 'timestamptz', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['user_id'] },
      { columns: ['user_id', 'device_id'], unique: true },
      { columns: ['is_active'] },
    ],
  },

  /**
   * Stores encrypted conversation keys for group chats
   */
  conversation_keys: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'conversations' },
      },
      { name: 'user_id', type: 'string', nullable: false },
      { name: 'encrypted_key', type: 'text', nullable: false },
      { name: 'created_by', type: 'string', nullable: true },
      { name: 'key_version', type: 'integer', default: 1 },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
      { name: 'updated_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [
      { columns: ['conversation_id', 'user_id'], unique: true },
      { columns: ['conversation_id'] },
      { columns: ['user_id'] },
    ],
  },

  /**
   * Tracks encryption key rotation history
   */
  key_rotation_history: {
    columns: [
      { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
      {
        name: 'conversation_id',
        type: 'uuid',
        nullable: false,
        references: { table: 'conversations' },
      },
      { name: 'old_key_version', type: 'integer', nullable: false },
      { name: 'new_key_version', type: 'integer', nullable: false },
      { name: 'rotated_by', type: 'string', nullable: false },
      { name: 'rotation_reason', type: 'string', nullable: true },
      { name: 'created_at', type: 'timestamptz', default: 'now()' },
    ],
    indexes: [{ columns: ['conversation_id'] }, { columns: ['created_at'] }],
  },
};

export default schema;
