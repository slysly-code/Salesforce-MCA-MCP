#!/usr/bin/env node

/**
 * Salesforce CMS MCP Server
 * Exposes Salesforce CMS operations as MCP tools for Claude Desktop
 * 
 * Version 2.1.0 - Editable Email Components with Custom Styling
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
const SERVER_VERSION = '2.2.1';
const BUILD_TIMESTAMP = new Date().toISOString();

// Clearance token storage (valid for 30 minutes)
const clearanceTokens = new Set();

// Load environment variables
dotenv.config();

// Initialize CMS client
const cmsClient = new SalesforceCMSClient({
  authMode: process.env.SF_AUTH_MODE || 'jwt',  // 'jwt' | 'sf-cli'
  sfCliAlias: process.env.SF_CLI_ALIAS,
  instanceUrl: process.env.SF_INSTANCE_URL,
  clientId: process.env.SF_CLIENT_ID,
  username: process.env.SF_USERNAME,
  jwtPrivateKeyPath: process.env.SF_JWT_PRIVATE_KEY_PATH,
  workspaceName: process.env.SF_WORKSPACE_NAME,
  apiVersion: process.env.SF_API_VERSION || 'v64.0'
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
// API GUIDE CONTENT - VERSION 2.1
// ========================================

const API_GUIDES = {
  'master-guide': `
# MASTER GUIDE: Salesforce Enhanced CMS Email Creation (v2.1)

> **READ THIS FIRST** - Complete guide for creating EDITABLE emails.

---

## 🚨 CRITICAL: EDITABLE vs NON-EDITABLE CONTENT

\`\`\`
⚠️ THE #1 MISTAKE: Using lightning/html for everything!

❌ WRONG - Creates NON-EDITABLE HTML blocks:
   "definition": "lightning/html"
   "attributes": { "rawHtml": "<h1>Title</h1><p>Text</p>" }

✅ CORRECT - Creates EDITABLE components:
   "definition": "lightning/heading"  → Editable heading
   "definition": "lightning/paragraph" → Editable text
   "definition": "lightning/image"     → Editable image (requires CMS upload)
   "definition": "lightning/actionButton" → Editable button
\`\`\`

---

## 🎯 WHEN TO USE EACH COMPONENT

| Content Type | Use This | NOT This |
|--------------|----------|----------|
| Headlines, titles | lightning/heading | lightning/html |
| Body text, paragraphs | lightning/paragraph | lightning/html |
| CMS-uploaded images | lightning/image | lightning/html |
| Buttons, CTAs | lightning/actionButton | lightning/html |
| Complex layouts, external images, custom HTML | lightning/html | - |

**Rule of thumb**: Only use \`lightning/html\` when you NEED custom HTML that can't be achieved with semantic components.

---

## 📐 BLOCK HIERARCHY (REQUIRED)

\`\`\`
sfdc_cms/rootContentBlock
│
├─ lightning/section
│  └─ lightning/column (columnWidth: 12)
│     └─ lightning/heading (EDITABLE!)
│
├─ lightning/section
│  └─ lightning/column (columnWidth: 12)
│     └─ lightning/paragraph (EDITABLE!)
│
├─ lightning/section (two columns)
│  ├─ lightning/column (columnWidth: 6)
│  │  └─ lightning/image (EDITABLE!)
│  └─ lightning/column (columnWidth: 6)
│     └─ lightning/paragraph (EDITABLE!)
\`\`\`

---

## 📦 EDITABLE COMPONENT TEMPLATES (COPY THESE!)

### 1. Heading Component (EDITABLE)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/heading",
  "attributes": {
    "text": "Your Heading Text Here",
    "align": "center",
    "level": 1,
    "lightning:colorGroup": {
      "textColor": "#1C6E7D"
    }
  }
}
\`\`\`
- **level**: 1-6 (1=H1 largest, 6=H6 smallest)
- **align**: "left", "center", "right"
- **textColor**: Any hex color for the heading text

### 2. Paragraph Component (EDITABLE)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/paragraph",
  "attributes": {
    "text": "Your paragraph text here. Use &lt;br /&gt; for line breaks.&lt;br /&gt;Second line here.",
    "align": "left",
    "lightning:colorGroup": {
      "textColor": "#333333",
      "linkColor": "#0176d3"
    }
  }
}
\`\`\`
- **Text formatting**: Use \`&lt;strong&gt;\`, \`&lt;em&gt;\`, \`&lt;br /&gt;\` for bold, italic, line breaks
- **align**: "left", "center", "right"

### 3. Button Component (EDITABLE)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/actionButton",
  "attributes": {
    "text": "Click Here",
    "width": "auto",
    "lightning:horizontalAlignment": "center",
    "lightning:colorGroup": {
      "backgroundColor": "#1C6E7D",
      "textColor": "#FFFFFF"
    }
  }
}
\`\`\`
- **width**: "auto" or "full"
- **lightning:horizontalAlignment**: "left", "center", "right"

### 4. Image Component (EDITABLE - Requires CMS Upload)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/image",
  "attributes": {
    "imageInfo": {
      "source": {
        "type": "imageReference",
        "ref": { "contentKey": "[CMS-IMAGE-CONTENT-KEY]" }
      },
      "altText": "Image description"
    },
    "imageFitConfig": {
      "width": { "unit": "%", "value": 100 }
    },
    "lightning:horizontalAlignment": "center"
  }
}
\`\`\`
⚠️ **NOTE**: Images must be uploaded to CMS first! Use \`list_cms_content\` to find existing image contentKeys.
For external URLs, use lightning/html instead.

### 5. HTML Component (NON-EDITABLE - Use sparingly!)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/html",
  "attributes": {
    "rawHtml": "<div style='padding: 20px;'><img src='https://external-url.com/image.jpg' /></div>"
  }
}
\`\`\`
Use ONLY for: external images, complex custom layouts, special formatting not possible with semantic components.

---

## 🏗️ SECTION & COLUMN TEMPLATES

### Full-Width Section
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": {
    "stackOnMobile": true,
    "lightning:backgroundImage": {
      "repeat": "no-repeat",
      "position": "center center",
      "size": "cover"
    }
  },
  "children": [{
    "id": "[GENERATE-UUID]",
    "type": "block",
    "definition": "lightning/column",
    "attributes": {
      "columnWidth": 12,
      "lightning:backgroundImage": {
        "repeat": "no-repeat",
        "position": "center center",
        "size": "cover"
      }
    },
    "children": [
      // PUT YOUR COMPONENTS HERE
    ]
  }]
}
\`\`\`

### Two-Column Section (50/50)
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/section",
  "attributes": {
    "stackOnMobile": true,
    "lightning:backgroundImage": {
      "repeat": "no-repeat",
      "position": "center center",
      "size": "cover"
    }
  },
  "children": [
    {
      "id": "[GENERATE-UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [ /* LEFT COLUMN COMPONENTS */ ]
    },
    {
      "id": "[GENERATE-UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [ /* RIGHT COLUMN COMPONENTS */ ]
    }
  ]
}
\`\`\`

### Column with Background Color
\`\`\`json
{
  "id": "[GENERATE-UUID]",
  "type": "block",
  "definition": "lightning/column",
  "attributes": {
    "columnWidth": 12,
    "lightning:colorScheme": {
      "root": "#1C6E7D",
      "contrast": "#FFFFFF"
    },
    "lightning:padding": "medium"
  },
  "children": [/* components */]
}
\`\`\`

---

## ✅ COMPLETE EMAIL EXAMPLE (EDITABLE)

\`\`\`json
{
  "subjectLine": "Welcome to Our Newsletter",
  "preheader": "Check out what's new this month",
  "messagePurpose": "promotional",
  "sfdc_cms:title": "Monthly Newsletter",
  "lightning:backgroundImage": {
    "position": "center center",
    "repeat": "no-repeat",
    "size": "cover"
  },
  "lightning:brandSource": {
    "defaultBrandOption": "sfdcBrand"
  },
  "lightning:dataProviders": [],
  "lightning:expressions": [],
  "sfdc_cms:block": {
    "id": "ROOT-UUID-HERE",
    "type": "block",
    "definition": "sfdc_cms/rootContentBlock",
    "children": [
      {
        "id": "SEC1-UUID",
        "type": "block",
        "definition": "lightning/section",
        "attributes": { "stackOnMobile": true },
        "children": [{
          "id": "COL1-UUID",
          "type": "block",
          "definition": "lightning/column",
          "attributes": { "columnWidth": 12 },
          "children": [{
            "id": "HEAD1-UUID",
            "type": "block",
            "definition": "lightning/heading",
            "attributes": {
              "text": "Welcome!",
              "align": "center",
              "level": 1,
              "lightning:colorGroup": { "textColor": "#1C6E7D" }
            }
          }]
        }]
      },
      {
        "id": "SEC2-UUID",
        "type": "block",
        "definition": "lightning/section",
        "attributes": { "stackOnMobile": true },
        "children": [{
          "id": "COL2-UUID",
          "type": "block",
          "definition": "lightning/column",
          "attributes": { "columnWidth": 12 },
          "children": [{
            "id": "PARA1-UUID",
            "type": "block",
            "definition": "lightning/paragraph",
            "attributes": {
              "text": "Thank you for subscribing to our newsletter.&lt;br /&gt;We have exciting updates to share!",
              "align": "left",
              "lightning:colorGroup": { "textColor": "#333333" }
            }
          }]
        }]
      },
      {
        "id": "SEC3-UUID",
        "type": "block",
        "definition": "lightning/section",
        "attributes": { "stackOnMobile": true },
        "children": [{
          "id": "COL3-UUID",
          "type": "block",
          "definition": "lightning/column",
          "attributes": { "columnWidth": 12 },
          "children": [{
            "id": "BTN1-UUID",
            "type": "block",
            "definition": "lightning/actionButton",
            "attributes": {
              "text": "Learn More",
              "width": "auto",
              "lightning:horizontalAlignment": "center",
              "lightning:colorGroup": {
                "backgroundColor": "#1C6E7D",
                "textColor": "#FFFFFF"
              }
            }
          }]
        }]
      }
    ]
  }
}
\`\`\`

---

## ⚠️ COMMON MISTAKES & FIXES

| Mistake | Problem | Solution |
|---------|---------|----------|
| Using lightning/html for text | Content not editable in UI | Use lightning/heading or lightning/paragraph |
| Using lightning/html for buttons | Button not editable | Use lightning/actionButton |
| External image URL in lightning/image | Won't work | Upload to CMS first, or use lightning/html |
| Missing lightning:colorGroup | No text color | Add colorGroup with textColor |
| Invalid UUID format | API error | Use: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |

---

## 🎯 WORKFLOW

1. **PREFLIGHT** → Call cms_preflight_check
2. **READ DOCS** → Call get_api_guide topic: "master-guide" (this), "email" or "inapp" for specifics
3. **LIST IMAGES** → Call list_cms_content to find image contentKeys (if needed)
4. **BUILD JSON** → Use EDITABLE components (heading, paragraph, button) for email; slot blocks for in-app
5. **VALIDATE** → Call cms_validate_request
6. **CREATE** → Call create_cms_content with clearance token

## 📚 OTHER TOPICS

- get_api_guide topic:"email"  — email-specific block reference
- get_api_guide topic:"inapp"  — In-App Message (sfdc_cms__inApp) slot-based schema
- get_api_guide topic:"sections" — section/column templates for email
- get_api_guide topic:"content-types" — list of supported MCN ContentTypes
- get_api_guide topic:"errors" — common errors and fixes
`,

  'sections': `
# Section Templates for EDITABLE CMS Emails (v2.1)

## Header Section with Heading
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
    "attributes": {
      "columnWidth": 12,
      "lightning:colorScheme": { "root": "#1C6E7D" },
      "lightning:padding": "medium"
    },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/heading",
      "attributes": {
        "text": "Your Headline Here",
        "align": "center",
        "level": 1,
        "lightning:colorGroup": { "textColor": "#FFFFFF" }
      }
    }]
  }]
}
\`\`\`

## Text Section with Paragraph
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
      "attributes": {
        "text": "Your paragraph text here.&lt;br /&gt;Line breaks work like this.",
        "align": "left",
        "lightning:colorGroup": { "textColor": "#333333" }
      }
    }]
  }]
}
\`\`\`

## CTA Button Section
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
        "text": "Click Here",
        "width": "auto",
        "lightning:horizontalAlignment": "center",
        "lightning:colorGroup": {
          "backgroundColor": "#1C6E7D",
          "textColor": "#FFFFFF"
        }
      }
    }]
  }]
}
\`\`\`

## Two-Column: Image Left (CMS), Text Right
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
            "source": {
              "type": "imageReference",
              "ref": { "contentKey": "[CMS-IMAGE-KEY]" }
            }
          },
          "imageFitConfig": { "width": { "unit": "%", "value": 100 } }
        }
      }]
    },
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [
        {
          "id": "[UUID]",
          "type": "block",
          "definition": "lightning/heading",
          "attributes": {
            "text": "Feature Title",
            "align": "left",
            "level": 3,
            "lightning:colorGroup": { "textColor": "#1C6E7D" }
          }
        },
        {
          "id": "[UUID]",
          "type": "block",
          "definition": "lightning/paragraph",
          "attributes": {
            "text": "Feature description text here.",
            "align": "left",
            "lightning:colorGroup": { "textColor": "#666666" }
          }
        }
      ]
    }
  ]
}
\`\`\`

## Two-Column: External Image (HTML) + Text
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
        "definition": "lightning/html",
        "attributes": {
          "rawHtml": "<img src='https://example.com/image.jpg' alt='Description' style='width: 100%; border-radius: 8px;' />"
        }
      }]
    },
    {
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/column",
      "attributes": { "columnWidth": 6 },
      "children": [
        {
          "id": "[UUID]",
          "type": "block",
          "definition": "lightning/heading",
          "attributes": {
            "text": "Feature Title",
            "align": "left",
            "level": 3,
            "lightning:colorGroup": { "textColor": "#1C6E7D" }
          }
        },
        {
          "id": "[UUID]",
          "type": "block",
          "definition": "lightning/paragraph",
          "attributes": {
            "text": "Feature description here.",
            "align": "left",
            "lightning:colorGroup": { "textColor": "#666666" }
          }
        }
      ]
    }
  ]
}
\`\`\`

## Footer Section (Editable)
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
    "attributes": {
      "columnWidth": 12,
      "lightning:colorScheme": { "root": "#f5f5f5" },
      "lightning:padding": "medium"
    },
    "children": [{
      "id": "[UUID]",
      "type": "block",
      "definition": "lightning/paragraph",
      "attributes": {
        "text": "Company Name&lt;br /&gt;123 Street, City&lt;br /&gt;&lt;a href='#'&gt;Unsubscribe&lt;/a&gt;",
        "align": "center",
        "lightning:colorGroup": { "textColor": "#666666", "linkColor": "#0176d3" }
      }
    }]
  }]
}
\`\`\`
`,

  'email': `
## Creating EDITABLE Emails (sfdc_cms__email)

### Required contentBody Fields:
- subjectLine: Email subject line
- preheader: Preview text shown in inbox
- messagePurpose: "promotional" or "transactional"
- sfdc_cms:title: Internal content title
- sfdc_cms:block: Root block with nested children

### Block Hierarchy (MUST follow):
sfdc_cms/rootContentBlock → lightning/section → lightning/column → components

### EDITABLE Components (use these!):
- lightning/heading → Editable headline
- lightning/paragraph → Editable text
- lightning/actionButton → Editable button
- lightning/image → Editable image (CMS upload required)

### NON-EDITABLE Component (use sparingly):
- lightning/html → Raw HTML (for external images, complex layouts)

### Minimal contentBody Example:
\`\`\`json
{
  "subjectLine": "Your Subject",
  "preheader": "Preview text",
  "messagePurpose": "promotional",
  "sfdc_cms:title": "Email Title",
  "sfdc_cms:block": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "type": "block",
    "definition": "sfdc_cms/rootContentBlock",
    "children": [
      // sections go here
    ]
  }
}
\`\`\`
`,

  'content-types': `
## Available Content Types (MCN Marketing Workspace)

| Type | API Name | Use For |
|------|----------|----------|
| Email | sfdc_cms__email | Marketing emails |
| Email Template | sfdc_cms__emailTemplate | Reusable templates |
| Content Block | sfdc_cms__emailFragment | Reusable components |
| Image | sfdc_cms__image | Image assets |
| In-App Message | sfdc_cms__inApp | Mobile in-app messages (FullScreen, PushPrimer, Banner, Modal) |

### Image Note:
Images must be uploaded to CMS to use with lightning/image (email) or sfdc_cms__inAppMedia with imageReference (in-app).
Use list_cms_content to find existing image contentKeys. For external URLs in in-app, use mediaUrl with type:"url".
`,

  'inapp': `
# IN-APP MESSAGE GUIDE (sfdc_cms__inApp)

In-App messages are a separate ContentType in MCN Enhanced CMS. They use a **flat slot-based block model** — NOT the section/column hierarchy of email.

---

## contentBody schema

Required keys:
- \`sfdc_cms:title\` — internal title
- \`inAppType\` — one of: \`FullScreen\`, \`PushPrimer\`, \`Banner\`, \`Modal\` (verified: FullScreen, PushPrimer)
- \`inAppImageLayoutType\` — e.g. \`fillscreennoscroll\`, \`16x9\`, \`1x1\`, \`4x3\`
- \`inAppBlock\` — root block (definition: \`sfdc_cms__inAppType<Type>\`, e.g. \`sfdc_cms__inAppTypeFullScreen\`)

Usually empty arrays:
- \`lightning:dataProviders\`: []
- \`lightning:expressions\`: []

---

## inAppBlock structure

The root \`inAppBlock\` is a single block whose \`attributes\` contain **named slots** (not a children array):

\`\`\`json
{
  "id": "[UUID]",
  "type": "block",
  "definition": "sfdc_cms__inAppTypeFullScreen",
  "attributes": {
    "type": "FullScreen",
    "title":          { /* sfdc_cms__inAppTitle block */ },
    "message":        { /* sfdc_cms__inAppMessage block */ },
    "tertiaryMessage":{ /* sfdc_cms__inAppTertiaryMessage block */ },
    "media":          { /* sfdc_cms__inAppMedia block */ },
    "containerStyle": { /* sfdc_cms__inAppContainerStyle block */ },
    "actionButtons":  { /* sfdc_cms__inAppActionButtons block */ }
  }
}
\`\`\`

Note: the inner \`attributes.type\` MUST match \`inAppType\` (e.g. both "FullScreen").

---

## Slot blocks

### Title (sfdc_cms__inAppTitle)
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppTitle",
  "attributes": {
    "content": { "title": "Headline text" },
    "style": {
      "fontSize": "l",          // xs|s|m|l|xl
      "fontStyle": "regular",   // regular|bold|italic
      "textAlignment": "center", // left|center|right
      "textColor": "#000000",
      "androidFont": "", "iosFont": ""
    }
  }
}
\`\`\`

### Message (sfdc_cms__inAppMessage)
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppMessage",
  "attributes": {
    "content": { "message": "Body copy" },
    "style": { "fontSize": "s", "fontStyle": "regular", "textAlignment": "center",
               "textColor": "#000000", "androidFont": "", "iosFont": "" }
  }
}
\`\`\`

### TertiaryMessage (sfdc_cms__inAppTertiaryMessage)
Small bottom text, can include hyperlinks via inline tokens \`&lt;&lt;link label&gt;&gt;\` referencing children.
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppTertiaryMessage",
  "attributes": {
    "content": {
      "text": "By signing up, you agree to our &lt;&lt;privacy policy&gt;&gt;.",
      "links": [{
        "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppTertiaryLink",
        "attributes": { "hyperLink": "https://example.com/privacy", "hyperText": "privacy policy" }
      }]
    },
    "style": { "fontSize": "xs", "fontStyle": "regular", "textAlignment": "center",
               "textColor": "#000000", "linkColor": "#066AFE", "androidFont": "", "iosFont": "" }
  }
}
\`\`\`
For no tertiary message, use \`"content": { "text": "" }\` and no \`links\`.

### Media (sfdc_cms__inAppMedia)
Two source types — CMS image OR external URL.

CMS image:
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppMedia",
  "attributes": {
    "content": {
      "attributes": {
        "link": {
          "altText": "Description",
          "source": { "type": "imageReference", "ref": { "contentKey": "[CMS-IMAGE-KEY]" },
                      "mimeType": "image/png", "size": 0 },
          "url": "/cms/media/[CMS-IMAGE-KEY]"
        },
        "mediaType": "Image", "mimeType": "image/png", "type": "mediaUrl"
      }
    },
    "style": { "cornerRadius": "s", "insetSize": "s", "mediaSize": "e2e" }
  }
}
\`\`\`

External URL:
\`\`\`json
"content": {
  "attributes": {
    "link": {
      "source": { "type": "url", "ref": "https://images.example.com/x.jpg" },
      "url":    "https://images.example.com/x.jpg"
    },
    "mediaType": "Image", "type": "mediaUrl"
  }
}
\`\`\`

**Clickable image (UI-hidden, API-only)** — attach a click-through directly on the \`link\` object:
\`\`\`json
"link": {
  "action": "1",                                  // same vocabulary as ActionButton: "1" = open URL
  "actionUrl": "https://example.com/target",
  "passbackValue": "imgClick",                    // analytics marker fired on tap
  "source": { ... }, "url": "...", "altText": "..."
}
\`\`\`
Note: the CMS UI editor does NOT expose these fields, but the API persists them and the Copy/Duplicate action preserves them. Verified empirically against \`sfdc_cms__inAppMedia\` schema (block validator allows \`link.action\`/\`link.actionUrl\`/\`link.passbackValue\`). Do NOT place \`action\`/\`actionUrl\` on \`content\` directly — \`additionalProperties:false\` rejects them there.

### ContainerStyle (sfdc_cms__inAppContainerStyle)
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppContainerStyle",
  "attributes": {
    "background": { "color": "#FFFFFF", "opacity": "100" },
    "cornerRadius": "m",                                  // s|m|l
    "messageOrientation": "imageTitleBody",
    "dismissIcon": { "backgroundColor": "#F3F3F3", "iconColor": "#000000" },
    "overlay": { "color": "#000000", "opacity": "50" }    // 0..100
  }
}
\`\`\`

### ActionButtons (sfdc_cms__inAppActionButtons)
Wrapper block with \`actions\` array of \`sfdc_cms__inAppActionButton\` children.
\`\`\`json
{
  "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppActionButtons",
  "attributes": {
    "actions": [
      {
        "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppActionButton",
        "attributes": {
          "content": {
            "id": "[same UUID as parent action block]",
            "action": "1",                                // action id reference
            "label": "Continue",
            "actionUrl": "https://example.com",
            "passbackValue": "btn1"
          },
          "style": { "buttonColor": "#000000", "textColor": "#FFFFFF",
                     "cornerRadius": "m", "fontSize": "s", "fontStyle": "regular",
                     "textAlignment": "center", "androidFont": "", "iosFont": "" }
        }
      }
    ],
    "style": { "buttonsLayout": "horizontal" }            // horizontal|vertical
  }
}
\`\`\`
For no buttons: \`"actions": []\`.

---

## Complete minimal FullScreen example

\`\`\`json
{
  "sfdc_cms:title": "My InApp",
  "inAppType": "FullScreen",
  "inAppImageLayoutType": "fillscreennoscroll",
  "lightning:dataProviders": [],
  "lightning:expressions": [],
  "inAppBlock": {
    "id": "ROOT-UUID",
    "type": "block",
    "definition": "sfdc_cms__inAppTypeFullScreen",
    "attributes": {
      "type": "FullScreen",
      "title":          { "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppTitle",
                          "attributes": { "content": { "title": "Welcome" },
                            "style": { "fontSize": "l", "fontStyle": "regular",
                                       "textAlignment": "center", "textColor": "#000000",
                                       "androidFont": "", "iosFont": "" } } },
      "message":        { "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppMessage",
                          "attributes": { "content": { "message": "Body copy here." },
                            "style": { "fontSize": "s", "fontStyle": "regular",
                                       "textAlignment": "center", "textColor": "#000000",
                                       "androidFont": "", "iosFont": "" } } },
      "tertiaryMessage":{ "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppTertiaryMessage",
                          "attributes": { "content": { "text": "" },
                            "style": { "fontSize": "xs", "fontStyle": "regular",
                                       "textAlignment": "center", "textColor": "#000000",
                                       "linkColor": "#066AFE", "androidFont": "", "iosFont": "" } } },
      "media":          { "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppMedia",
                          "attributes": {
                            "content": { "attributes": { "link": {
                              "source": { "type": "url", "ref": "https://images.example.com/hero.jpg" },
                              "url": "https://images.example.com/hero.jpg" },
                              "mediaType": "Image", "type": "mediaUrl" } },
                            "style": { "cornerRadius": "s", "insetSize": "s", "mediaSize": "e2e" } } },
      "containerStyle": { "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppContainerStyle",
                          "attributes": {
                            "background": { "color": "#FFFFFF", "opacity": "100" },
                            "cornerRadius": "m",
                            "messageOrientation": "imageTitleBody",
                            "dismissIcon": { "backgroundColor": "#F3F3F3", "iconColor": "#000000" },
                            "overlay": { "color": "#000000", "opacity": "0" } } },
      "actionButtons":  { "id": "[UUID]", "type": "block", "definition": "sfdc_cms__inAppActionButtons",
                          "attributes": { "actions": [], "style": { "buttonsLayout": "horizontal" } } }
    }
  }
}
\`\`\`

---

## Differences from email

| Aspect | Email | In-App |
|--------|-------|--------|
| Root definition | sfdc_cms/rootContentBlock | sfdc_cms__inAppType<Type> |
| Children model | flat \`children\` array under section→column | named slot attributes |
| Components | lightning/heading, paragraph, button, image | sfdc_cms__inAppTitle/Message/Media/ActionButtons |
| Layout | grid (columnWidth) | inAppType + inAppImageLayoutType |
| Subject line | yes | no — \`sfdc_cms:title\` only |

---

## Common pitfalls

| Pitfall | Solution |
|---------|----------|
| Using lightning/* components | Wrong — In-App uses sfdc_cms__inApp* exclusively |
| Mismatched inAppType vs root definition | Both must match (FullScreen ↔ inAppTypeFullScreen) |
| Children array under root | No — slots are named keys under \`attributes\` |
| Missing required slot | All 6 slots (title, message, tertiaryMessage, media, containerStyle, actionButtons) must exist, even if empty |
| Action button id mismatch | actionButton.id, content.id, and parent action.id should match |
`,

  'errors': `
## Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| 405 METHOD_NOT_ALLOWED | Wrong HTTP method | POST for create, GET for read |
| uuid is invalid | Block IDs not UUIDs | Use format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx |
| Content not editable | Using lightning/html | Use lightning/heading, lightning/paragraph instead |
| Image not showing | External URL in lightning/image | Upload to CMS or use lightning/html |
| Missing text color | No lightning:colorGroup | Add colorGroup with textColor |

### Debugging Tips:
1. Use cms_validate_request before creating
2. Check all block IDs are valid UUIDs
3. Verify hierarchy: root → section → column → component
4. For images, use list_cms_content to find valid contentKeys
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

  // Track component usage for warnings
  let htmlBlockCount = 0;
  let editableBlockCount = 0;

  // Recursively validate all blocks
  function validateBlock(block, path = 'root') {
    if (!validateUUID(block.id)) {
      errors.push(`❌ Invalid UUID at ${path}: "${block.id}"`);
    }

    if (!block.definition) {
      errors.push(`❌ Missing definition at ${path}`);
    }

    // Track editable vs non-editable usage
    if (block.definition === 'lightning/html') {
      htmlBlockCount++;
    } else if (['lightning/heading', 'lightning/paragraph', 'lightning/actionButton', 'lightning/image'].includes(block.definition)) {
      editableBlockCount++;
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

  // Warn about excessive HTML usage
  if (htmlBlockCount > 0 && editableBlockCount === 0) {
    warnings.push(`⚠️ All ${htmlBlockCount} content blocks use lightning/html - content will NOT be editable in UI!`);
    warnings.push(`💡 TIP: Use lightning/heading, lightning/paragraph, lightning/actionButton for editable content.`);
  } else if (htmlBlockCount > editableBlockCount) {
    warnings.push(`⚠️ ${htmlBlockCount} HTML blocks vs ${editableBlockCount} editable blocks - consider using more editable components.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    stats: {
      htmlBlocks: htmlBlockCount,
      editableBlocks: editableBlockCount
    }
  };
}

