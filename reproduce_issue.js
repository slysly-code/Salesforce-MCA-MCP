
import { SalesforceCMSClient } from './src/cms-client.js';

const config = {
    instanceUrl: "https://storm-6d85ffc578e682.lightning.force.com",
    clientId: "3MVG9aNlkJwuH9vNrZiIhNsS6a6qQMDqMb1oC_f2xlqeWfwZdjaujMTQ_BfFm9AZ4utV8A9xOTa_jkxYqljvu",
    username: "storm.6d85ffc578e682@salesforce.com",
    jwtPrivateKeyPath: "C:/repos/mce-to-cms-migration/certs/server.key",
    workspaceName: "Content Workspace for Marketing Cloud",
    apiVersion: "v61.0"
};

const client = new SalesforceCMSClient(config);

async function test() {
    try {
        console.log('Authenticating...');
        await client.authenticate();
        console.log('Authenticated!');
        console.log('Workspace ID:', client.workspaceId);

        console.log('\nTesting GET /connect/cms/contents...');
        try {
            const response = await client.client.get('/connect/cms/contents', {
                params: {
                    channelId: client.workspaceId,
                    pageSize: 5
                }
            });
            console.log('✅ Success! Items:', response.data.items?.length);
        } catch (error) {
            console.log('❌ Failed:', error.message);
            if (error.response) {
                console.log('Status:', error.response.status);
                console.log('Data:', JSON.stringify(error.response.data, null, 2));
                console.log('Headers:', error.response.headers);
            }
        }

        // Try without channelId
        console.log('\nTesting GET /connect/cms/contents (no channelId)...');
        try {
            const response = await client.client.get('/connect/cms/contents', {
                params: {
                    pageSize: 5
                }
            });
            console.log('✅ Success! Items:', response.data.items?.length);
        } catch (error) {
            console.log('❌ Failed:', error.message);
        }

        // Try Delivery API Query
        console.log('\nTesting GET /connect/cms/delivery/channels/{id}/contents/query...');
        try {
            const response = await client.client.get(`/connect/cms/delivery/channels/${client.workspaceId}/contents/query`, {
                params: {
                    pageSize: 5
                }
            });
            console.log('✅ Success (Delivery Query)! Items:', response.data.items?.length);
        } catch (error) {
            console.log('❌ Failed (Delivery Query):', error.message);
        }

        // Try Delivery API Search
        console.log('\nTesting GET /connect/cms/delivery/channels/{id}/contents/search...');
        try {
            const response = await client.client.get(`/connect/cms/delivery/channels/${client.workspaceId}/contents/search`, {
                params: {
                    query: 'test',
                    pageSize: 5
                }
            });
            console.log('✅ Success (Delivery Search)! Items:', response.data.items?.length);
        } catch (error) {
            console.log('❌ Failed (Delivery Search):', error.message);
        }

    } catch (err) {
        console.error('Fatal error:', err);
    }
}

test();
