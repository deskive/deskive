# Contract/Proposal Builder - Implementation Plan

## Overview
Add a **Document Builder** tool to the Tools module with document templates stored in the **Templates** tool as a new category alongside Project Templates.

## Architecture

```
Tools Module
├── Templates (existing)
│   ├── Project Templates (existing)
│   └── Document Templates (NEW) ← proposals, contracts, invoices, SOWs
├── Approvals (existing)
├── Whiteboard (existing)
└── Document Builder (NEW) ← creates documents from templates
```

## Requirements
- **E-Signature**: In-app signature capture (drawing pad + typed name)
- **Templates**: System + custom document templates in Templates tool
- **Document Types**: Proposals, Contracts, Invoices, SOWs
- **Export**: HTML preview with browser print/save as PDF

---

## Phase 1: Database Schema

Add to `backend/src/database/schema.ts`:

### 1. `document_templates` (for Templates tool)
```typescript
document_templates: {
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'workspace_id', type: 'uuid', nullable: true, references: { table: 'workspaces' } },
    { name: 'name', type: 'string', nullable: false },
    { name: 'slug', type: 'string', nullable: false },
    { name: 'description', type: 'text', nullable: true },
    { name: 'document_type', type: 'string', nullable: false }, // proposal|contract|invoice|sow
    { name: 'category', type: 'string', nullable: true }, // sales|legal|freelance|consulting
    { name: 'icon', type: 'string', nullable: true },
    { name: 'color', type: 'string', nullable: true },
    { name: 'content', type: 'jsonb', nullable: false }, // Quill Delta format
    { name: 'content_html', type: 'text', nullable: true },
    { name: 'placeholders', type: 'jsonb', default: '[]' }, // [{key, label, type, required}]
    { name: 'signature_fields', type: 'jsonb', default: '[]' }, // [{id, label, required}]
    { name: 'settings', type: 'jsonb', default: '{}' },
    { name: 'is_system', type: 'boolean', default: false },
    { name: 'is_featured', type: 'boolean', default: false },
    { name: 'usage_count', type: 'integer', default: 0 },
    { name: 'created_by', type: 'string', nullable: true },
    { name: 'is_deleted', type: 'boolean', default: false },
    { name: 'deleted_at', type: 'timestamptz', nullable: true },
    { name: 'created_at', type: 'timestamptz', default: 'now()' },
    { name: 'updated_at', type: 'timestamptz', default: 'now()' }
  ],
  indexes: [
    { columns: ['workspace_id'] },
    { columns: ['document_type'] },
    { columns: ['category'] },
    { columns: ['slug'], unique: true },
    { columns: ['is_system'] },
    { columns: ['is_deleted'] }
  ]
}
```

### 2. `documents` (for Document Builder tool)
```typescript
documents: {
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'workspace_id', type: 'uuid', nullable: false, references: { table: 'workspaces' } },
    { name: 'template_id', type: 'uuid', nullable: true, references: { table: 'document_templates' } },
    { name: 'document_number', type: 'string', nullable: false }, // PROP-2025-001
    { name: 'title', type: 'string', nullable: false },
    { name: 'document_type', type: 'string', nullable: false },
    { name: 'content', type: 'jsonb', nullable: false },
    { name: 'content_html', type: 'text', nullable: true },
    { name: 'placeholder_values', type: 'jsonb', default: '{}' },
    { name: 'status', type: 'string', default: 'draft' }, // draft|pending_signature|signed|archived
    { name: 'version', type: 'integer', default: 1 },
    { name: 'expires_at', type: 'timestamptz', nullable: true },
    { name: 'signed_at', type: 'timestamptz', nullable: true },
    { name: 'created_by', type: 'string', nullable: false },
    { name: 'updated_by', type: 'string', nullable: true },
    { name: 'is_deleted', type: 'boolean', default: false },
    { name: 'deleted_at', type: 'timestamptz', nullable: true },
    { name: 'metadata', type: 'jsonb', default: '{}' },
    { name: 'created_at', type: 'timestamptz', default: 'now()' },
    { name: 'updated_at', type: 'timestamptz', default: 'now()' }
  ],
  indexes: [
    { columns: ['workspace_id'] },
    { columns: ['template_id'] },
    { columns: ['document_type'] },
    { columns: ['status'] },
    { columns: ['document_number'], unique: true },
    { columns: ['is_deleted'] },
    { columns: ['created_at'] }
  ]
}
```

