/**
 * Deskive first-run setup wizard.
 *
 * Interactive CLI that walks a new user through picking providers for each
 * pluggable infrastructure concern, writes a working `.env` file, and prints
 * next steps. Every prompt has a free / zero-infra default marked in
 * (parentheses) so the fastest path is just pressing Enter through the
 * whole wizard.
 *
 * Run with:
 *    cd backend && npx ts-node scripts/setup.ts
 *    cd backend && npm run setup
 *
 * SAFETY:
 * - Never overwrites an existing `.env` without confirmation
 * - Prints a summary before writing
 * - Works fully offline — no network calls
 *
 * This wizard is the honest source of truth for what deskive currently
 * supports. As provider-adapter PRs land on main, flip the matching
 * concern's `status` from 'planned' to 'implemented' — the prompts
 * reflect the real state of the repo.
 */

import * as fs from 'fs';
import * as path from 'path';

// `prompts` is CJS. With allowSyntheticDefaultImports but no
// esModuleInterop the ES default import is undefined at runtime for CJS
// modules, so we require() instead.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const prompts: typeof import('prompts') = require('prompts');

// =====================================================================
// Provider catalog
// =====================================================================

type ProviderStatus = 'implemented' | 'planned';

interface ProviderChoice {
  value: string;
  title: string;
  description: string;
  isDefault?: boolean;
  envVars?: string[];
}

interface ProviderConcern {
  key: string;
  label: string;
  description: string;
  envVar: string;
  status: ProviderStatus;
  choices: ProviderChoice[];
}

