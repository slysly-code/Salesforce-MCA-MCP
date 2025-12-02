// Check endpoint availability and allowed methods
import { SalesforceCMSClient } from './src/cms-client.js';
import dotenv from 'dotenv';

dotenv.config();

const client = new SalesforceCMSClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  clientId: process.env.SF_CLIENT_ID,
  username: process.env.SF_USERNAME,
  jwtPrivateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH,
  workspaceName: process.env.SF_WORKSPACE_NAME,
  apiVersion: process.env.SF_API_VERSION || 'v64.0'
});

async function checkEndpoint(method, path, description) {
  try {
    console.log(`\n${description}:`);
    console.log(`  ${method} ${path}`);
    
    const response = await client.client.request({
      method: method,
      url: path,
      validateStatus: () => true // Don't throw on any status
    });
    
    console.log(`  Status: ${response.status} ${response.statusText}`);
    
    if (response.headers['allow']) {
      console.log(`  Allowed methods: ${response.headers['allow']}`);
    }
    
    if (response.status === 404) {
      console.log(`  ❌ Endpoint does not exist`);
    } else if (response.status === 405) {
      console.log(`  ❌ Method not allowed (but endpoint exists)`);
    } else if (response.status >= 200 && response.status < 300) {
      console.log(`  ✅ Endpoint accessible`);
    } else if (response.status === 400) {
      console.log(`  ⚠️ Bad request (endpoint exists, but needs valid data)`);
    }
    
    return response;
  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    return null;
  }
}

async function test() {
  try {
    await client.authenticate();
    
    console.log('='.repeat(60));
    console.log('SALESFORCE CMS ENDPOINT AVAILABILITY CHECK');
    console.log('='.repeat(60));
    console.log(`Instance: ${client.instanceUrl}`);
    console.log(`API Version: ${client.config.apiVersion}`);
    console.log(`Workspace ID: ${client.workspaceId}`);
    console.log(`User: ${client.config.username}`);
    
    // Check root API resources
    console.log('\n' + '='.repeat(60));
    console.log('API ROOT RESOURCES');
    console.log('='.repeat(60));
    const rootResponse = await checkEndpoint('GET', '/', 'API Root');
    if (rootResponse && rootResponse.status === 200) {
      const resources = rootResponse.data;
      console.log('\nAvailable top-level resources:');
      Object.keys(resources).forEach(key => {
        if (key !== 'identity' && key !== 'recent') {
          console.log(`  - ${key}: ${resources[key]}`);
        }
      });
    }
    
    // Check Connect API
    console.log('\n' + '='.repeat(60));
    console.log('CONNECT CMS ENDPOINTS');
    console.log('='.repeat(60));
    
    await checkEndpoint('GET', '/connect/cms/contents', 'List CMS Contents (GET)');
    await checkEndpoint('POST', '/connect/cms/contents', 'Create CMS Content (POST)');
    await checkEndpoint('OPTIONS', '/connect/cms/contents', 'Get allowed methods (OPTIONS)');
    
    // Check specific content
    console.log('\n' + '='.repeat(60));
    console.log('SPECIFIC CONTENT OPERATIONS');
    console.log('='.repeat(60));
    
    const testContentId = '20YWs000005kA6MMAU'; // Your existing email
    await checkEndpoint('GET', `/connect/cms/contents/${testContentId}`, 'Get specific content (GET)');
    await checkEndpoint('PATCH', `/connect/cms/contents/${testContentId}`, 'Update content (PATCH)');
    await checkEndpoint('PUT', `/connect/cms/contents/${testContentId}`, 'Replace content (PUT)');
    await checkEndpoint('DELETE', `/connect/cms/contents/${testContentId}`, 'Delete content (DELETE)');
    
    // Check workspace endpoints
    console.log('\n' + '='.repeat(60));
    console.log('WORKSPACE ENDPOINTS');
    console.log('='.repeat(60));
    
    await checkEndpoint('GET', '/connect/cms/spaces', 'List workspaces (GET)');
    await checkEndpoint('POST', '/connect/cms/spaces', 'Create workspace (POST)');
    await checkEndpoint('GET', `/connect/cms/workspaces/${client.workspaceId}`, 'Get workspace details (GET)');
    
    // Check alternate content endpoints
    console.log('\n' + '='.repeat(60));
    console.log('ALTERNATE CONTENT ENDPOINTS');
    console.log('='.repeat(60));
    
    await checkEndpoint('POST', `/connect/cms/workspaces/${client.workspaceId}/contents`, 'Create in workspace (POST)');
    await checkEndpoint('POST', `/connect/cms/delivery/channels/${client.workspaceId}/contents`, 'Create via delivery API (POST)');
    
    // Check managed content endpoints
    console.log('\n' + '='.repeat(60));
    console.log('MANAGED CONTENT ENDPOINTS');
    console.log('='.repeat(60));
    
    await checkEndpoint('GET', `/connect/managed-content/channels/${client.workspaceId}/contents`, 'Managed content list (GET)');
    await checkEndpoint('POST', `/connect/managed-content/channels/${client.workspaceId}/contents`, 'Managed content create (POST)');
    
    console.log('\n' + '='.repeat(60));
    console.log('CHECK COMPLETE');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Fatal Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

test();
