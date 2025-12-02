// Test CMS Creation Capabilities
import { SalesforceCMSClient } from './src/cms-client.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new SalesforceCMSClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  clientId: process.env.SF_CLIENT_ID,
  username: process.env.SF_USERNAME,
  jwtPrivateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH,
  workspaceName: process.env.SF_WORKSPACE_NAME,
  apiVersion: process.env.SF_API_VERSION || 'v61.0'
});

async function test() {
  try {
    console.log('Testing CMS API capabilities...\n');
    
    // 1. Check workspace details
    console.log('1. Checking workspace...');
    await client.authenticate();
    const query = `SELECT Id, Name, IsEnhanced FROM ManagedContentSpace WHERE Id = '${client.workspaceId}'`;
    const workspaceResponse = await client.client.get(`/query/?q=${encodeURIComponent(query)}`);
    console.log('Workspace:', JSON.stringify(workspaceResponse.data.records[0], null, 2));
    
    // 2. Try to create news content
    console.log('\n2. Testing content creation...');
    const payload = {
      contentSpaceOrFolderId: client.workspaceId,
      contentType: 'news',
      title: 'Test News from Script',
      urlName: 'test-news-from-script',
      language: 'en_US',
      contentBody: {
        body: '<p>Test body</p>',
        excerpt: 'Test excerpt'
      }
    };
    
    console.log('Attempting POST to /connect/cms/contents...');
    console.log('Payload:', JSON.stringify(payload, null, 2));
    
    const createResponse = await client.client.post('/connect/cms/contents', payload);
    console.log('✅ Success!', JSON.stringify(createResponse.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