### 3. `document_recipients`
```typescript
document_recipients: {
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
    { name: 'user_id', type: 'string', nullable: true },
    { name: 'email', type: 'string', nullable: false },
    { name: 'name', type: 'string', nullable: false },
    { name: 'role', type: 'string', default: 'signer' }, // signer|viewer|cc
    { name: 'order', type: 'integer', default: 0 },
    { name: 'status', type: 'string', default: 'pending' }, // pending|viewed|signed|declined
    { name: 'access_token', type: 'string', unique: true, nullable: false },
    { name: 'viewed_at', type: 'timestamptz', nullable: true },
    { name: 'signed_at', type: 'timestamptz', nullable: true },
    { name: 'declined_at', type: 'timestamptz', nullable: true },
    { name: 'decline_reason', type: 'text', nullable: true },
    { name: 'ip_address', type: 'string', nullable: true },
    { name: 'created_at', type: 'timestamptz', default: 'now()' }
  ],
  indexes: [
    { columns: ['document_id'] },
    { columns: ['email'] },
    { columns: ['access_token'], unique: true },
    { columns: ['document_id', 'email'], unique: true }
  ]
}
```

### 4. `document_signatures`
```typescript
document_signatures: {
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
    { name: 'recipient_id', type: 'uuid', nullable: false, references: { table: 'document_recipients' } },
    { name: 'signature_field_id', type: 'string', nullable: false },
    { name: 'signature_type', type: 'string', nullable: false }, // drawn|typed
    { name: 'signature_data', type: 'text', nullable: false }, // base64 or typed name
    { name: 'typed_name', type: 'string', nullable: true },
    { name: 'font_family', type: 'string', nullable: true },
    { name: 'ip_address', type: 'string', nullable: true },
    { name: 'signed_at', type: 'timestamptz', default: 'now()' },
    { name: 'created_at', type: 'timestamptz', default: 'now()' }
  ],
  indexes: [
    { columns: ['document_id'] },
    { columns: ['recipient_id'] },
    { columns: ['document_id', 'recipient_id', 'signature_field_id'], unique: true }
  ]
}
```

### 5. `document_activity_logs`
```typescript
document_activity_logs: {
  columns: [
    { name: 'id', type: 'uuid', primaryKey: true, default: 'gen_random_uuid()' },
    { name: 'document_id', type: 'uuid', nullable: false, references: { table: 'documents' } },
    { name: 'user_id', type: 'string', nullable: true },
    { name: 'recipient_id', type: 'uuid', nullable: true, references: { table: 'document_recipients' } },
    { name: 'action', type: 'string', nullable: false }, // created|updated|viewed|signed|sent|etc
    { name: 'details', type: 'text', nullable: true },
    { name: 'ip_address', type: 'string', nullable: true },
    { name: 'metadata', type: 'jsonb', default: '{}' },
    { name: 'created_at', type: 'timestamptz', default: 'now()' }
  ],
  indexes: [
    { columns: ['document_id'] },
    { columns: ['action'] },
    { columns: ['created_at'] }
  ]
}
```

---

## Phase 2: Backend Modules

### A. Extend Templates Module (Document Templates)

**New files in `backend/src/modules/templates/`:**
```
templates/
├── document-templates.controller.ts (NEW)
├── document-templates.service.ts (NEW)
├── dto/
│   ├── create-document-template.dto.ts (NEW)
│   └── update-document-template.dto.ts (NEW)
└── data/
    └── document-templates/ (NEW)
        ├── proposal-templates.ts
        ├── contract-templates.ts
        ├── invoice-templates.ts
        └── sow-templates.ts
```

**Endpoints** (`/workspaces/:workspaceId/document-templates`):
- `GET /` - List document templates (filter by type, category)
- `GET /types` - Get document types with counts
- `GET /:idOrSlug` - Get single template
- `POST /` - Create custom template
- `PATCH /:id` - Update template
- `DELETE /:id` - Delete template

### B. New Documents Module (Document Builder)

**Create `backend/src/modules/documents/`:**
```
documents/
├── documents.module.ts
├── documents.controller.ts
├── documents.service.ts
├── dto/
│   ├── create-document.dto.ts
│   ├── update-document.dto.ts
│   ├── add-recipient.dto.ts
│   └── sign-document.dto.ts
└── external.controller.ts (public signing endpoints)
```

**Endpoints** (`/workspaces/:workspaceId/documents`):
- `GET /` - List documents (filter by type, status)
- `GET /stats` - Document statistics
- `POST /` - Create from template
- `GET /:id` - Get document
- `PATCH /:id` - Update document
- `DELETE /:id` - Soft delete
- `GET /:id/preview` - HTML preview
- `POST /:id/recipients` - Add recipient
- `DELETE /:id/recipients/:recipientId` - Remove recipient
- `POST /:id/send` - Send for signatures
- `GET /:id/activity` - Activity log

**External endpoints** (`/d/:accessToken`):
- `GET /` - View document (recipient)
- `POST /sign` - Submit signature
- `POST /decline` - Decline to sign

---

## Phase 3: Flutter - Templates Tool Extension

### A. Update Templates Screen with 2 Cards

**Current:** Templates tool opens directly to project templates gallery

