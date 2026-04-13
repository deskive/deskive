import { ConfigService } from '@nestjs/config';
import { createSearchProvider } from '../src/modules/search-provider/providers';

async function testMeilisearch() {
  console.log('\n=== Testing Live Meilisearch ===\n');

  const config = new ConfigService({
    SEARCH_PROVIDER: 'meilisearch',
    MEILI_URL: 'http://localhost:7700',
    MEILI_MASTER_KEY: 'test_master_key',
  });

  const provider = createSearchProvider({ config, pgQuery: async () => ({}) as any });

  console.log('Provider:', provider.name);
  console.log('Available:', provider.isAvailable());

  // Test indexing
  await provider.indexDocument('test_workspaces', {
    id: 'ws-1',
    title: 'Test Workspace',
    content: 'Hello world from Meilisearch',
    workspace_id: 'test-ws',
  });

  console.log('✅ Document indexed');

  // Test search
  const results = await provider.search('test_workspaces', { q: 'hello' });
  console.log('✅ Search results:', results.hits.length, 'hits');
  if (results.hits.length > 0) {
    console.log('   First hit:', results.hits[0].document);
  }
}

async function testTypesense() {
  console.log('\n=== Testing Live Typesense ===\n');

  const config = new ConfigService({
    SEARCH_PROVIDER: 'typesense',
    TYPESENSE_URL: 'http://localhost:8108',
    TYPESENSE_API_KEY: 'test_api_key',
  });

  const provider = createSearchProvider({ config, pgQuery: async () => ({}) as any });

  console.log('Provider:', provider.name);
  console.log('Available:', provider.isAvailable());

  // Test indexing
  await provider.indexDocument('test_workspaces', {
    id: 'ws-2',
    name: 'Test Workspace 2',
    description: 'Hello typesense world',
    workspace_id: 'test-ws',
  });

  console.log('✅ Document indexed');

  // Test search
  const results = await provider.search('test_workspaces', { q: 'typesense' });
  console.log('✅ Search results:', results.hits.length, 'hits');
  if (results.hits.length > 0) {
    console.log('   First hit:', results.hits[0].document);
  }
}

async function main() {
  try {
    await testMeilisearch();
    await testTypesense();
    console.log('\n=== All live tests passed! ===\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Test failed:', (error as Error).message);
    console.error(error);
    process.exit(1);
  }
}

main();
