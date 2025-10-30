# 🚀 Quick Start Guide - Salesforce CMS MCP Server

## Step 1: Install Dependencies

```bash
cd C:\repos\salesforce-cms-mcp-server
npm install
```

## Step 2: Test the Server

```bash
npm start
```

You should see:
```
Salesforce CMS MCP Server running on stdio
```

Press Ctrl+C to stop.

## Step 3: Configure Claude Desktop

### Windows:

1. Open: `%APPDATA%\Claude\claude_desktop_config.json`
2. Add the CMS server configuration:

```json
{
  "mcpServers": {
    "salesforce-cms": {
      "command": "node",
      "args": ["C:\\repos\\salesforce-cms-mcp-server\\src\\index.js"],
      "env": {
        "SF_INSTANCE_URL": "https://storm-6d85ffc578e682.lightning.force.com",
        "SF_CLIENT_ID": "3MVG9aNlkJwuH9vNrZiIhNsS6a6qQMDqMb1oC_f2xlqeWfwZdjaujMTQ_BfFm9AZ4utV8A9xOTa_jkxYqljvu",
        "SF_USERNAME": "storm.6d85ffc578e682@salesforce.com",
        "SF_JWT_PRIVATE_KEY_PATH": "C:\\repos\\mce-to-cms-migration\\certs\\server.key",
        "SF_WORKSPACE_NAME": "Content Workspace for Marketing Cloud",
        "SF_API_VERSION": "v61.0"
      }
    }
  }
}
```

**Note**: If you already have other MCP servers (like MCE), add this inside the existing `mcpServers` object.

## Step 4: Restart Claude Desktop

1. Close Claude Desktop completely
2. Reopen Claude Desktop
3. Look for a 🔌 icon or tools indicator

## Step 5: Test in Claude Desktop

Try these commands in Claude:

```
Get the content with key MCWV26UCUUYNAFNP3Y53CVWGE23E
```

```
List content in my CMS workspace
```

```
What content types are available in CMS?
```

## ✅ Success!

You should now be able to interact with Salesforce CMS directly through Claude Desktop!

## 🎯 What You Can Do Now

1. **Examine existing content structure**: "Get content MCWV26UCUUYNAFNP3Y53CVWGE23E and show me its complete structure"
2. **Test content creation**: "Create a test content item to validate write permissions"
3. **Develop migration logic**: Work with me to build the transformation logic
4. **Debug issues**: Real-time access to CMS for troubleshooting

## 🔧 Troubleshooting

**Server not showing up?**
- Check JSON syntax in config file
- Verify paths use double backslashes `\\` on Windows
- Look for errors in Claude Desktop logs
- Restart Claude Desktop

**Authentication errors?**
- Verify credentials in config match your .env
- Check certificate path is correct
- Ensure Connected App settings are correct

**Need help?**
Ask me in Claude Desktop: "Help me debug the Salesforce CMS MCP server"
