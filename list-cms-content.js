// Utility script to list CMS content using the existing SalesforceCMSClient
import dotenv from 'dotenv';
import { SalesforceCMSClient } from './src/cms-client.js';

dotenv.config();

const client = new SalesforceCMSClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  clientId: process.env.SF_CLIENT_ID,
  username: process.env.SF_USERNAME,
  jwtPrivateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH,
  workspaceName: process.env.SF_WORKSPACE_NAME,
  apiVersion: process.env.SF_API_VERSION || 'v61.0',
});

async function run() {
  try {
    console.log('Listing CMS content from workspace:', process.env.SF_WORKSPACE_NAME);

    // Use a reasonably large limit; adjust if you know your expected volume
    const limit = Number(process.env.CMS_LIST_LIMIT || 200);
    const items = await client.listContent(limit);

    console.log(`\nFound ${Array.isArray(items) ? items.length : 0} items (limit ${limit})`);

    if (Array.isArray(items) && items.length > 0) {
      console.log('\nSample items:');
      // Print a concise summary for each item
      for (const item of items) {
        const id = item.id || item.Id || item.contentKey || item.contentKeyOrId;
        const title =
          item.title ||
          item.Name ||
          (item.contentBody && (item.contentBody['sfdc_cms:title'] || item.contentBody.title));
        const type = item.contentType || item.type || item.ContentType || item.contentTypeName;

        console.log(
          `- ID/Key: ${id || '<unknown>'} | Type: ${type || '<unknown>'} | Title: ${
            title || '<no title>'
          }`
        );
      }
    } else {
      console.log('No content items returned from CMS.');
    }
  } catch (err) {
    console.error('Error while listing CMS content:', err.message);
    if (err.response && err.response.data) {
      console.error('Response data:', JSON.stringify(err.response.data, null, 2));
    }
  }
}

run();