const PROVIDERS: ProviderConcern[] = [
  {
    key: 'storage',
    label: 'File storage',
    description: 'Attachments, avatars, exports, workspace uploads.',
    envVar: 'STORAGE_PROVIDER',
    status: 'planned', // PR #28 — flip to 'implemented' once merged
    choices: [
      {
        value: 'local-fs',
        title: 'Local filesystem  (zero infra)  [planned: #28]',
        description: 'Writes to ./data/uploads. Zero signup, zero cost.',
        isDefault: true,
        envVars: ['LOCAL_FS_PATH', 'LOCAL_FS_PUBLIC_URL'],
      },
      {
        value: 'r2',
        title: 'Cloudflare R2  (current)',
        description: '10GB free forever. What deskive uses today.',
        envVars: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
      },
      {
        value: 's3',
        title: 'AWS S3  [planned: #28]',
        description: '5GB free for 12 months.',
        envVars: ['STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_BUCKET', 'STORAGE_REGION'],
      },
      {
        value: 'minio',
        title: 'MinIO  (self-hosted S3)  [planned: #28]',
        description: 'Run via docker compose --profile minio.',
        envVars: ['STORAGE_ACCESS_KEY_ID', 'STORAGE_SECRET_ACCESS_KEY', 'STORAGE_ENDPOINT'],
      },
      {
        value: 'b2',
        title: 'Backblaze B2  [planned: #28]',
        description: '10GB free, cheapest egress of the big names.',
      },
      {
        value: 'gcs',
        title: 'Google Cloud Storage  [planned: #28]',
        description: 'Requires @google-cloud/storage (optional dep).',
        envVars: ['GCS_PROJECT_ID'],
      },
      {
        value: 'azure',
        title: 'Azure Blob Storage  [planned: #28]',
        description: 'Requires @azure/storage-blob (optional dep).',
        envVars: ['AZURE_STORAGE_CONNECTION_STRING'],
      },
      {
        value: 'none',
        title: 'None  [planned: #28]',
        description: 'Storage features disabled.',
      },
    ],
  },
  {
    key: 'ai',
    label: 'AI / LLM',
    description: 'Autopilot, semantic search, summaries, transcription.',
    envVar: 'AI_PROVIDER',
    status: 'planned', // PR #29
    choices: [
      {
        value: 'openai',
        title: 'OpenAI  (current default)',
        description: 'GPT-4o + vision + embeddings. What deskive uses today.',
        isDefault: true,
        envVars: ['OPENAI_API_KEY'],
      },
      {
        value: 'anthropic',
        title: 'Anthropic Claude  [planned: #29]',
        description: 'Best for long-context reasoning.',
        envVars: ['ANTHROPIC_API_KEY'],
      },
      {
        value: 'gemini',
        title: 'Google Gemini  [planned: #29]',
        description: 'Cheap multimodal + long context.',
        envVars: ['GEMINI_API_KEY'],
      },
      {
        value: 'ollama',
        title: 'Ollama  (local, fully offline)  [planned: #29]',
        description: 'Run LLMs on your own machine. Zero API cost.',
      },
      {
        value: 'groq',
        title: 'Groq  [planned: #29]',
        description: 'Ultra-low latency Llama / Mixtral / DeepSeek.',
        envVars: ['GROQ_API_KEY'],
      },
      {
        value: 'none',
        title: 'None  [planned: #29]',
        description: 'AI features disabled.',
      },
    ],
  },
  {
    key: 'email',
    label: 'Email (transactional)',
    description: 'Magic-link sign-in, workspace invites, notifications.',
    envVar: 'EMAIL_PROVIDER',
    status: 'planned', // PR #30
    choices: [
      {
        value: 'smtp',
        title: 'SMTP  (any mail server)',
        description: 'Works with Gmail app passwords, Mailtrap, Postfix.',
        isDefault: true,
        envVars: ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD'],
      },
      {
        value: 'resend',
        title: 'Resend  [planned: #30]',
        description: 'Modern API, generous free tier.',
        envVars: ['RESEND_API_KEY'],
      },
      {
        value: 'sendgrid',
        title: 'SendGrid  [planned: #30]',
        description: 'Enterprise standard, platform-level.',
        envVars: ['SENDGRID_API_KEY'],
      },
      {
        value: 'postmark',
        title: 'Postmark  [planned: #30]',
        description: 'Fast transactional, message streams.',
        envVars: ['POSTMARK_API_KEY'],
      },
      {
        value: 'ses',
        title: 'AWS SES  [planned: #30]',
        description: 'Cheapest at scale; no SDK, uses SigV4.',
        envVars: ['AWS_SES_ACCESS_KEY_ID', 'AWS_SES_SECRET_ACCESS_KEY'],
      },
      {
        value: 'mailgun',
        title: 'Mailgun  [planned: #30]',
        description: 'US + EU region routing.',
        envVars: ['MAILGUN_API_KEY', 'MAILGUN_DOMAIN'],
      },
      {
        value: 'none',
        title: 'None  [planned: #30]',
        description: 'Transactional email disabled.',
      },
    ],
  },
  {
    key: 'push',
    label: 'Push notifications',
    description: 'Web push + mobile FCM notifications for chat and tasks.',
    envVar: 'PUSH_PROVIDER',
    status: 'planned', // PR #31
    choices: [
      {
        value: 'fcm',
        title: 'Firebase Cloud Messaging  (current default)',
        description: 'What deskive uses today. Android + iOS + Web.',
        isDefault: true,
        envVars: ['FIREBASE_SERVICE_ACCOUNT'],
      },
      {
        value: 'webpush',
        title: 'Web Push (VAPID)  [planned: #31]',
        description: 'Browser only, no vendor lock-in.',
        envVars: ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY'],
      },
      {
        value: 'onesignal',
        title: 'OneSignal  [planned: #31]',
        description: 'Managed push + analytics.',
        envVars: ['ONESIGNAL_APP_ID', 'ONESIGNAL_REST_API_KEY'],
      },
      {
        value: 'expo',
        title: 'Expo  [planned: #31]',
        description: 'For React Native / Expo clients.',
      },
      {
        value: 'none',
        title: 'None  [planned: #31]',
        description: 'Push disabled.',
      },
    ],
  },
  {
    key: 'search',
    label: 'Keyword search',
    description: 'Full-text + faceted search over workspace content.',
    envVar: 'SEARCH_PROVIDER',
    status: 'planned', // PR #32
    choices: [
      {
        value: 'pg-trgm',
        title: 'Postgres pg_trgm  (zero infra)  [planned: #32]',
        description: 'Uses existing Postgres. Recommended default.',
        isDefault: true,
      },
      {
        value: 'meilisearch',
        title: 'Meilisearch  [planned: #32]',
        description: 'Best typo tolerance.',
        envVars: ['MEILISEARCH_HOST'],
      },
      {
        value: 'typesense',
        title: 'Typesense  [planned: #32]',
        description: 'Fast, simple, self-hosted.',
        envVars: ['TYPESENSE_HOST', 'TYPESENSE_API_KEY'],
      },
      {
        value: 'none',
        title: 'None  [planned: #32]',
        description: 'Keyword search disabled (vector search via Qdrant still works).',
      },
    ],
  },
  {
    key: 'auth',
    label: 'Auth / SSO providers',
    description: 'Which login buttons to show: email+password, Google, GitHub, magic-link, etc.',
    envVar: 'AUTH_PROVIDERS',
    status: 'planned', // PR #33
    choices: [
      {
        value: 'local,google,github,magic-link',
        title: 'Local + Google + GitHub + magic-link  [planned: #33]',
        description: 'All four sign-in paths enabled.',
        isDefault: true,
      },
      {
        value: 'local,magic-link',
        title: 'Local + magic-link only  [planned: #33]',
        description: 'Password + passwordless. Good for private beta.',
      },
      {
        value: 'local',
        title: 'Local only (email + password)',
        description: 'The always-available baseline.',
      },
    ],
  },
  {
    key: 'video',
    label: 'Video conferencing',
    description: 'Workspace huddles and meetings.',
    envVar: 'VIDEO_PROVIDER',
    status: 'implemented', // lives in modules/video-calls already
    choices: [
      {
        value: 'livekit',
        title: 'LiveKit  (current default)',
        description: 'Self-hostable, open source.',
        isDefault: true,
        envVars: ['LIVEKIT_HOST', 'LIVEKIT_API_KEY', 'LIVEKIT_API_SECRET'],
      },
      {
        value: 'jitsi',
        title: 'Jitsi Meet',
        description: 'Fully self-hostable, free.',
      },
      {
        value: 'agora',
        title: 'Agora',
        description: 'Global low-latency, requires agora-token (optional dep).',
      },
      {
        value: 'daily',
        title: 'Daily.co',
        description: 'Managed WebRTC.',
      },
      {
        value: 'none',
        title: 'None',
        description: 'Video calls disabled.',
      },
    ],
  },
];

