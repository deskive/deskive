# Deskive Backend

NestJS API server with PostgreSQL, Redis, Qdrant, and Socket.io.

## Setup

```bash
cp .env.example .env
npm install
npm run migrate
npm run start:dev
```

## Tech Stack

- **NestJS 11** with TypeScript
- **PostgreSQL** (raw SQL via pg driver, 148 tables)
- **Redis** (caching, pub/sub)
- **Qdrant** (vector search for AI features)
- **Socket.io** (real-time WebSocket)
- **OpenAI** (AI features, embeddings, transcription)
- **LiveKit** (video conferencing)
- **Stripe** (subscriptions)

## Modules

40+ modules including: auth, workspace, chat, projects, files, calendar, notes, video-calls, notifications, search, ai, bots, forms, documents, whiteboards, integrations, autopilot, budget, approvals, workflows, and more.
