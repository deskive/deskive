# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Open-source release under Apache License 2.0
- PostgreSQL direct database layer (replaces proprietary backend)
- Cloudflare R2 storage service (S3-compatible)
- Redis caching and pub/sub service
- OpenAI AI provider service (direct integration)
- SQL migration system with 148 tables
- Community infrastructure (CONTRIBUTING, CODE_OF_CONDUCT, SECURITY)
- GitHub issue/PR templates and Dependabot

### Changed
- Migrated all database operations to raw PostgreSQL via pg driver
- Migrated storage operations to Cloudflare R2 via AWS SDK
- Migrated video conferencing references to LiveKit
- Replaced all proprietary SDK dependencies with standard open-source alternatives

### Removed
- Proprietary backend SDK dependency
- All hardcoded credentials from example files
- Internal development documentation
- Legacy frontend (Next.js)

## [0.1.0] - 2025-01-01

### Added
- Real-time chat with channels, threads, reactions, and mentions
- Video conferencing with LiveKit (HD calls, screen sharing, recording)
- Project management with Kanban boards, sprints, and time tracking
- File management with cloud storage and sharing
- Calendar with event scheduling and meeting rooms
- Block-based notes with collaboration
- Document management with digital signatures
- Collaborative whiteboard
- AI AutoPilot agent with daily briefings
- Meeting intelligence (transcription, translation, summarization)
- Email integration (Gmail OAuth, SMTP/IMAP)
- Forms builder with analytics
- Budget management and expense tracking
- Approval workflows
- Bot automation framework
- Integrations (Slack, Google Drive, Dropbox, GitHub, and more)
- Global search with semantic capabilities
- Stripe subscription billing
- i18n support (English, Japanese)
- Tauri desktop app (macOS, Windows)