const INAPP_TYPES = ['FullScreen', 'PushPrimer', 'Banner', 'Modal'];
const INAPP_REQUIRED_SLOTS = ['title', 'message', 'tertiaryMessage', 'media', 'containerStyle', 'actionButtons'];
const INAPP_SLOT_DEFINITIONS = {
  title: 'sfdc_cms__inAppTitle',
  message: 'sfdc_cms__inAppMessage',
  tertiaryMessage: 'sfdc_cms__inAppTertiaryMessage',
  media: 'sfdc_cms__inAppMedia',
  containerStyle: 'sfdc_cms__inAppContainerStyle',
  actionButtons: 'sfdc_cms__inAppActionButtons'
};

function validateInAppStructure(contentBody) {
  const errors = [];
  const warnings = [];

  if (!contentBody['sfdc_cms:title']) {
    errors.push('❌ Missing sfdc_cms:title');
  }

  const inAppType = contentBody.inAppType;
  if (!inAppType) {
    errors.push('❌ Missing inAppType (FullScreen | PushPrimer | Banner | Modal)');
  } else if (!INAPP_TYPES.includes(inAppType)) {
    warnings.push(`⚠️ inAppType "${inAppType}" not in known set ${INAPP_TYPES.join('|')} — proceed with caution`);
  }

  if (!contentBody.inAppImageLayoutType) {
    warnings.push('⚠️ Missing inAppImageLayoutType (e.g. fillscreennoscroll, 16x9, 1x1, 4x3)');
  }

  const root = contentBody.inAppBlock;
  if (!root) {
    errors.push('❌ Missing inAppBlock root');
    return { valid: false, errors, warnings };
  }

  if (!validateUUID(root.id)) {
    errors.push(`❌ inAppBlock root id is not a valid UUID: "${root.id}"`);
  }

  const expectedRootDef = inAppType ? `sfdc_cms__inAppType${inAppType}` : null;
  if (expectedRootDef && root.definition !== expectedRootDef) {
    errors.push(`❌ Root definition mismatch: expected "${expectedRootDef}" for inAppType "${inAppType}", got "${root.definition}"`);
  }

  const attrs = root.attributes || {};
  if (inAppType && attrs.type !== inAppType) {
    errors.push(`❌ inAppBlock.attributes.type ("${attrs.type}") must match inAppType ("${inAppType}")`);
  }

  for (const slot of INAPP_REQUIRED_SLOTS) {
    const block = attrs[slot];
    if (!block) {
      errors.push(`❌ Missing required slot "${slot}"`);
      continue;
    }
    if (!validateUUID(block.id)) {
      errors.push(`❌ Slot "${slot}" has invalid UUID: "${block.id}"`);
    }
    const expectedDef = INAPP_SLOT_DEFINITIONS[slot];
    if (block.definition !== expectedDef) {
      errors.push(`❌ Slot "${slot}" definition must be "${expectedDef}", got "${block.definition}"`);
    }
  }

  // Validate action buttons
  const actionButtons = attrs.actionButtons;
  if (actionButtons && Array.isArray(actionButtons.attributes?.actions)) {
    actionButtons.attributes.actions.forEach((btn, i) => {
      if (!validateUUID(btn.id)) {
        errors.push(`❌ actionButton[${i}] has invalid UUID: "${btn.id}"`);
      }
      if (btn.definition !== 'sfdc_cms__inAppActionButton') {
        errors.push(`❌ actionButton[${i}] definition must be "sfdc_cms__inAppActionButton", got "${btn.definition}"`);
      }
      if (!btn.attributes?.content?.label) {
        warnings.push(`⚠️ actionButton[${i}] has no label`);
      }
    });
  }

  // Validate tertiary message links
  const tert = attrs.tertiaryMessage;
  const tertLinks = tert?.attributes?.content?.links;
  if (Array.isArray(tertLinks)) {
    tertLinks.forEach((link, i) => {
      if (!validateUUID(link.id)) {
        errors.push(`❌ tertiaryMessage.links[${i}] has invalid UUID: "${link.id}"`);
      }
      if (link.definition !== 'sfdc_cms__inAppTertiaryLink') {
        errors.push(`❌ tertiaryMessage.links[${i}] definition must be "sfdc_cms__inAppTertiaryLink"`);
      }
    });
  }

  return { valid: errors.length === 0, errors, warnings };
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
        description: 'MANDATORY PRE-FLIGHT CHECK - Call this FIRST before creating emails or in-app messages. Returns clearance token and required reading.',
        inputSchema: {
          type: 'object',
          properties: {
            operation_type: {
              type: 'string',
              description: 'Type of operation: "email_creation", "inapp_creation", "content_update"',
              enum: ['email_creation', 'inapp_creation', 'content_update']
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
        description: 'Validate content structure BEFORE creating. content_type:"email" checks editable-vs-html blocks; content_type:"inapp" checks slot completeness, definitions, and UUIDs.',
        inputSchema: {
          type: 'object',
          properties: {
            content_type: {
              type: 'string',
              description: 'Content type being validated',
              enum: ['email', 'inapp', 'image', 'template']
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
        description: 'Get documentation on how to use the Salesforce CMS API correctly. Topics: "master-guide", "sections", "email", "inapp", "content-types", "errors", "all"',
        inputSchema: {
          type: 'object',
          properties: {
            topic: {
              type: 'string',
              description: 'Topic to get help on',
              enum: ['master-guide', 'sections', 'email', 'inapp', 'content-types', 'errors', 'all']
            }
          }
        }
      },
      {
        name: 'list_cms_content',
        description: 'List content items in the Salesforce CMS workspace. Use this to find image contentKeys for lightning/image components.',
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
Features: 
- Preflight Check with Clearance Tokens
- EDITABLE Email Components (heading, paragraph, button, image)
- Validation with HTML Block Warnings
- Custom Color Styling (no brand setup required)`
          }]
        };
      }

      case 'cms_preflight_check': {
        const { operation_type, user_intent } = args;
        const clearanceToken = generateClearanceToken();

        if (operation_type === 'inapp_creation') {
          const inappResponse = `
🚦 PRE-FLIGHT CHECK: IN-APP MESSAGE CREATION

User Intent: "${user_intent}"

═══════════════════════════════════════════════════════════

📚 REQUIRED READING:

→ Call get_api_guide with topic: "inapp"

═══════════════════════════════════════════════════════════

⚠️ KEY POINTS for In-App Messages:

• ContentType is "sfdc_cms__inApp" (different from email)
• Block model is SLOTS, not section/column hierarchy
• 6 required slots: title, message, tertiaryMessage, media, containerStyle, actionButtons
• Block definitions use sfdc_cms__inApp* namespace (NOT lightning/*)
• inAppType (e.g. FullScreen) must match root definition (sfdc_cms__inAppTypeFullScreen)
   AND inAppBlock.attributes.type
• All block IDs must be valid UUIDs

═══════════════════════════════════════════════════════════

📊 WORKFLOW:

1. ✅ Preflight check complete
2. → Read inapp documentation (get_api_guide topic:"inapp")
3. → Build contentBody with all 6 slots
4. → Validate (cms_validate_request content_type:"inapp")
5. → Create (create_cms_content type:"sfdc_cms__inApp" + clearance token)

═══════════════════════════════════════════════════════════

🔑 CLEARANCE TOKEN (Valid 30 minutes, single use):

${clearanceToken}

═══════════════════════════════════════════════════════════
`;
          return { content: [{ type: 'text', text: inappResponse }] };
        }

        const response = `
🚦 PRE-FLIGHT CHECK: ${operation_type.toUpperCase().replace('_', ' ')}

User Intent: "${user_intent}"

═══════════════════════════════════════════════════════════

📚 REQUIRED READING:

→ Call get_api_guide with topic: "master-guide"

═══════════════════════════════════════════════════════════

⚠️ CRITICAL: CREATE EDITABLE CONTENT!

✅ USE these for EDITABLE content:
   • lightning/heading    → Editable headlines
   • lightning/paragraph  → Editable text blocks
   • lightning/actionButton → Editable buttons
   • lightning/image      → Editable images (CMS upload required)

❌ AVOID lightning/html unless absolutely necessary!
   • Creates NON-EDITABLE raw HTML blocks
   • Use only for: external images, complex custom layouts

═══════════════════════════════════════════════════════════

🎨 STYLING (Custom Colors - No Brand Setup Required):

Heading:
  "lightning:colorGroup": { "textColor": "#1C6E7D" }

Paragraph:
  "lightning:colorGroup": { "textColor": "#333333", "linkColor": "#0176d3" }

Button:
  "lightning:colorGroup": { "backgroundColor": "#1C6E7D", "textColor": "#FFFFFF" }

═══════════════════════════════════════════════════════════

📊 WORKFLOW:

1. ✅ Preflight check complete
2. → Read master-guide documentation
3. → Build email with EDITABLE components
4. → Validate with cms_validate_request
5. → Create with create_cms_content + clearance token

═══════════════════════════════════════════════════════════

🔑 CLEARANCE TOKEN (Valid 30 minutes, single use):

${clearanceToken}

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

        if (content_type === 'inapp') {
          const validation = validateInAppStructure(content_body);
          let response = validation.valid ? '✅ VALIDATION PASSED\n\n' : '❌ VALIDATION FAILED\n\n';
          if (validation.errors.length > 0) {
            response += '**Errors (must fix):**\n' + validation.errors.join('\n') + '\n\n';
          }
          if (validation.warnings.length > 0) {
            response += '**Warnings:**\n' + validation.warnings.join('\n') + '\n\n';
          }
          response += '**Next Step:** ' + (validation.valid
            ? 'Call create_cms_content with type:"sfdc_cms__inApp" and your clearance token'
            : 'Fix errors and validate again');
          return { content: [{ type: 'text', text: response }] };
        }

        if (content_type === 'email') {
          const validation = validateEmailStructure(content_body);
          
          let response = validation.valid
            ? '✅ VALIDATION PASSED\n\n'
            : '❌ VALIDATION FAILED\n\n';

          // Stats
          response += `📊 Content Stats:\n`;
          response += `   • Editable blocks: ${validation.stats.editableBlocks}\n`;
          response += `   • HTML blocks (non-editable): ${validation.stats.htmlBlocks}\n\n`;

          if (validation.errors.length > 0) {
            response += '**Errors (must fix):**\n' + validation.errors.join('\n') + '\n\n';
          }

          if (validation.warnings.length > 0) {
            response += '**Warnings:**\n' + validation.warnings.join('\n') + '\n\n';
          }

          if (validation.valid && validation.stats.editableBlocks > 0) {
            response += '✨ Great job using editable components! Content will be editable in the UI.\n\n';
          }

          response += '**Next Step:** ' + (validation.valid
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
        // Check clearance token for email and in-app creation
        if (args.type === 'sfdc_cms__email' || args.type === 'sfdc_cms__inApp') {
          if (!args.clearance_token) {
            return {
              content: [{
                type: 'text',
                text: `⛔ CLEARANCE TOKEN REQUIRED

You attempted to create an email without a clearance token.

REQUIRED WORKFLOW:
1. Call cms_preflight_check with operation_type: "email_creation"
2. Read documentation using get_api_guide with topic: "master-guide"
3. Build your email structure with EDITABLE components
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
Status: Draft

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
