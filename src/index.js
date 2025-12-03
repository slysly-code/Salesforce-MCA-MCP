#!/usr/bin/env node

/**
 * Salesforce CMS MCP Server
 * Exposes Salesforce CMS operations as MCP tools for Claude Desktop
 * 
 * Version 2.0.0 - Complex Email Builder with Preflight Check
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { SalesforceCMSClient } from './cms-client.js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

// Server version - increment this to verify restarts
const SERVER_VERSION = '2.0.0';
const BUILD_TIMESTAMP = new Date().toISOString();

// Clearance token storage (valid for 30 minutes)
const clearanceTokens = new Set();

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
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// ========================================
// API GUIDE CONTENT
// ========================================

const API_GUIDES = {
  'master-guide': `
# MASTER GUIDE: Salesforce Enhanced CMS Email Creation

> **READ THIS FIRST** - Complete guide for creating complex emails with multiple sections.

---

## 🚨 CRITICAL: DEFAULT BEHAVIOR FOR LLMs

\`\`\`
WHEN USER ASKS TO "CREATE AN EMAIL":
✅ ALWAYS create EDITABLE email with proper block structure
✅ ALWAYS use valid UUIDs for ALL block IDs
✅ ALWAYS follow hierarchy: rootContentBlock → section → column → component
❌ NEVER use invalid UUIDs (causes API errors)
❌ NEVER skip section/column wrappers
\`\`\`

---

## 📐 BLOCK HIERARCHY (MUST UNDERSTAND)

\`\`\`
sfdc_cms/rootContentBlock
│
├─ lightning/section (with stackOnMobile: true)
│  │
│  └─ lightning/column (with columnWidth: 12 for full, 6 for half)
│     │
│     └─ [COMPONENT: heading, paragraph, image, button, html]
│
├─ lightning/section (another section)
│  │
│  ├─ lightning/column (columnWidth: 6 - left half)
│  │  └─ [COMPONENT]
│  │
│  └─ lightning/column (columnWidth: 6 - right half)
│     └─ [COMPONENT]
│
└─ ... more sections
\`\`\`

**KEY RULES:**
- Every component MUST be inside a column
- Every column MUST be inside a section
- Every section MUST be inside rootContentBlock
- Column widths use 12-grid system (12=full, 6=half, 4=third)

---

## 🎨 USER LANGUAGE → CMS COMPONENTS

| User Says | CMS Component | Column Width |
|-----------|---------------|--------------|
| "banner image", "hero" | lightning/image | 12 (full) |
| "headline", "heading", "title" | lightning/heading | 12 (full) |
| "paragraph", "text", "body" | lightning/paragraph | 12 (full) |
| "2 columns", "side by side" | 2x lightning/column | 6 + 6 |
| "3 columns" | 3x lightning/column | 4 + 4 + 4 |
| "image left, text right" | column→image, column→paragraph | 6 + 6 |
| "button", "CTA" | lightning/actionButton | 12 (full) |
| "footer", "imprint" | lightning/paragraph | 12 (full) |
| "custom HTML" | lightning/html | 12 (full) |

---

## 📦 COMPONENT TEMPLATES

### Heading Component
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/heading",
  "attributes": {
    "text": "Your Heading Text",
    "align": "center",
    "level": 1
  }
}
\`\`\`
- level: 1-6 (1=largest, 6=smallest)
- align: "left", "center", "right"

### Paragraph Component
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/paragraph",
  "attributes": {
    "text": "Your body text here. Use &lt;br /&gt; for line breaks.",
    "align": "left"
  }
}
\`\`\`

### Image Component
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/image",
  "attributes": {
    "imageInfo": {
      "source": {
        "type": "imageReference",
        "ref": { "contentKey": "[IMAGE_CONTENT_KEY]" }
      }
    },
    "imageFitConfig": {
      "width": { "unit": "%", "value": 100 }
    }
  }
}
\`\`\`

### Button Component
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/actionButton",
  "attributes": {
    "text": "Click Here",
    "width": "auto",
    "lightning:horizontalAlignment": "center"
  }
}
\`\`\`

### HTML Component
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/html",
  "attributes": {
    "rawHtml": "<div>Custom HTML content</div>"
  }
}
\`\`\`

---

## 🔧 COMPLETE EMAIL EXAMPLE

User request: "Create email with banner, heading, paragraph, 2 columns (image left, text right), button, and footer"

\`\`\`json
{
  "type": "sfdc_cms__email",
  "title": "Welcome Email",
  "urlName": "welcome-email-001",
  "contentKey": "WELCOME-EMAIL-001",
  "contentBody": {
    "subjectLine": "Welcome to Our Service",
    "preheader": "Get started today",
    "messagePurpose": "promotional",
    "sfdc_cms:title": "Welcome Email",
    "sfdc_cms:block": {
      "id": "ROOT-UUID-HERE",
      "type": "block",
      "definition": "sfdc_cms/rootContentBlock",
      "children": [
        // Section 1: Banner Image
        {
          "id": "SEC1-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [{
            "id": "COL1-UUID-HERE",
            "type": "block",
            "definition": "lightning/column",
            "attributes": { "columnWidth": 12 },
            "children": [{
              "id": "IMG1-UUID-HERE",
              "type": "block",
              "definition": "lightning/image",
              "attributes": {
                "imageInfo": {
                  "source": { "type": "imageReference", "ref": { "contentKey": "BANNER-KEY" } }
                }
              }
            }]
          }]
        },
        // Section 2: Heading
        {
          "id": "SEC2-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [{
            "id": "COL2-UUID-HERE",
            "type": "block",
            "definition": "lightning/column",
            "attributes": { "columnWidth": 12 },
            "children": [{
              "id": "HEAD-UUID-HERE",
              "type": "block",
              "definition": "lightning/heading",
              "attributes": { "text": "Welcome!", "align": "center", "level": 1 }
            }]
          }]
        },
        // Section 3: Paragraph
        {
          "id": "SEC3-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [{
            "id": "COL3-UUID-HERE",
            "type": "block",
            "definition": "lightning/column",
            "attributes": { "columnWidth": 12 },
            "children": [{
              "id": "PARA-UUID-HERE",
              "type": "block",
              "definition": "lightning/paragraph",
              "attributes": { "text": "Welcome to our service...", "align": "left" }
            }]
          }]
        },
        // Section 4: Two Columns (Image Left, Text Right)
        {
          "id": "SEC4-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [
            {
              "id": "COL4L-UUID-HERE",
              "type": "block",
              "definition": "lightning/column",
              "attributes": { "columnWidth": 6 },
              "children": [{
                "id": "IMG2-UUID-HERE",
                "type": "block",
                "definition": "lightning/image",
                "attributes": {
                  "imageInfo": {
                    "source": { "type": "imageReference", "ref": { "contentKey": "PRODUCT-KEY" } }
                  }
                }
              }]
            },
            {
              "id": "COL4R-UUID-HERE",
              "type": "block",
              "definition": "lightning/column",
              "attributes": { "columnWidth": 6 },
              "children": [{
                "id": "PARA2-UUID-HERE",
                "type": "block",
                "definition": "lightning/paragraph",
                "attributes": { "text": "Product description...", "align": "left" }
              }]
            }
          ]
        },
        // Section 5: Button
        {
          "id": "SEC5-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [{
            "id": "COL5-UUID-HERE",
            "type": "block",
            "definition": "lightning/column",
            "attributes": { "columnWidth": 12 },
            "children": [{
              "id": "BTN-UUID-HERE",
              "type": "block",
              "definition": "lightning/actionButton",
              "attributes": { "text": "Get Started", "width": "auto", "lightning:horizontalAlignment": "center" }
            }]
          }]
        },
        // Section 6: Footer
        {
          "id": "SEC6-UUID-HERE",
          "type": "block",
          "definition": "lightning/section",
          "attributes": { "stackOnMobile": true },
          "children": [{
            "id": "COL6-UUID-HERE",
            "type": "block",
            "definition": "lightning/column",
            "attributes": { "columnWidth": 12 },
            "children": [{
              "id": "FOOT-UUID-HERE",
              "type": "block",
              "definition": "lightning/paragraph",
              "attributes": { "text": "Company Address | Unsubscribe", "align": "center" }
            }]
          }]
        }
      ]
    }
  }
}
\`\`\`

---

## ⚠️ COMMON ERRORS & FIXES

| Error | Cause | Solution |
|-------|-------|----------|
| "uuid is invalid" | Block ID not valid UUID | Use format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| "Missing section/column" | Component not wrapped | Always wrap: section → column → component |
| "Content not editable" | Wrong hierarchy | Follow rootContentBlock → section → column |
| "Image not found" | Invalid contentKey | List images first with list_cms_content |

---

## ✅ VALIDATION CHECKLIST

Before creating email, verify:
- [ ] All block IDs are valid UUIDs
- [ ] Root block uses "sfdc_cms/rootContentBlock"
- [ ] Every section has at least one column
- [ ] Every component is inside a column
- [ ] Column widths add up correctly (12 for full row)
- [ ] Images reference valid contentKeys

---

## 🎯 WORKFLOW FOR LLMs

\`\`\`
1. PREFLIGHT CHECK
   └─ Call cms_preflight_check to get clearance token

2. READ DOCUMENTATION
   └─ Call get_api_guide with topic: "master-guide"

3. BUILD STRUCTURE
   └─ Parse user request into sections
   └─ Generate UUIDs for each block
   └─ Build JSON following hierarchy

4. VALIDATE
   └─ Call cms_validate_request to check structure

5. CREATE
   └─ Call create_cms_content with clearance_token
\`\`\`
`,

  'sections': `
# Section Templates for CMS Emails

## Full-Width Image Section
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [{
    "id": "[UUID]",
    "type": "block",
    "definition": "lightning/column",
    "attributes": { "columnWidth": 12 },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/image",
      "attributes": {
        "imageInfo": {
          "source": { "type": "imageReference", "ref": { "contentKey": "[KEY]" } }
        },
        "imageFitConfig": { "width": { "unit": "%", "value": 100 } }
      }
    }]
  }]
}
\`\`\`

## Heading Section
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [{
    "id": "[UUID]",
    "type": "block",
    "definition": "lightning/column",
    "attributes": { "columnWidth": 12 },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/heading",
      "attributes": { "text": "[TEXT]", "align": "center", "level": 1 }
    }]
  }]
}
\`\`\`

## Paragraph Section
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [{
    "id": "[UUID]",
    "type": "block",
    "definition": "lightning/column",
    "attributes": { "columnWidth": 12 },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/paragraph",
      "attributes": { "text": "[TEXT]", "align": "left" }
    }]
  }]
}
\`\`\`

## Two-Column Section (Image Left, Text Right)
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [{
        "id": "[UUID]",
        "type": "block",
        "definition": "lightning/image",
        "attributes": {
          "imageInfo": {
            "source": { "type": "imageReference", "ref": { "contentKey": "[KEY]" } }
          }
        }
      }]
    },
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [{
        "id": "[UUID]",
        "type": "block",
        "definition": "lightning/paragraph",
        "attributes": { "text": "[TEXT]", "align": "left" }
      }]
    }
  ]
}
\`\`\`

## Button Section
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [{
    "id": "[UUID]",
    "type": "block",
    "definition": "lightning/column",
    "attributes": { "columnWidth": 12 },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/actionButton",
      "attributes": {
        "text": "[BUTTON_TEXT]",
        "width": "auto",
        "lightning:horizontalAlignment": "center"
      }
    }]
  }]
}
\`\`\`

## Three-Column Section
\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": { "stackOnMobile": true },
  "children": [
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 4 },
      "children": [/* component */]
    },
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 4 },
      "children": [/* component */]
    },
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 4 },
      "children": [/* component */]
    }
  ]
}
\`\`\`
`,

  'email': `
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
- lightning/actionButton: {text, width, lightning:horizontalAlignment}
- lightning/image: {imageInfo: {source: {type, ref: {contentKey}}}}
- lightning/html: {rawHtml}
`,

  'content-types': `
## Available Content Types

| Type | API Name | Use For |
|------|----------|----------|
| Email | sfdc_cms__email | Marketing emails |
| Email Template | sfdc_cms__emailTemplate | Reusable templates |
| Content Block | sfdc_cms__emailFragment | Reusable components |
| Image | sfdc_cms__image | Image assets |
`,

  'errors': `
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
`
};