**New:** Templates tool opens to a **selection screen with 2 cards**:

```
Templates Screen (templates_screen.dart)
├── [Card] Project Templates
│   icon: Icons.dashboard_customize_outlined
│   subtitle: "76 pre-built project templates"
│   → Opens: TemplateGalleryScreen (existing)
│
└── [Card] Document Templates
│   icon: Icons.description_outlined
│   subtitle: "Proposals, contracts, invoices & SOWs"
│   → Opens: DocumentTemplateGalleryScreen (new)
```

**Create `flutter/lib/tools/templates/templates_screen.dart`:** (NEW)
```dart
class TemplatesScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Templates')),
      body: GridView.count(
        crossAxisCount: 2,
        children: [
          _buildTemplateCard(
            icon: Icons.dashboard_customize_outlined,
            title: 'Project Templates',
            subtitle: '76 pre-built templates',
            color: Colors.teal,
            onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => TemplateGalleryScreen())),
          ),
          _buildTemplateCard(
            icon: Icons.description_outlined,
            title: 'Document Templates',
            subtitle: 'Proposals, contracts & more',
            color: Colors.orange,
            onTap: () => Navigator.push(context,
              MaterialPageRoute(builder: (_) => DocumentTemplateGalleryScreen())),
          ),
        ],
      ),
    );
  }
}
```

**Update `flutter/lib/tools/tools_screen.dart`:**
- Change Templates card to navigate to `TemplatesScreen` instead of `TemplateGalleryScreen`

### B. Create Document Templates Gallery

**Create `flutter/lib/tools/templates/document_template_gallery_screen.dart`:**
- Same pattern as `template_gallery_screen.dart`
- Filter by document type: Proposals | Contracts | Invoices | SOWs
- Category chips within each type

### C. Add Constants & Service

**Add `document_template_constants.dart`:**
```dart
// Document types
enum DocumentType { proposal, contract, invoice, sow }

// Categories per document type
const documentTemplateCategories = [
  TemplateCategory(id: 'sales', name: 'Sales', icon: 'trending_up'),
  TemplateCategory(id: 'legal', name: 'Legal', icon: 'gavel'),
  TemplateCategory(id: 'freelance', name: 'Freelance', icon: 'person'),
  TemplateCategory(id: 'consulting', name: 'Consulting', icon: 'business'),
];
```

3. **Add `document_template_service.dart`:**
   - Separate service for document templates
   - Same pattern as `template_service.dart`

4. **Add model `flutter/lib/models/template/document_template.dart`:**
```dart
class DocumentTemplate {
  final String id;
  final String? workspaceId;
  final String name;
  final String slug;
  final String? description;
  final String documentType; // proposal|contract|invoice|sow
  final String? category;
  final Map<String, dynamic> content; // Quill Delta
  final String? contentHtml;
  final List<TemplatePlaceholder> placeholders;
  final List<SignatureField> signatureFields;
  final bool isSystem;
  final bool isFeatured;
  final int usageCount;
  // ... timestamps
}

class TemplatePlaceholder {
  final String key;
  final String label;
  final String type; // text|number|date|currency|email
  final bool required;
  final String? defaultValue;
}

class SignatureField {
  final String id;
  final String label;
  final bool required;
}
```

5. **Add API service `flutter/lib/api/services/document_template_api_service.dart`**

---

## Phase 4: Flutter - Document Builder Tool

### A. Create Tool Structure

**New folder `flutter/lib/tools/document_builder/`:**
```
document_builder/
├── document_builder_screen.dart (main list screen)
├── create_document_screen.dart (create from template)
├── document_editor_screen.dart (edit content)
├── document_preview_screen.dart (HTML preview + print)
├── document_recipients_screen.dart (manage signers)
├── document_service.dart (state management)
└── widgets/
    ├── document_card.dart
    ├── document_status_badge.dart
    ├── document_type_chip.dart
    ├── placeholder_form.dart
    ├── signature_capture_widget.dart
    └── recipient_list_tile.dart
```

### B. Add to Tools Screen

**Modify `flutter/lib/tools/tools_screen.dart`:**
```dart
// Add new tool card
_buildToolCard(
  icon: Icons.description_outlined,
  title: 'tools.document_builder'.tr(),
  subtitle: 'tools.document_builder_subtitle'.tr(),
  color: Colors.orange,
  onTap: () => Navigator.push(
    context,
    MaterialPageRoute(builder: (_) => const DocumentBuilderScreen()),
  ),
)
```

### C. Add Translations

