# Self-Hosted Migration Guide

This is the open-source self-hosted edition of Deskive. The original codebase
depended on a proprietary all-in-one BaaS SDK; the migration replaces that
SDK with standard, self-hostable open-source infrastructure.

This guide tells you which pieces are **wired up and ready**, which are
**stubbed** and need provider credentials, and how to fill in the rest.

---

## What you need to run Deskive

- **PostgreSQL 14+** (or any pg-compatible Postgres-as-a-service)
- **Node.js 18+**
- **Redis** (optional but recommended for sessions/cache)
- **An S3-compatible object storage** (any one of: AWS S3, Cloudflare R2, MinIO,
  Backblaze B2, DigitalOcean Spaces)
- **An SMTP provider** (any one of: Resend, SendGrid, Mailgun, AWS SES,
  Postmark, Gmail, self-hosted Postfix)
- **An LLM API key** (only if you want AI features: OpenAI, Anthropic, etc.)

---

## What's wired up out of the box

These are real implementations, not stubs:

### Database (`pg` + raw SQL)
- All CRUD operations through `DatabaseService.findOne / findMany / insert / update / delete / etc.`
- Chainable `QueryBuilder` for complex queries
- Run migrations: `psql $DATABASE_URL -f migrations/001_initial.sql`
  then `psql $DATABASE_URL -f migrations/002_auth_users.sql`

### Auth (`bcrypt` + `jsonwebtoken` + `users` table)
- `db.signUp / signIn / refreshSession / resetPassword / changePassword / verifyEmail`
- `db.auth.register / signIn / refreshToken / requestPasswordReset / changePassword / deleteUser`
- Password hashing with bcrypt (10 rounds, configurable)
- JWT access tokens (default 7d, configurable)
- Refresh token rotation stored in `auth_refresh_tokens` table
- Source: `src/modules/database/auth-helpers.ts`

Required env vars:
```
JWT_SECRET=<long random string>
JWT_EXPIRES_IN=7d            # optional
REFRESH_TOKEN_EXPIRES_DAYS=30 # optional
BCRYPT_ROUNDS=10              # optional
```

### Storage (S3-compatible via `@aws-sdk/client-s3`)
- `db.uploadFile / downloadFile / deleteFileFromStorage / getPublicUrl / createSignedUrl`
- Works with S3, R2, MinIO, Spaces, B2, etc. out of the box
- Source: `src/modules/database/storage-helpers.ts`

Required env vars (Cloudflare R2 example):
```
STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_REGION=auto
STORAGE_ACCESS_KEY_ID=<your R2 access key>
STORAGE_SECRET_ACCESS_KEY=<your R2 secret key>
STORAGE_BUCKET_DEFAULT=deskive-uploads
STORAGE_PUBLIC_BASE_URL=https://cdn.your-domain.com  # optional, for getPublicUrl
```

For AWS S3:
```
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=<aws access key>
STORAGE_SECRET_ACCESS_KEY=<aws secret key>
STORAGE_BUCKET_DEFAULT=deskive-uploads
# leave STORAGE_ENDPOINT unset
```

For MinIO (self-hosted):
```
STORAGE_ENDPOINT=https://minio.your-domain.com
STORAGE_REGION=us-east-1
STORAGE_ACCESS_KEY_ID=minioadmin
STORAGE_SECRET_ACCESS_KEY=minioadmin
STORAGE_BUCKET_DEFAULT=deskive-uploads
STORAGE_FORCE_PATH_STYLE=true
```

### Email (SMTP via `nodemailer`)
- `db.sendEmail(to, subject, html, text?, options?)`
- Works with any SMTP provider
- Source: `src/modules/database/email-helpers.ts`

Required env vars (Resend example):
```
SMTP_HOST=smtp.resend.com
SMTP_PORT=587
SMTP_USER=resend
SMTP_PASSWORD=re_<your resend api key>
SMTP_FROM=Deskive <noreply@your-domain.com>
```

For AWS SES:
```
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=<ses smtp username>
SMTP_PASSWORD=<ses smtp password>
SMTP_FROM=noreply@your-verified-domain.com
```

---

## What's still stubbed (no-op until you wire it up)

These methods exist on `DatabaseService` so the codebase compiles, but they
log a warning at runtime and return empty/no-op results. Each one is a
clearly-marked drop-in point for a real implementation.

### AI (LLM features)
- `db.getAI()`, `db.generateText()`, `db.generateImage()`
- `db.client.ai.transcribeAudio / translateText / summarizeText / generateText`

To wire up: install your LLM provider's SDK and replace the stub method
bodies in `src/modules/database/database.service.ts`. Suggested providers:
- **OpenAI** (`openai` package — already installed)
- **Anthropic** (`@anthropic-ai/sdk`)
- **Google Gemini** (`@google/genai`)

The deskive AI services already have an `aiProvider` getter alias that
points at `db.getAI()`, so once `getAI()` returns a real client every
caller works automatically.

### Vector search (semantic search, embeddings)
- `db.ensureVectorCollection / upsertVectors / searchVectors / scrollVectors / deleteVectorsByFilter`

To wire up, pick one:
- **pgvector** — add `CREATE EXTENSION vector;` and an `embedding vector(1536)`
  column to relevant tables. No new service needed.
- **Qdrant** — `npm install @qdrant/js-client-rest` and replace the stubs
  with `QdrantClient` calls.
- **Pinecone** — `npm install @pinecone-database/pinecone`.

### Video conferencing — multi-provider, picks one with `VIDEO_PROVIDER`

Deskive ships with a pluggable video provider system. Pick the one that
fits your stack and infra appetite by setting `VIDEO_PROVIDER` in `.env`:

| Provider | Setup time | Infra | Recording | Cost (small) |
|---|---|---|---|---|
| `jitsi` (default-recommended) | **0 minutes** | **none** (uses public meet.jit.si) | Optional (paid JaaS or self-host Jibri) | **Free** |
| `livekit` | ~10 minutes (LiveKit Cloud signup) | Cloud or self-hosted | ✅ Full (egress → S3-compat storage) | Free tier: 50 mins/mo |
| `daily` | ~5 minutes (Daily.co signup) | Daily-hosted | ✅ Cloud recording (paid plan) | Free tier: 10k participant minutes/mo |
| `none` | n/a | n/a | n/a | n/a — video disabled |

The active provider is selected by `VIDEO_PROVIDER` and queried at runtime
via the `LivekitVideoService` façade (despite the legacy filename, it now
supports all four providers). The frontend discovers which provider is
active by calling `GET /api/v1/video-provider/info`.

#### Option 1: Jitsi Meet (easiest — zero infra)

```env
VIDEO_PROVIDER=jitsi
```

That's it. With no other config, deskive uses the **free public**
`meet.jit.si` instance — no signup, no API key, no infra. Rooms work,
participants work, screen-share works, chat works. Recording is the only
feature missing. Perfect for self-hosters, hobbyists, and small teams.

For a private deployment, point at your own Jitsi server or Jitsi as a
Service (JaaS):
```env
VIDEO_PROVIDER=jitsi
JITSI_DOMAIN=meet.your-domain.com    # or 8x8.vc for JaaS
JITSI_APP_ID=vpaas-magic-cookie-xxx  # JaaS app ID (optional)
JITSI_PRIVATE_KEY=-----BEGIN ...     # RS256 PEM for JWT auth (optional)
JITSI_KEY_ID=vpaas-magic-cookie-xxx/abc123  # JaaS key ID (optional)
```

Frontend: load `https://<domain>/external_api.js` as a `<script>` tag,
or `npm install @jitsi/react-sdk`.

#### Option 2: LiveKit (full features, recommended for production)

```env
VIDEO_PROVIDER=livekit
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=APIxxxxxxxxxxxx
LIVEKIT_API_SECRET=secretxxxxxxxxxx

# Optional: enable recording uploads to S3-compatible storage
# (uses the same STORAGE_* env vars as the rest of the app)
LIVEKIT_RECORDING_BUCKET=deskive-recordings
LIVEKIT_WEBHOOK_SECRET=xxxxxx        # for webhook signature validation
```

Sign up at https://livekit.io/cloud (free tier covers most small teams),
or self-host: https://docs.livekit.io/realtime/self-hosting/local/.

`livekit-server-sdk` is listed as an `optionalDependencies` so it
auto-installs on `npm install`. If it fails (e.g. no network), the app
still runs as long as you don't pick `VIDEO_PROVIDER=livekit`.

Frontend: `npm install livekit-client`.

#### Option 3: Daily.co (managed, REST API, no SDK on server)

```env
VIDEO_PROVIDER=daily
DAILY_API_KEY=xxxxxxxxxxxxxxxxxxxxx
DAILY_DOMAIN=mycompany               # your-company.daily.co subdomain
DAILY_RECORDING_ENABLED=false        # set true if your Daily plan supports cloud recording
```

Sign up at https://dashboard.daily.co/. The provider uses Daily's REST
API directly (via `fetch()`) — no server SDK needed. Free tier: 10,000
monthly participant minutes.

Frontend: `npm install @daily-co/daily-js` or use the Daily Prebuilt
iframe (zero JS — just embed `<iframe src={joinUrl} />`).

#### Option 4: Disabled

```env
VIDEO_PROVIDER=none
```

Video features are disabled. The frontend should call
`/api/v1/video-provider/info` and hide call UI when `provider === "none"`.
This is the default if `VIDEO_PROVIDER` is unset.

#### Adding a new provider

1. Create `src/modules/video-calls/providers/<name>.provider.ts`
   implementing the `VideoProvider` interface from `video-provider.interface.ts`.
2. Register it in the `createVideoProvider()` factory in `providers/index.ts`.
3. Document required env vars in this file.

The interface is intentionally narrow (room CRUD + tokens + participants
+ recording) so adding a new provider takes ~200 lines.

### Push notifications
- `db.sendPushNotification(to, title, body, data?)`

To wire up: install `firebase-admin`, register a service account, and
replace the stub with `admin.messaging().send(...)`. Or use OneSignal
(`onesignal-node`) or `web-push` for browser push.

### Realtime pub/sub
- `db.publishToChannel(channel, data)`, `db.unsubscribe(...)`

To wire up: use the existing `socket.io` setup (already wired in the
NestJS gateways) or wire Redis pub/sub for cross-instance broadcast.

### OAuth providers
- `db.auth.getOAuthUrl(provider, redirect)` returns an empty URL.

To wire up: implement OAuth flows directly in `AuthController` using
`passport-google-oauth20`, `passport-github2`, etc., and store the tokens
on the `users` row (`oauth_provider`, `oauth_provider_id` columns are
already in the schema).

---

## Quick start

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your DATABASE_URL, JWT_SECRET, STORAGE_*, SMTP_*

# 3. Run migrations
psql $DATABASE_URL -f migrations/001_initial.sql
psql $DATABASE_URL -f migrations/002_auth_users.sql

# 4. Start the backend
npm run start:dev
```

You should be able to register a user, log in, upload files, and receive
emails immediately. AI/video/vector/push features will log warnings until
you wire up the providers above.