// ========================================
// HELPER FUNCTIONS
// ========================================

function generateClearanceToken() {
  const token = `CMS-CLEARANCE-${Date.now()}-${randomUUID().substring(0, 8)}`;
  clearanceTokens.add(token);
  
  // Auto-expire after 30 minutes
  setTimeout(() => {
    clearanceTokens.delete(token);
  }, 30 * 60 * 1000);
  
  return token;
}

function validateUUID(id) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

function validateEmailStructure(contentBody) {
  const errors = [];
  const warnings = [];

  // Check required fields
  if (!contentBody.subjectLine) {
    warnings.push('⚠️ Missing subjectLine - email will have no subject');
  }

  if (!contentBody['sfdc_cms:block']) {
    errors.push('❌ Missing sfdc_cms:block - this is required for email structure');
    return { valid: false, errors, warnings };
  }

  const rootBlock = contentBody['sfdc_cms:block'];

  // Check root block
  if (rootBlock.definition !== 'sfdc_cms/rootContentBlock') {
    errors.push(`❌ Root block must be "sfdc_cms/rootContentBlock", got "${rootBlock.definition}"`);
  }

  if (!validateUUID(rootBlock.id)) {
    errors.push(`❌ Root block ID is not a valid UUID: "${rootBlock.id}"`);
  }

  // Recursively validate all blocks
  function validateBlock(block, path = 'root') {
    if (!validateUUID(block.id)) {
      errors.push(`❌ Invalid UUID at ${path}: "${block.id}"`);
    }

    if (!block.definition) {
      errors.push(`❌ Missing definition at ${path}`);
    }

    if (block.children) {
      block.children.forEach((child, index) => {
        validateBlock(child, `${path}.children[${index}]`);
      });
    }
  }

  validateBlock(rootBlock);

  // Check hierarchy: root → section → column → component
  if (rootBlock.children) {
    rootBlock.children.forEach((section, sIndex) => {
      if (section.definition !== 'lightning/section') {
        errors.push(`❌ Direct child of root must be lightning/section, got "${section.definition}" at index ${sIndex}`);
      } else if (section.children) {
        section.children.forEach((column, cIndex) => {
          if (column.definition !== 'lightning/column') {
            errors.push(`❌ Child of section must be lightning/column, got "${column.definition}" at section[${sIndex}].column[${cIndex}]`);
          }
        });
      }
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

// ========================================
// DEFINE AVAILABLE TOOLS
// ========================================

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
        name: 'cms_preflight_check',
        description: 'MANDATORY PRE-FLIGHT CHECK - Call this FIRST before creating emails. Returns clearance token and required reading.',
        inputSchema: {
          type: 'object',
          properties: {
            operation_type: {
              type: 'string',
              description: 'Type of operation: "email_creation", "content_update"',
              enum: ['email_creation', 'content_update']
            },
            user_intent: {
              type: 'string',
              description: 'Brief description of what user wants to create'
            }
          },
          required: ['operation_type', 'user_intent']
        }
      },
      {
        name: 'cms_validate_request',
        description: 'Validate email structure BEFORE creating. Checks UUIDs, hierarchy, and required fields.',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Content type being validated',
              enum: ['email', 'image', 'template']
            },
            content_body: {
              type: 'object',
              description: 'The contentBody object to validate'
            }
          },
          required: ['content_type', 'content_body']
        }
      },
      {
        name: 'get_api_guide',
        description: 'Get documentation on how to use the Salesforce CMS API correctly. Topics: "master-guide", "sections", "email", "content-types", "errors", "all"',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic to get help on',
              enum: ['master-guide', 'sections', 'email', 'content-types', 'errors', 'all']
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
        description: 'Create new content in Salesforce CMS. For emails, requires clearance_token from cms_preflight_check.',
        inputSchema: {
          type: 'object',
          properties: {
            clearance_token: {
              type: 'string',
              description: 'Clearance token from cms_preflight_check (required for emails)'
            },
            type: {
              type: 'string',
              description: 'Content type (e.g., sfdc_cms__email, sfdc_cms__image)'
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

// ========================================
// HANDLE TOOL CALLS
// ========================================

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'server_version': {
        return {
          content: [{
            type: 'text',
            text: `🔧 Salesforce CMS MCP Server
Version: ${SERVER_VERSION}
Started: ${BUILD_TIMESTAMP}
Workspace: ${process.env.SF_WORKSPACE_NAME}
Features: Preflight Check, Complex Email Builder, Validation`
          }]
        };
      }

      case 'cms_preflight_check': {
        const { operation_type, user_intent } = args;
        const clearanceToken = generateClearanceToken();

        const response = `
🚦 PRE-FLIGHT CHECK: ${operation_type.toUpperCase().replace('_', ' ')}

User Intent: "${user_intent}"

═══════════════════════════════════════════════════════════

📚 REQUIRED READING:

1. Master Guide (COMPLETE documentation)
   → Call get_api_guide with topic: "master-guide"

2. Section Templates (copy-paste ready)
   → Call get_api_guide with topic: "sections"

═══════════════════════════════════════════════════════════

⚠️ CRITICAL RULES:

✅ ALWAYS use valid UUIDs for ALL block IDs
✅ ALWAYS follow: rootContentBlock → section → column → component
✅ ALWAYS validate with cms_validate_request before creating
❌ NEVER skip the section/column wrappers
❌ NEVER use non-UUID block IDs

═══════════════════════════════════════════════════════════

🎯 USER LANGUAGE → SECTIONS:

| User Says | Create Section With |
|-----------|---------------------|
| "banner", "hero" | Full-width Image |
| "headline", "title" | Heading (level 1-6) |
| "paragraph", "text" | Paragraph |
| "2 columns" | 2x Column (width: 6 each) |
| "button", "CTA" | ActionButton |
| "footer" | Paragraph (centered) |

═══════════════════════════════════════════════════════════

📊 WORKFLOW:

1. ✅ Preflight check complete
2. → Read master-guide documentation
3. → Build your email JSON structure
4. → Validate with cms_validate_request
5. → Create with create_cms_content + clearance token

═══════════════════════════════════════════════════════════

🔑 CLEARANCE TOKEN (Valid 30 minutes):

${clearanceToken}

Include this in your create_cms_content call:
{
  "clearance_token": "${clearanceToken}",
  "type": "sfdc_cms__email",
  ...
}

═══════════════════════════════════════════════════════════
`;

        return {
          content: [{
            type: 'text',
            text: response
          }]
        };
      }

      case 'cms_validate_request': {
        const { content_type, content_body } = args;

        if (content_type === 'email') {
          const validation = validateEmailStructure(content_body);
          
          let response = validation.valid
            ? '✅ VALIDATION PASSED\n\nYour email structure is valid. You can proceed with creation.\n'
            : '❌ VALIDATION FAILED\n\nFix the following errors before creating:\n';

          if (validation.errors.length > 0) {
            response += '\n**Errors:**\n' + validation.errors.join('\n') + '\n';
          }

          if (validation.warnings.length > 0) {
            response += '\n**Warnings:**\n' + validation.warnings.join('\n') + '\n';
          }

          response += '\n**Next Step:** ' + (validation.valid
            ? 'Call create_cms_content with your clearance token'
            : 'Fix errors and validate again');

          return {
            content: [{
              type: 'text',
              text: response
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: '✅ Validation for non-email content: Proceed with creation.'
          }]
        };
      }

      case 'get_api_guide': {
        const topic = args.topic || 'all';
        
        if (topic === 'all') {
          const allGuides = Object.entries(API_GUIDES)
            .map(([key, content]) => `\n\n${'='.repeat(60)}\n## ${key.toUpperCase()}\n${'='.repeat(60)}\n${content}`)
            .join('\n');
          return { content: [{ type: 'text', text: allGuides }] };
        }

        const guide = API_GUIDES[topic];
        if (!guide) {
          return {
            content: [{
              type: 'text',
              text: `Topic "${topic}" not found. Available: ${Object.keys(API_GUIDES).join(', ')}, all`
            }]
          };
        }

        return { content: [{ type: 'text', text: guide }] };
      }

      case 'list_cms_content': {
        const limit = args.limit || 10;
        const content = await cmsClient.listContent(limit);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(content, null, 2)
          }]
        };
      }

      case 'get_cms_content': {
        const content = await cmsClient.getContent(args.identifier);
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(content, null, 2)
          }]
        };
      }

      case 'get_cms_types': {
        const types = await cmsClient.getContentTypes();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(types, null, 2)
          }]
        };
      }

      case 'get_api_resources': {
        const resources = await cmsClient.getAvailableResources();
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(resources, null, 2)
          }]
        };
      }

      case 'create_cms_content': {
        // Check clearance token for email creation
        if (args.type === 'sfdc_cms__email') {
          if (!args.clearance_token) {
            return {
              content: [{
                type: 'text',
                text: `⛔ CLEARANCE TOKEN REQUIRED

You attempted to create an email without a clearance token.

REQUIRED WORKFLOW:
1. Call cms_preflight_check with operation_type: "email_creation"
2. Read documentation using get_api_guide with topic: "master-guide"
3. Build your email structure following the guide
4. Call cms_validate_request to check your structure
5. Include the clearance_token in create_cms_content

Please call cms_preflight_check first.`
              }],
              isError: true
            };
          }

          if (!clearanceTokens.has(args.clearance_token)) {
            return {
              content: [{
                type: 'text',
                text: `⛔ INVALID OR EXPIRED CLEARANCE TOKEN

The clearance token "${args.clearance_token}" is invalid or has expired (30 min limit).

Please call cms_preflight_check again to get a new token.`
              }],
              isError: true
            };
          }

          // Token is valid - remove it (single use)
          clearanceTokens.delete(args.clearance_token);
        }

        // Proceed with creation
        const createArgs = { ...args };
        delete createArgs.clearance_token;
        
        const result = await cmsClient.createContent(createArgs);
        return {
          content: [{
            type: 'text',
            text: `✅ Content created successfully!
Content ID: ${result.managedContentId || result.id}
Content Key: ${result.contentKey || args.contentKey}
Title: ${result.title || args.title}

Full response:
${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'update_cms_content': {
        const result = await cmsClient.updateContentBody(args.contentId, args.contentBody);
        return {
          content: [{
            type: 'text',
            text: `✅ Content updated successfully!\n\n${JSON.stringify(result, null, 2)}`
          }]
        };
      }

      case 'publish_cms_content': {
        await cmsClient.publishContent(args.contentId);
        return {
          content: [{
            type: 'text',
            text: `✅ Content published successfully!\nContent ID: ${args.contentId}`
          }]
        };
      }

      case 'delete_cms_content': {
        await cmsClient.deleteContent(args.contentId);
        return {
          content: [{
            type: 'text',
            text: `✅ Content deleted successfully!\nContent ID: ${args.contentId}`
          }]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: `❌ Error: ${error.message}\n\nDetails: ${error.response?.data ? JSON.stringify(error.response.data, null, 2) : 'No additional details'}`
      }],
      isError: true
    };
  }
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Use console.error for logging (doesn't corrupt stdio JSON)
  console.error(`Salesforce CMS MCP Server v${SERVER_VERSION} running on stdio`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