// =====================================================================
// Wizard implementation
// =====================================================================

const ROOT = path.resolve(__dirname, '..');
const ENV_PATH = path.join(ROOT, '.env');
const ENV_EXAMPLE_PATH = path.join(ROOT, '.env.example');

interface WizardResult {
  updates: Record<string, string>;
  needsFilling: string[];
  selections: Array<{ concern: ProviderConcern; choice: ProviderChoice }>;
}

function divider(ch = '=', width = 70): void {
  console.log(ch.repeat(width));
}

function header(title: string): void {
  console.log('');
  divider();
  console.log(`  ${title}`);
  divider();
  console.log('');
}

function readExistingEnv(envPath: string): Record<string, string> | null {
  if (!fs.existsSync(envPath)) return null;
  const raw = fs.readFileSync(envPath, 'utf-8');
  const out: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

/**
 * Splice `updates` into the baseline .env contents. Existing keys get
 * rewritten in place; new keys are appended in a trailing "Setup Wizard
 * Overrides" section. Preserves comments and blank lines.
 */
function renderEnv(baseline: string, updates: Record<string, string>): string {
  const lines = baseline.split('\n');
  const touched = new Set<string>();
  const out = lines.map((line) => {
    const m = line.match(/^(\s*)([A-Z0-9_]+)(\s*=\s*)(.*)$/);
    if (!m) return line;
    const key = m[2];
    if (key in updates) {
      touched.add(key);
      return `${m[1]}${key}${m[3]}${updates[key]}`;
    }
    return line;
  });

  const untouched = Object.entries(updates).filter(([k]) => !touched.has(k));
  if (untouched.length > 0) {
    out.push('');
    out.push('# =====================================================');
    out.push('# SETUP WIZARD OVERRIDES');
    out.push('# =====================================================');
    for (const [k, v] of untouched) out.push(`${k}=${v}`);
  }
  return out.join('\n');
}

async function runWizard(
  existingEnv: Record<string, string> | null,
): Promise<WizardResult> {
  header('Deskive first-run setup');

  console.log('This wizard picks providers for each piece of infrastructure.');
  console.log('Every question has a zero-infra default marked (in parentheses).');
  console.log('Press Enter to accept the default and keep going.');
  console.log('');
  console.log('Provider adapters that are not yet implemented are marked');
  console.log('[planned: #NN] — picking one writes the env var for the current');
  console.log('hardcoded implementation so your .env is usable today, and the');
  console.log('wizard will reflect the real options once the PR lands.');
  console.log('');

  const result: WizardResult = {
    updates: {},
    needsFilling: [],
    selections: [],
  };

  for (const concern of PROVIDERS) {
    divider('-');
    console.log(`  ${concern.label}`);
    console.log(`  ${concern.description}`);
    if (concern.status === 'planned') {
      console.log('  (adapter pattern not implemented yet — see GitHub issues)');
    }
    divider('-');

    const defaultIdx = Math.max(
      0,
      concern.choices.findIndex((c) => c.isDefault),
    );

    const { pick } = await prompts({
      type: 'select',
      name: 'pick',
      message: concern.label,
      initial: defaultIdx,
      choices: concern.choices.map((c) => ({
        title: c.title,
        description: c.description,
        value: c.value,
      })),
    });
    console.log('');

    if (pick === undefined) process.exit(0); // ctrl-c

    const choice = concern.choices.find((c) => c.value === pick)!;
    result.selections.push({ concern, choice });
    result.updates[concern.envVar] = pick;

    for (const key of choice.envVars ?? []) {
      if (!existingEnv?.[key] && !result.updates[key]) {
        result.needsFilling.push(key);
      }
    }
  }

  return result;
}

function printSummary(result: WizardResult): void {
  header('Summary');
  for (const { concern, choice } of result.selections) {
    const flag = concern.status === 'implemented' ? 'ready' : 'planned';
    console.log(
      `  ${concern.envVar.padEnd(22)} ${choice.value.padEnd(14)} [${flag}]`,
    );
  }
  console.log('');
  if (result.needsFilling.length > 0) {
    console.log('The following env vars still need values — open .env and fill them in:');
    for (const k of result.needsFilling) console.log(`  - ${k}`);
    console.log('');
  } else {
    console.log('All selected providers are ready to boot (no extra secrets needed).');
    console.log('');
  }
}

export async function main(opts: { envPath?: string; envExamplePath?: string } = {}): Promise<void> {
  const envPath = opts.envPath ?? ENV_PATH;
  const envExamplePath = opts.envExamplePath ?? ENV_EXAMPLE_PATH;

  const existingEnv = readExistingEnv(envPath);

  if (existingEnv) {
    console.log(`Found existing .env at ${envPath}`);
    const { keep } = await prompts({
      type: 'confirm',
      name: 'keep',
      message: 'Update it in place? (No will regenerate from .env.example)',
      initial: true,
    });
    console.log('');
    if (keep === undefined) return;
  } else {
    console.log(`No .env yet — will create from .env.example`);
  }

  const result = await runWizard(existingEnv);
  printSummary(result);

  const { write } = await prompts({
    type: 'confirm',
    name: 'write',
    message: `Write these selections to ${path.relative(process.cwd(), envPath)}?`,
    initial: true,
  });

  if (!write) {
    console.log('Aborted. Nothing was written.');
    return;
  }

  const baseline = fs.existsSync(envPath)
    ? fs.readFileSync(envPath, 'utf-8')
    : fs.readFileSync(envExamplePath, 'utf-8');

  const rendered = renderEnv(baseline, result.updates);
  fs.writeFileSync(envPath, rendered, 'utf-8');

  console.log('');
  console.log(`.env written: ${envPath}`);
  console.log('');
  console.log('Next steps:');
  console.log('  1. (optional) Fill in any remaining secrets in .env');
  console.log('  2. docker compose up -d              # Postgres + Redis');
  console.log('  3. npm run migrate                   # apply schema');
  console.log('  4. npm run start:dev                 # start the backend');
  console.log('');
  console.log('Docs: see backend/docs/providers/ for per-provider setup guides.');
  console.log('Health: once running, GET http://localhost:3002/api/v1/health/providers');
  console.log('');
}

export { renderEnv, runWizard, readExistingEnv, PROVIDERS };

if (require.main === module) {
  main().catch((err) => {
    console.error('\nSetup wizard crashed:', err);
    process.exit(1);
  });
}
