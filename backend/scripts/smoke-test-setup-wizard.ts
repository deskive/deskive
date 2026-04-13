/**
 * Smoke test for the deskive setup wizard.
 *
 * Uses `prompts.inject()` to feed pre-baked answers and verifies the
 * wizard runs end-to-end, writes a .env file, and all selections land.
 *
 * Runs in a sandbox temp dir so nothing real is touched.
 */
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { main as runSetup, renderEnv } from './setup';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const promptsLib = require('prompts');

async function testRenderEnv(): Promise<number> {
  let fail = 0;
  console.log('Test: renderEnv updates existing keys in place');
  {
    const baseline = 'PORT=4005\nSTORAGE_PROVIDER=\nPAYMENT_PROVIDER=\n';
    const updated = renderEnv(baseline, {
      STORAGE_PROVIDER: 'local-fs',
      PAYMENT_PROVIDER: 'stripe',
    });
    if (
      /^STORAGE_PROVIDER=local-fs$/m.test(updated) &&
      /^PAYMENT_PROVIDER=stripe$/m.test(updated)
    ) {
      console.log('  ✅ existing keys rewritten');
    } else {
      console.log('  ❌ existing keys not rewritten');
      fail++;
    }
  }

  console.log('Test: renderEnv appends new keys in an overrides block');
  {
    const baseline = 'PORT=4005\n';
    const updated = renderEnv(baseline, { NEW_VAR: 'hi' });
    if (/NEW_VAR=hi/.test(updated) && /SETUP WIZARD OVERRIDES/.test(updated)) {
      console.log('  ✅ new key appended');
    } else {
      console.log('  ❌ overrides section missing');
      fail++;
    }
  }

  console.log('Test: renderEnv preserves comments');
  {
    const baseline = '# top\nPORT=4005\n# section\nSTORAGE_PROVIDER=none\n';
    const updated = renderEnv(baseline, { STORAGE_PROVIDER: 'local-fs' });
    if (updated.includes('# top') && updated.includes('# section')) {
      console.log('  ✅ comments preserved');
    } else {
      console.log('  ❌ comments lost');
      fail++;
    }
  }
  return fail;
}

async function testFullWizard(): Promise<number> {
  console.log('\nTest: full wizard run with injected answers');

  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'deskive-wizard-'));
  const backendDir = path.join(sandbox, 'backend');
  fs.mkdirSync(backendDir, { recursive: true });

  const fakeEnvExample = [
    '# Sandbox .env.example',
    'PORT=3002',
    'STORAGE_PROVIDER=',
    'AI_PROVIDER=',
    'EMAIL_PROVIDER=',
    'PUSH_PROVIDER=',
    'SEARCH_PROVIDER=',
    'AUTH_PROVIDERS=',
    'VIDEO_PROVIDER=',
    '',
  ].join('\n');
  fs.writeFileSync(path.join(backendDir, '.env.example'), fakeEnvExample);
  const envPath = path.join(backendDir, '.env');
  const envExamplePath = path.join(backendDir, '.env.example');

  // Wizard prompts in order: storage, ai, email, push, search, auth, video, then write confirm.
  promptsLib.inject([
    'local-fs',
    'openai',
    'smtp',
    'fcm',
    'pg-trgm',
    'local,google,github,magic-link',
    'livekit',
    true, // write?
  ]);

  try {
    await runSetup({ envPath, envExamplePath });
  } catch (e: any) {
    console.log(`  ❌ wizard threw: ${e.message}`);
    fs.rmSync(sandbox, { recursive: true, force: true });
    return 1;
  }

  if (!fs.existsSync(envPath)) {
    console.log('  ❌ .env was not created');
    fs.rmSync(sandbox, { recursive: true, force: true });
    return 1;
  }

  const written = fs.readFileSync(envPath, 'utf-8');
  const expectations: Array<[string, string]> = [
    ['STORAGE_PROVIDER', 'local-fs'],
    ['AI_PROVIDER', 'openai'],
    ['EMAIL_PROVIDER', 'smtp'],
    ['PUSH_PROVIDER', 'fcm'],
    ['SEARCH_PROVIDER', 'pg-trgm'],
    ['AUTH_PROVIDERS', 'local,google,github,magic-link'],
    ['VIDEO_PROVIDER', 'livekit'],
  ];
  let fail = 0;
  for (const [key, expected] of expectations) {
    const re = new RegExp(`^${key}=${expected}$`, 'm');
    if (re.test(written)) {
      console.log(`  ✅ ${key}=${expected}`);
    } else {
      console.log(`  ❌ ${key} not set to ${expected}`);
      const actual = written.split('\n').find((l) => l.startsWith(`${key}=`));
      console.log(`     actual: ${actual ?? '(missing)'}`);
      fail++;
    }
  }
  fs.rmSync(sandbox, { recursive: true, force: true });
  return fail;
}

async function main(): Promise<void> {
  console.log('=== Deskive setup wizard smoke test ===\n');
  let fail = 0;
  fail += await testRenderEnv();
  fail += await testFullWizard();
  console.log(`\n=== Result: ${fail === 0 ? 'PASS' : `${fail} failures`} ===`);
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});
