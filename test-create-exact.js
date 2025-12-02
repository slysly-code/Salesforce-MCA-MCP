// Test content creation with exact PDF format
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

async function testCreate() {
  try {
    await client.authenticate();
    
    console.log('Testing email creation with exact PDF format...\n');
    console.log('Workspace ID:', client.workspaceId);
    
    // EXACT format from PDF - HTML-only email
    const payload = {
      "contentSpaceOrFolderId": client.workspaceId,
      "contentType": "sfdc_cms__email",
      "apiName": "TEST_EMAIL_FROM_SCRIPT",
      "contentBody": {
        "sfdc_cms:title": "Test Email from Script",
        "rawHtml": "<b>Hello World from API</b>",
        "messagePurpose": "promotional",
        "preheader": "This is a test email",
        "subjectLine": "Test Subject Line"
      }
    };
    
    console.log('Payload:', JSON.stringify(payload, null, 2));
    console.log('\nSending POST request...\n');
    
    const response = await client.client.post('/connect/cms/contents', payload);
    
    console.log('✅ SUCCESS!');
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

testCreate();
