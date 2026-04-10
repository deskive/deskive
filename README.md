<p align="center">
  <a href="https://deskive.com">
    <img src="frontend/public/logo.png" alt="Deskive" width="80">
  </a>
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
  <a href="https://github.com/deskive/deskive/actions/workflows/ci.yml"><img src="https://github.com/deskive/deskive/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/deskive/deskive/stargazers"><img src="https://img.shields.io/github/stars/deskive/deskive?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/deskive/deskive/issues"><img src="https://img.shields.io/github/issues/deskive/deskive" alt="Issues"></a>
  <a href="https://github.com/deskive/deskive/pulls"><img src="https://img.shields.io/github/issues-pr/deskive/deskive" alt="Pull Requests"></a>
</p>

<p align="center">
  <a href="https://deskive.com">Website</a> |
  <a href="#quick-start">Quick Start</a> |
  <a href="#features">Features</a> |
  <a href="https://github.com/deskive/deskive/discussions">Discussions</a> |
  <a href="CONTRIBUTING.md">Contributing</a>
</p>

<p align="center">
  <a href="./README.md">English</a> |
  <a href="./README_JA.md">日本語</a> |
  <a href="./README_ZH.md">中文</a> |
  <a href="./README_KO.md">한국어</a> |
  <a href="./README_ES.md">Español</a> |
  <a href="./README_FR.md">Français</a> |
  <a href="./README_DE.md">Deutsch</a> |
  <a href="./README_PT-BR.md">Português</a> |
  <a href="./README_AR.md">العربية</a> |
  <a href="./README_HI.md">हिन्दी</a> |
  <a href="./README_RU.md">Русский</a>
</p>

---

## What is Deskive?

Deskive is an open-source workspace collaboration platform that brings together real-time communication, project management, video conferencing, file management, and AI-powered productivity tools into a single, self-hostable application. Think of it as an open-source alternative to Slack + Notion + Zoom + Asana combined.

<p align="center">
  <img src="frontend/public/dashboard.png" alt="Deskive Dashboard" width="800">
  <br>
  <em>Deskive workspace dashboard</em>
</p>

### How It Works

1. **Create a Workspace** -- Set up your team workspace with channels, projects, and file storage
2. **Communicate** -- Real-time chat with threads, reactions, mentions, GIFs, and video calls
3. **Manage Projects** -- Kanban boards, sprints, task dependencies, time tracking
4. **Collaborate** -- Shared notes, whiteboards, documents with digital signatures
5. **AI Assists** -- AutoPilot handles daily briefings, meeting summaries, and smart scheduling

## Why Deskive? (Comparison)

| Feature | Deskive | Slack | Notion | Asana | Microsoft Teams |
|---------|---------|-------|--------|-------|-----------------|
| **Real-time Chat** | ✅ Channels, threads, reactions, GIFs | ✅ Channels, threads | ⚠️ Comments only | ⚠️ Comments only | ✅ Channels, threads |
| **Video Calls** | ✅ HD, recording, transcription | ⚠️ Huddles (basic) | ❌ | ❌ | ✅ Built-in |
| **Project Management** | ✅ Kanban, sprints, time tracking | ❌ | ⚠️ Basic boards | ✅ Full-featured | ⚠️ Planner (basic) |
| **File Management** | ✅ Cloud storage, versioning, sharing | ⚠️ Basic uploads | ⚠️ Embedded | ⚠️ Attachments | ✅ SharePoint |
| **Notes/Docs** | ✅ Block editor, real-time collab | ⚠️ Canvas (basic) | ✅ Full-featured | ❌ | ⚠️ Loop |
| **Calendar** | ✅ Events, meeting rooms, availability | ❌ | ❌ | ⚠️ Timeline | ✅ Built-in |
| **Whiteboard** | ✅ Collaborative workspace | ❌ | ❌ | ❌ | ✅ Whiteboard |
| **AI Tools** | ✅ AutoPilot, meeting intel, memory | ⚠️ AI summary | ⚠️ AI writing | ⚠️ AI status | ✅ Copilot |
| **Forms Builder** | ✅ Forms with analytics | ❌ | ❌ | ✅ Forms | ✅ Forms |
| **Budget Tracking** | ✅ Budgets, expenses, billing | ❌ | ❌ | ❌ | ❌ |
| **Approval Workflows** | ✅ Built-in approval system | ⚠️ Workflow Builder | ❌ | ✅ Approvals | ✅ Power Automate |
| **Bot Automation** | ✅ Custom bots, triggers/actions | ✅ Bolt SDK | ❌ | ⚠️ Rules | ✅ Power Automate |
| **Email Integration** | ✅ Gmail OAuth, SMTP/IMAP | ❌ | ❌ | ⚠️ Email-to-task | ✅ Outlook |
| **Self-Hosted** | ✅ Docker Compose | ❌ | ❌ | ❌ | ❌ |
| **Open Source** | ✅ Apache 2.0 | ❌ | ❌ | ❌ | ❌ |
| **Desktop App** | ✅ Tauri (macOS, Windows, Linux) | ✅ Electron | ✅ Electron | ❌ | ✅ Electron |
| **Mobile App** | ✅ Flutter (iOS, Android) | ✅ Native | ✅ Native | ✅ Native | ✅ Native |
| **Pricing** | 🟢 Free (self-hosted) | 💰 $8.75/user/mo | 💰 $10/user/mo | 💰 $10.99/user/mo | 💰 $4/user/mo |

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

### Docker (Recommended)

```bash
git clone https://github.com/deskive/deskive.git
cd deskive
docker compose --env-file .env.docker up -d
```

### One-Command Start

```bash
./start.sh
```

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
├── docker-compose.yml       # One-command self-hosting
├── start.sh                 # Development startup script
└── .github/workflows/       # CI/CD
```

## Project Activity

<p align="center">
  <img src="https://img.shields.io/github/stars/deskive/deskive?style=for-the-badge&logo=github&color=yellow" alt="GitHub Stars">
  <img src="https://img.shields.io/github/forks/deskive/deskive?style=for-the-badge&logo=github&color=blue" alt="Forks">
  <img src="https://img.shields.io/github/contributors/deskive/deskive?style=for-the-badge&logo=github&color=green" alt="Contributors">
  <img src="https://img.shields.io/github/last-commit/deskive/deskive?style=for-the-badge&logo=github&color=orange" alt="Last Commit">
</p>

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

- [Bug Reports](https://github.com/deskive/deskive/issues/new?template=bug_report.yml)
- [Feature Requests](https://github.com/deskive/deskive/issues/new?template=feature_request.yml)
- [Discussions](https://github.com/deskive/deskive/discussions)

## Contributors

Thank you to all the amazing people who have contributed to Deskive! 🎉

<a href="https://github.com/deskive/deskive/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=deskive/deskive&anon=1&max=100&columns=10" />
</a>

Want to see your face here? Check out our [Contributing Guide](CONTRIBUTING.md) and start contributing today!

## Security

Please report security vulnerabilities responsibly. See [SECURITY.md](SECURITY.md).

## License

This project is licensed under the [Apache License 2.0](LICENSE).

Copyright 2025 Deskive Contributors.
