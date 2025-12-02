// Test what HTTP methods are allowed on the endpoint
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

async function test() {
  try {
    await client.authenticate();
    
    console.log('Instance URL:', client.instanceUrl);
    console.log('Workspace ID:', client.workspaceId);
    console.log('API Version:', client.config.apiVersion);
    
    // Try OPTIONS request to see what methods are allowed
    console.log('\nTrying OPTIONS request to /connect/cms/contents...');
    try {
      const optionsResponse = await client.client.request({
        method: 'OPTIONS',
        url: '/connect/cms/contents'
      });
      console.log('Allowed methods:', optionsResponse.headers['allow']);
      console.log('Headers:', optionsResponse.headers);
    } catch (err) {
      console.log('OPTIONS failed:', err.message);
    }
    
    // Try to describe the API resources
    console.log('\nChecking API resources at root...');
    const resources = await client.client.get('/');
    console.log('Available resources:', Object.keys(resources.data));
    
    // Check if connect/cms exists
    if (resources.data.connect) {
      console.log('\nConnect API URL:', resources.data.connect);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

test();