**Update `flutter/assets/translations/en.json`:**
```json
"tools": {
  "document_builder": "Document Builder",
  "document_builder_subtitle": "Create proposals, contracts & invoices"
},
"document_builder": {
  "title": "Documents",
  "new_document": "New Document",
  "from_template": "From Template",
  "blank_document": "Blank Document",
  "filter_all": "All",
  "filter_proposals": "Proposals",
  "filter_contracts": "Contracts",
  "filter_invoices": "Invoices",
  "filter_sows": "SOWs",
  "status_draft": "Draft",
  "status_pending": "Pending Signature",
  "status_signed": "Signed",
  "status_archived": "Archived",
  "add_recipient": "Add Recipient",
  "send_for_signature": "Send for Signature",
  "preview": "Preview",
  "print": "Print / Save PDF"
},
"document_templates": {
  "title": "Document Templates",
  "proposals": "Proposals",
  "contracts": "Contracts",
  "invoices": "Invoices",
  "sows": "Statements of Work"
}
```

### D. New Packages

**Add to `flutter/pubspec.yaml`:**
```yaml
signature: ^5.4.1      # Signature drawing pad
printing: ^5.12.0      # PDF generation via browser print
```

---

## Phase 5: Key Screens Implementation

### 1. Document Builder Main Screen
- Tab bar: All | Proposals | Contracts | Invoices | SOWs
- List of documents with status badges
- FAB to create new document
- Search and filter

### 2. Create Document Screen
- Select template from Document Templates
- Fill placeholder values form
- Rich text editor (Flutter Quill)
- Save as draft

### 3. Document Editor Screen
- Quill rich text editor (reuse from notes)
- Placeholder highlighting
- Toolbar for formatting
- Auto-save

### 4. Document Preview Screen
- WebView with HTML content
- Print button (uses `printing` package)
- Share button
- Shows signature fields

### 5. Signature Capture Widget
```dart
class SignatureCaptureWidget extends StatefulWidget {
  // TabBar: Draw | Type
  // Draw tab: Signature canvas
  // Type tab: TextField + font selector
  // Submit button
}
```

---

## Phase 6: System Templates

Create 2-3 templates per type:

**Proposals:**
- Basic Proposal
- Professional Services Proposal
- Project Proposal

**Contracts:**
- Service Agreement
- NDA (Non-Disclosure)
- Freelance Contract

**Invoices:**
- Standard Invoice
- Hourly Invoice
- Milestone Invoice

**SOWs:**
- Basic SOW
- Detailed SOW

---

## Files Summary

### Backend - Create:
| File | Purpose |
|------|---------|
| `backend/src/database/schema.ts` | Add 5 tables |
| `backend/src/modules/templates/document-templates.controller.ts` | Template endpoints |
| `backend/src/modules/templates/document-templates.service.ts` | Template logic |
| `backend/src/modules/documents/documents.module.ts` | Module def |
| `backend/src/modules/documents/documents.controller.ts` | Document endpoints |
| `backend/src/modules/documents/documents.service.ts` | Document logic |
| `backend/src/modules/documents/external.controller.ts` | Public signing |
| `backend/src/modules/templates/data/document-templates/*.ts` | Template data |

### Flutter - Create:
| File | Purpose |
|------|---------|
| `flutter/lib/tools/templates/templates_screen.dart` | New entry screen with 2 cards |
| `flutter/lib/tools/templates/document_template_gallery_screen.dart` | Document templates gallery |
| `flutter/lib/tools/templates/document_template_constants.dart` | Document template constants |
| `flutter/lib/tools/templates/document_template_service.dart` | Document template state |
| `flutter/lib/models/template/document_template.dart` | Model |
| `flutter/lib/models/document/document.dart` | Document model |
| `flutter/lib/api/services/document_template_api_service.dart` | API |
| `flutter/lib/api/services/document_api_service.dart` | API |
| `flutter/lib/tools/document_builder/*.dart` | All Document Builder screens |

### Flutter - Modify:
| File | Changes |
|------|---------|
| `flutter/lib/tools/tools_screen.dart` | Templates → TemplatesScreen, Add Document Builder card |
| `flutter/assets/translations/en.json` | Add translations |
| `flutter/pubspec.yaml` | Add packages |

---

## Verification Plan

1. **Templates Tab**: Open Templates tool → see 2 tabs (Project/Document)
2. **Document Templates**: Browse, filter, preview document templates
3. **Create Document**: Select template → fill placeholders → save
4. **Edit Document**: Open document → edit with Quill → save
5. **Preview**: View HTML preview → print/save PDF works
6. **Recipients**: Add signers → send for signature
7. **Signature**: Capture drawn and typed signatures
8. **Status Flow**: Draft → Pending → Signed workflow works
9. **Activity Log**: All actions logged

---

## Implementation Order

1. Schema + migrations
2. Backend document-templates endpoints (extend Templates module)
3. Flutter document template model + API service
4. Templates tool tabs (Project | Document)
5. Backend documents module
6. Flutter Document Builder tool (main screen)
7. Create/edit document screens
8. Preview + print
9. Recipients + signature capture
10. Send for signature workflow
11. System templates data
12. Polish + testing
