<p align="center">
  <h1 align="center">Deskive</h1>
  <p align="center">
    <strong>Open-source workspace collaboration platform</strong>
  </p>
  <p align="center">
    Real-time chat, video calls, project management, file sharing, calendar, notes, AI tools -- all in one place.
  </p>
</p>

<p align="center">
  <a href="https://github.com/deskive/deskive/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue.svg" alt="License"></a>
  <a href="https://github.com/deskive/deskive/stargazers"><img src="https://img.shields.io/github/stars/deskive/deskive?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/deskive/deskive/issues"><img src="https://img.shields.io/github/issues/deskive/deskive" alt="Issues"></a>
</p>

<p align="center">
  <a href="#quick-start">Quick Start</a> |
  <a href="#features">Features</a> |
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

---

## What is Deskive?

Deskive is an open-source workspace collaboration platform that brings together real-time communication, project management, video conferencing, file management, and AI-powered productivity tools into a single, self-hostable application.

## Quick Start

### Prerequisites
Node.js 20+, PostgreSQL 15+, Redis 7+

```bash
git clone https://github.com/deskive/deskive.git
cd deskive

# Backend
cd backend
cp .env.example .env    # Edit with your configuration
npm install
npm run migrate
npm run start:dev

# Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev
```

Visit `http://localhost:5175` to access the app.

## Features

### Communication
- **Real-time Chat** -- Direct messages, channels, threads, reactions, mentions, GIF support
- **Video Conferencing** -- HD calls via LiveKit with screen sharing, recording, transcription
- **Email Integration** -- Gmail OAuth, SMTP/IMAP, AI-powered email features

### Productivity
- **Project Management** -- Tasks, milestones, Kanban boards, sprints, time tracking, dependencies
- **Calendar** -- Event scheduling, recurring events, meeting rooms, availability management
- **Notes** -- Block-based editor with collaboration, templates, export
- **Documents** -- Document management with digital signatures and workflows
- **Whiteboard** -- Collaborative visual workspace

### AI Tools
- **AutoPilot Agent** -- AI assistant for scheduling, task management, and daily briefings
- **Meeting Intelligence** -- Automatic transcription, translation, and summarization
- **Document Analysis** -- AI-powered content extraction and search
- **Conversation Memory** -- Vector-based context for personalized AI interactions

### Platform
- **File Management** -- Cloud storage with versioning, sharing, Google Drive integration
- **Forms Builder** -- Create forms with analytics and response tracking
- **Approvals** -- Workflow-based approval system
- **Budget Management** -- Track budgets, expenses, and billing rates
- **Bots** -- Automation framework with triggers, actions, and scheduling
- **Integrations** -- Slack, Google Drive, Google Sheets, Dropbox, GitHub, and more
- **Search** -- Global cross-content search with semantic capabilities
- **Analytics** -- Workspace insights and productivity metrics
- **i18n** -- English and Japanese (expandable)

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Backend** | NestJS 11, TypeScript, PostgreSQL (raw SQL), Redis, Qdrant, Socket.io |
| **Frontend** | React 19, Vite, TypeScript, Tailwind CSS, Radix UI, Zustand, React Query |
| **Desktop** | Tauri (macOS, Windows, Linux) |
| **Mobile** | Flutter 3.7+ (iOS, Android) |
| **Video** | LiveKit (HD calls, screen sharing, recording) |
| **AI** | OpenAI (GPT-4o-mini, embeddings, Whisper transcription) |
| **Payments** | Stripe (subscriptions) |
| **Search** | Qdrant (vector search), PostgreSQL (full-text) |

## Project Structure

```
deskive/
├── backend/                 # NestJS API (40+ modules)
│   ├── src/modules/         # chat, projects, files, calendar, notes, video-calls,
│   │                        # auth, workspace, notifications, ai, search, bots,
│   │                        # forms, documents, whiteboards, integrations, ...
│   └── migrations/          # PostgreSQL migrations (148 tables)
├── frontend/                # React + Vite + Tailwind
│   ├── src/pages/           # 30+ feature pages
│   ├── src/components/      # UI components
│   ├── src/i18n/            # English + Japanese translations
│   └── src-tauri/           # Desktop app (Tauri)
├── flutter/                 # Flutter mobile app (iOS + Android)
│   └── lib/                 # Screens, services, providers
└── .github/workflows/       # CI/CD
```

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Copyright 2025 Deskive Contributors.
