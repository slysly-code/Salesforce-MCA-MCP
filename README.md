# Salesforce CMS MCP Server

An MCP (Model Context Protocol) server that enables LLMs like Claude to interact directly with Salesforce Enhanced CMS workspaces.

## Features

- **List Content** - Browse all content items in your workspace (including drafts)
- **Get Content** - Retrieve detailed content by ID or ContentKey
- **Create Content** - Create new emails, images, and documents
- **Update Content** - Modify existing content
- **Publish Content** - Make content live
- **Delete Content** - Remove content from the workspace
- **API Guide** - Built-in documentation for LLMs

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env` and configure your Salesforce credentials:
   ```
   SF_INSTANCE_URL=https://your-instance.salesforce.com
   SF_CLIENT_ID=your_connected_app_client_id
   SF_USERNAME=your_salesforce_username
   SF_JWT_PRIVATE_KEY_PATH=/path/to/your/private-key.pem
   SF_WORKSPACE_NAME=Your CMS Workspace Name
   SF_API_VERSION=v61.0
   ```

4. Add to your Claude Desktop config (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "salesforce-cms": {
         "command": "node",
         "args": ["C:/path/to/salesforce-cms-mcp-server/src/index.js"]
       }
     }
   }
   ```

## Available Tools

| Tool | Description |
|------|-------------|
| `server_version` | Check server version and verify restarts |
| `get_api_guide` | Get documentation on API usage (topics: email, content-types, errors, all) |
| `list_cms_content` | List content items in the workspace |
| `get_cms_content` | Get detailed content by ID or ContentKey |
| `get_cms_types` | List available content types |
| `create_cms_content` | Create new content |
| `update_cms_content` | Update existing content |
| `publish_cms_content` | Publish content |
| `delete_cms_content` | Delete content |

## Creating Email Content

Marketing Cloud emails use a block-based structure. **Always call `get_api_guide` with topic="email" first** to get the correct structure.

### Key Requirements:

1. **Block IDs must be valid UUIDs**: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. **Required hierarchy**: `sfdc_cms/rootContentBlock` → `lightning/section` → `lightning/column` → components
3. **Required fields**: `subjectLine`, `sfdc_cms:title`, `sfdc_cms:block`

### Example:

```javascript
create_cms_content({
  type: "sfdc_cms__email",
  title: "My Email",
  contentKey: "MY_EMAIL_KEY",
  urlName: "my-email",
  contentBody: {
    subjectLine: "Hello World",
    "sfdc_cms:title": "My Email",
    "sfdc_cms:block": {
      id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      type: "block",
      definition: "sfdc_cms/rootContentBlock",
      children: [/* section → column → components */]
    }
  }
})
```

## API Learnings

### Critical Notes:

| Issue | Solution |
|-------|----------|
| `GET /connect/cms/contents` returns 405 | This endpoint only accepts POST. Use `/connect/cms/items/search` for listing |
| "uuid is invalid" error | All block IDs must be valid UUIDs |
| "MISSING_ARGUMENT" error | Use `contentSpaceOrFolderIds` parameter, not `library` |
| JSON parse errors in Claude | Never use `console.log` in MCP servers - it corrupts stdio |

### Correct Endpoints:

| Operation | Endpoint | Method |
|-----------|----------|--------|
| List content | `/connect/cms/items/search` | GET |
| Get content | `/connect/cms/contents/{id}` | GET |
| Create content | `/connect/cms/contents` | POST |
| Update content | `/connect/cms/contents/{id}` | PATCH |
| Publish content | `/connect/cms/contents/{id}/publish` | POST |
| Delete content | `/connect/cms/contents/{id}` | DELETE |

## Content Types (Marketing Cloud Workspace)

| Type | API Name |
|------|----------|
| Email | `sfdc_cms__email` |
| Email Template | `sfdc_cms__emailTemplate` |
| Content Block | `sfdc_cms__emailFragment` |
| Image | `sfdc_cms__image` |

## Development

### Verifying Server Restarts

The server includes a version check tool:
```
server_version
```

Returns version number and build timestamp. Increment `SERVER_VERSION` in `index.js` when making changes.

### Important: No Console Logging

MCP servers communicate via stdio JSON. Any `console.log` or `console.error` statements will corrupt the communication. Use the error response format instead.

## Documentation

- [Full API Reference](.docs/salesforce-cms-api-reference.md)
- [Salesforce CMS Developer Guide](https://developer.salesforce.com/docs/platform/cms/guide/cms-developer-guide.html)
- [Connect REST API - Enhanced CMS Resources](https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/connect_resources_managed_content_enhanced_resources.htm)

## License

MIT

---

*Built for use with Claude Desktop and other MCP-compatible LLM clients.*
