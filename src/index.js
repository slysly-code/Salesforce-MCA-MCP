#!/usr/bin/env node

/**
 * Salesforce CMS MCP Server
 * Exposes Salesforce CMS operations as MCP tools for Claude Desktop
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SalesforceCMSClient } from './cms-client.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize CMS client
const cmsClient = new SalesforceCMSClient({
  instanceUrl: process.env.SF_INSTANCE_URL,
  clientId: process.env.SF_CLIENT_ID,
  username: process.env.SF_USERNAME,
  jwtPrivateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH,
  workspaceName: process.env.SF_WORKSPACE_NAME,
  apiVersion: process.env.SF_API_VERSION || 'v61.0'
});

// Create MCP server
const server = new Server(
  {
    name: 'salesforce-cms-server',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'list_cms_content',
        description: 'List content items in the Salesforce CMS workspace',
        inputSchema: {
          type: 'object',
          properties: {
            limit: {
              type: 'number',
              description: 'Maximum number of items to return (default: 10)',
              default: 10
            }
          }
        }
      },
      {
        name: 'get_cms_content',
        description: 'Get detailed information about a specific CMS content item by ID or ContentKey',
        inputSchema: {
          type: 'object',
          properties: {
            identifier: {
              type: 'string',
              description: 'Content ID or ContentKey (e.g., MCWV26UCUUYNAFNP3Y53CVWGE23E)'
            }
          },
          required: ['identifier']
        }
      },
      {
        name: 'get_cms_types',
        description: 'List all available content types in the CMS workspace',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'create_cms_content',
        description: 'Create new content in Salesforce CMS',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              description: 'Content type (e.g., news, article)'
            },
            title: {
              type: 'string',
              description: 'Content title'
            },
            urlName: {
              type: 'string',
              description: 'URL-friendly name'
            },
            contentKey: {
              type: 'string',
              description: 'Unique content key'
            },
            language: {
              type: 'string',
              description: 'Language code (default: en_US)',
              default: 'en_US'
            },
            contentBody: {
              type: 'object',
              description: 'Content body fields'
            }
          },
          required: ['type', 'title', 'urlName', 'contentKey']
        }
      },
      {
        name: 'update_cms_content',
        description: 'Update existing CMS content body',
        inputSchema: {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              description: 'Content ID to update'
            },
            contentBody: {
              type: 'object',
              description: 'Updated content body fields'
            }
          },
          required: ['contentId', 'contentBody']
        }
      },
      {
        name: 'publish_cms_content',
        description: 'Publish CMS content to make it live',
        inputSchema: {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              description: 'Content ID to publish'
            }
          },
          required: ['contentId']
        }
      },
      {
        name: 'delete_cms_content',
        description: 'Delete CMS content',
        inputSchema: {
          type: 'object',
          properties: {
            contentId: {
              type: 'string',
              description: 'Content ID to delete'
            }
          },
          required: ['contentId']
        }
      }
    ]
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_cms_content': {
        const limit = args.limit || 10;
        const content = await cmsClient.listContent(limit);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(content, null, 2)
            }
          ]
        };
      }

      case 'get_cms_content': {
        const content = await cmsClient.getContent(args.identifier);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(content, null, 2)
            }
          ]
        };
      }

      case 'get_cms_types': {
        const types = await cmsClient.getContentTypes();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(types, null, 2)
            }
          ]
        };
      }

      case 'create_cms_content': {
        const result = await cmsClient.createContent(args);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Content created successfully!\nContent ID: ${result.id}\nTitle: ${result.title || args.title}\n\nFull response:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }

      case 'update_cms_content': {
        const result = await cmsClient.updateContentBody(args.contentId, args.contentBody);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Content updated successfully!\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }

      case 'publish_cms_content': {
        await cmsClient.publishContent(args.contentId);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Content published successfully!\nContent ID: ${args.contentId}`
            }
          ]
        };
      }

      case 'delete_cms_content': {
        await cmsClient.deleteContent(args.contentId);
        return {
          content: [
            {
              type: 'text',
              text: `✅ Content deleted successfully!\nContent ID: ${args.contentId}`
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error.message}\n\nDetails: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No additional details'}`
        }
      ],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Salesforce CMS MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
