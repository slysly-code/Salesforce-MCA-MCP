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

// Server version - increment this to verify restarts
const SERVER_VERSION = '1.1.0';
const BUILD_TIMESTAMP = new Date().toISOString();

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
        name: 'server_version',
        description: 'Get the MCP server version and build timestamp to verify restarts',
        inputSchema: {
          type: 'object',
          properties: {}
        }
      },
      {
        name: 'get_api_guide',
        description: 'Get documentation on how to use the Salesforce CMS API correctly. Call this BEFORE creating content to understand the required structure.',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic to get help on: "email", "image", "content-types", "errors", or "all"',
              enum: ['email', 'image', 'content-types', 'errors', 'all']
            }
          }
        }
      },
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
        name: 'get_api_resources',
        description: 'Get available API resources and endpoints',
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
      case 'server_version': {
        return {
          content: [
            {
              type: 'text',
              text: `🔧 Salesforce CMS MCP Server\nVersion: ${SERVER_VERSION}\nStarted: ${BUILD_TIMESTAMP}\nWorkspace: ${process.env.SF_WORKSPACE_NAME}`
            }
          ]
        };
      }

      case 'get_api_guide': {
        const topic = args.topic || 'all';
        let guide = '';
        
        const emailGuide = `
## Creating Emails (sfdc_cms__email)

Emails use a block-based structure. Required fields in contentBody:
- subjectLine: Email subject
- sfdc_cms:title: Content title
- sfdc_cms:block: Root block with nested children

### Block Hierarchy (required):
sfdc_cms/rootContentBlock → lightning/section → lightning/column → components

### CRITICAL: All block IDs must be valid UUIDs!
Format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

### Example contentBody:
\`\`\`json
{
  "subjectLine": "Your Subject Here",
  "preheader": "Preview text",
  "messagePurpose": "promotional",
  "sfdc_cms:title": "Email Title",
  "sfdc_cms:block": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "block",
    "definition": "sfdc_cms/rootContentBlock",
    "children": [{
      "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "type": "block",
      "definition": "lightning/section",
      "attributes": { "stackOnMobile": true },
      "children": [{
        "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
        "type": "block",
        "definition": "lightning/column",
        "attributes": { "columnWidth": 12 },
        "children": [
          {
            "id": "d4e5f6a7-b8c9-0123-def0-234567890123",
            "type": "block",
            "definition": "lightning/heading",
            "attributes": { "text": "Heading", "align": "center", "level": 1 }
          },
          {
            "id": "e5f6a7b8-c9d0-1234-ef01-345678901234",
            "type": "block",
            "definition": "lightning/paragraph",
            "attributes": { "text": "Body text here", "align": "center" }
          }
        ]
      }]
    }]
  }
}
\`\`\`

### Available Components:
- lightning/heading: {text, align, level}
- lightning/paragraph: {text, align}
- lightning/button: {text, uri, width}
- lightning/image: {imageInfo: {source: {type, ref: {contentKey}}}}
- lightning/html: {rawHtml}
`;

        const contentTypesGuide = `
## Available Content Types

| Type | API Name | Use For |
|------|----------|----------|
| Email | sfdc_cms__email | Marketing emails |
| Email Template | sfdc_cms__emailTemplate | Reusable templates |
| Content Block | sfdc_cms__emailFragment | Reusable components |
| Image | sfdc_cms__image | Image assets |
`;

        const errorsGuide = `
## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 405 METHOD_NOT_ALLOWED | Wrong HTTP method | POST for create, GET for read |
| uuid is invalid | Block IDs not UUIDs | Use format xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| MISSING_ARGUMENT | Wrong parameter | Use contentSpaceOrFolderIds for listing |
| Content type not supported | Wrong type for workspace | Check get_cms_types first |

### Important:
- Never use console.log in MCP servers (corrupts JSON)
- List endpoint is /connect/cms/items/search (not /contents)
- GET /connect/cms/contents does NOT work - use POST only
`;

        if (topic === 'email' || topic === 'all') guide += emailGuide;
        if (topic === 'content-types' || topic === 'all') guide += contentTypesGuide;
        if (topic === 'errors' || topic === 'all') guide += errorsGuide;
        
        return {
          content: [{ type: 'text', text: guide || 'Topic not found. Use: email, image, content-types, errors, or all' }]
        };
      }

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

      case 'get_api_resources': {
        const resources = await cmsClient.getAvailableResources();
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resources, null, 2)
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
