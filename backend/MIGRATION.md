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

Deskive ships with a pluggable video provider system supporting **5 of
the most popular video platforms** in the world. Pick whichever fits
your stack and infra appetite by setting `VIDEO_PROVIDER` in `.env`:

| Provider | Setup time | Infra | Recording | Cost (small teams) | Frontend SDK |
|---|---|---|---|---|---|
| `jitsi` ⭐ | **0 min** | **none** (uses public meet.jit.si) | Paid JaaS or self-host Jibri | **Free** | `<script>` tag |
| `whereby` ⭐ | **2 min** | none (just API key) | Host-initiated | Free tier: 100 min/mo | **iframe only** |
| `daily` | ~5 min | Daily-hosted | ✅ Cloud (paid) | Free tier: 10k participant min/mo | `@daily-co/daily-js` |
| `livekit` | ~10 min | Cloud or self-host | ✅ Full (egress → S3) | Free tier: 50 min/mo | `livekit-client` |
| `agora` | ~10 min | Agora-hosted (global edge) | ✅ Cloud Recording (separate API) | Free tier: 10k min/mo | `agora-rtc-sdk-ng` |
| `none` | n/a | n/a | n/a | video disabled | n/a |

⭐ = recommended for users who want "video that just works" with the
least possible infrastructure burden.

The active provider is picked by `VIDEO_PROVIDER` and queried at runtime
via the `LivekitVideoService` façade (despite the legacy filename, it now
supports all 6 options). The frontend discovers which provider is active
by calling `GET /api/v1/video-provider/info`.

#### Which one should you pick?

- **You want the absolute easiest possible thing → `whereby`**.
  Two env vars (`VIDEO_PROVIDER=whereby` + `WHEREBY_API_KEY`), and the
  entire frontend integration is `<iframe src={room.joinUrl} />`. No
  client SDK to install, no JWT auth, no WebSocket plumbing. Up to 200
  participants per room. Free for the first 100 monthly meeting minutes.

- **You want zero signup, zero infra, zero cost → `jitsi`**.
  Set `VIDEO_PROVIDER=jitsi` and that's it — uses the free public
  `meet.jit.si` instance. No API key, no signup. Recording is the only
  feature you don't get on the public instance.

- **You want a polished managed product with the best DX → `daily`**.
  ~5-minute signup at https://dashboard.daily.co/, then `DAILY_API_KEY` +
  `DAILY_DOMAIN`. Daily Prebuilt also offers a no-code iframe like
  Whereby, plus a full SDK for custom UIs.

- **You want full features and don't mind running infra (or trusting
  LiveKit Cloud) → `livekit`**. The strongest open-source story.
  Server-side recording, egress to S3, custom layouts, simulcast. Free
  tier on LiveKit Cloud or self-host with Docker.

- **You want a battle-tested global low-latency platform, especially for
  Asia → `agora`**. ~10M daily active users on the platform. Best in
  class for high-density / high-quality use cases. Cloud Recording is a
  separate Agora product.

#### Option 1: Whereby Embedded (easiest paid)

```env
VIDEO_PROVIDER=whereby
WHEREBY_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxx
WHEREBY_ROOM_MODE=normal              # "normal" (200 ppl) or "group" (large)
```

Sign up at https://whereby.com/org/signup, then **Settings → Embedded
API → Create API key**. The provider talks to `https://api.whereby.dev/v1/`
directly — no server SDK needed.

Frontend integration is the simplest of any provider:

```jsx
function Call({ roomName }) {
  const [url, setUrl] = useState('');
  useEffect(() => {
    fetch(`/api/v1/video/rooms/${roomName}/join`)
      .then(r => r.json()).then(d => setUrl(d.url));
  }, [roomName]);
  return url ? (
    <iframe src={url}
      allow="camera; microphone; fullscreen; display-capture; autoplay"
      style={{ width: '100%', height: '600px', border: 0 }} />
  ) : null;
}
```

That's the entire frontend. No SDK install, no build step.

#### Option 2: Jitsi Meet (easiest free)

```env
VIDEO_PROVIDER=jitsi
```

That's it. With no other config, deskive uses the **free public**
`meet.jit.si` instance — no signup, no API key, no infra. Rooms work,
participants work, screen-share works, chat works. Recording is the only
feature missing.

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

#### Option 3: Daily.co (managed, polished SDK)

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

#### Option 4: LiveKit (full features, OSS-friendly)

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

#### Option 5: Agora (most popular globally)

```env
VIDEO_PROVIDER=agora
AGORA_APP_ID=xxxxxxxxxxxxxxxxxxxxxxxxx
AGORA_APP_CERTIFICATE=xxxxxxxxxxxxxxxxxxxxxx
AGORA_TOKEN_TTL=86400                # optional, default 24h
```

Sign up at https://www.agora.io/. From the Agora Console, create a
project and copy the **App ID**. Enable the **App Certificate** under
"Security" — copy that too. ~10 minutes total. Free tier: 10,000 minutes
per month across audio + video.

Agora's primitive is "channels" not "rooms", but the provider treats
them 1:1 so the rest of the app stays agnostic. The user identity you
pass to `generateToken()` is hashed to a stable uint32 uid (Agora's
native identity type).

`agora-token` is listed as an `optionalDependencies`. Recording requires
the separate Agora Cloud Recording REST API (different product, separate
pricing) — the provider throws a clear error if you call `startRecording`
without integrating it.

Frontend: `npm install agora-rtc-sdk-ng`. Join a channel with:
```js
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
await client.join(appId, channelName, token, uid);
```

#### Option 6: Disabled

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
