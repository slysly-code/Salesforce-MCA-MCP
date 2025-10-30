# Salesforce CMS MCP Server

MCP server that provides Claude Desktop with direct access to Salesforce CMS operations.

## 🚀 Features

- **List Content**: Browse content in your CMS workspace
- **Get Content**: Retrieve detailed content structure
- **Create Content**: Create new CMS content
- **Update Content**: Modify existing content
- **Get Types**: List available content types
- **Publish**: Publish content to make it live
- **Delete**: Remove content from CMS

## 📦 Setup

### 1. Install Dependencies

```bash
cd C:\repos\salesforce-cms-mcp-server
npm install
```

### 2. Configure Credentials

```bash
# Copy template
copy .env.example .env

# Edit .env with your Salesforce credentials
notepad .env
```

Use the same credentials from your `mce-to-cms-migration` project:
- `SF_INSTANCE_URL`: Your Salesforce org URL
- `SF_CLIENT_ID`: Consumer Key from Connected App
- `SF_USERNAME`: Your Salesforce username
- `SF_JWT_PRIVATE_KEY_PATH`: Path to your private key (can reuse from migration project)
- `SF_WORKSPACE_NAME`: Your CMS workspace name

### 3. Add to Claude Desktop

Edit your Claude Desktop config file:

**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Mac**: `~/Library/Application Support/Claude/claude_desktop_config.json`

Add this server:

```json
{
  "mcpServers": {
    "salesforce-cms": {
      "command": "node",
      "args": ["C:\\repos\\salesforce-cms-mcp-server\\src\\index.js"],
      "env": {
        "SF_INSTANCE_URL": "https://storm-6d85ffc578e682.lightning.force.com",
        "SF_CLIENT_ID": "your_consumer_key_here",
        "SF_USERNAME": "storm.6d85ffc578e682@salesforce.com",
        "SF_JWT_PRIVATE_KEY_PATH": "C:\\repos\\mce-to-cms-migration\\certs\\server.key",
        "SF_WORKSPACE_NAME": "Content Workspace for Marketing Cloud",
        "SF_API_VERSION": "v61.0"
      }
    }
  }
}
```

### 4. Restart Claude Desktop

Close and reopen Claude Desktop. The CMS tools will now be available!

## 🛠️ Available Tools

### `list_cms_content`
List content items in the workspace.

**Parameters:**
- `limit` (number, optional): Max items to return (default: 10)

**Example:**
```
List the first 5 content items in CMS
```

### `get_cms_content`
Get detailed information about specific content.

**Parameters:**
- `identifier` (string): Content ID or ContentKey

**Example:**
```
Get the content with key MCWV26UCUUYNAFNP3Y53CVWGE23E
```

### `get_cms_types`
List all available content types.

**Example:**
```
What content types are available in CMS?
```

### `create_cms_content`
Create new content in CMS.

**Parameters:**
- `type` (string): Content type
- `title` (string): Content title
- `urlName` (string): URL-friendly name
- `contentKey` (string): Unique content key
- `language` (string, optional): Language code (default: en_US)
- `contentBody` (object, optional): Content body fields

**Example:**
```
Create a new news article titled "Product Launch" with key "product-launch-2025"
```

### `update_cms_content`
Update existing content body.

**Parameters:**
- `contentId` (string): Content ID to update
- `contentBody` (object): Updated content body

**Example:**
```
Update content ID abc123 with a new description
```

### `publish_cms_content`
Publish content to make it live.

**Parameters:**
- `contentId` (string): Content ID to publish

**Example:**
```
Publish content ID abc123
```

### `delete_cms_content`
Delete content from CMS.

**Parameters:**
- `contentId` (string): Content ID to delete

**Example:**
```
Delete content ID abc123
```

## 🧪 Testing

You can test the server directly:

```bash
# Run the server
npm start

# In another terminal, test with MCP inspector
npx @modelcontextprotocol/inspector node src/index.js
```

## 📝 Usage Examples

Once configured in Claude Desktop, you can use natural language:

- "List the content in my CMS workspace"
- "Get the content with key MCWV26UCUUYNAFNP3Y53CVWGE23E and show me its structure"
- "What content types are available?"
- "Create a test news article"
- "Update that content with a new description"
- "Publish the content"

## 🔧 Troubleshooting

### "Authentication failed"
- Check your credentials in Claude Desktop config
- Verify JWT certificate path is correct
- Ensure Connected App has "Admin approved users are pre-authorized"

### "Workspace not found"
- Verify workspace name matches exactly (case-sensitive)
- Check in Salesforce: Setup → CMS Workspaces

### Server not appearing in Claude Desktop
- Check config file syntax (valid JSON)
- Verify file paths use double backslashes on Windows
- Restart Claude Desktop after config changes
- Check Claude Desktop logs for errors

## 📚 Related Projects

- **mce-to-cms-migration**: Main migration tool
- **salesforce-mce-mcp-server**: MCP server for Marketing Cloud Engagement

## 🎯 What's Next?

Now you can:
1. Inspect existing CMS content structure
2. Test content creation directly through Claude
3. Develop the migration tool interactively
4. Debug issues in real-time
