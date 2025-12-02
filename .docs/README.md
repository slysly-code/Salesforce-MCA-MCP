# Using Context Documentation with Antigravity IDE

## Overview

This guide explains how to add API references and helpful documents to your project so they're accessible when working with Antigravity IDE.

## Option 1: Project Documentation Folder (Recommended)

Created a `.docs/` folder in your project root to store reference materials:

```
c:\repos\salesforce-cms-mcp-server\
  ├── .docs/
  │   ├── salesforce-cms-api-reference.md  ✅ Already created!
  │   ├── authentication-guide.md
  │   └── best-practices.md
  ├── src/
  └── package.json
```

### Benefits:
- Antigravity can read these files when you mention them
- Version controlled with your code
- Easy to share with team members
- Organized and discoverable

## Option 2: URLs and Web Resources

You can share URLs to documentation pages:

**Salesforce CMS Documentation**:
- [Managed Content Enhanced Resources](https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/connect_resources_managed_content_enhanced_resources.htm)
- [Connect REST API Guide](https://developer.salesforce.com/docs/atlas.en-us.chatterapi.meta/chatterapi/)
- [CMS Developer Guide](https://developer.salesforce.com/docs/atlas.en-us.exp_cloud_cms.meta/exp_cloud_cms/)

**Usage**: Just paste the URL in conversation and I can read it directly.

## Option 3: Context File

Create a `CONTEXT.md` file in your project root with important information:

```markdown
# Project Context

## Documentation Resources
- [API Reference](.docs/salesforce-cms-api-reference.md)
- [Salesforce CMS Docs](https://developer.salesforce.com/...)

## Environment Setup
- Node.js version: 18+
- Salesforce API Version: v61.0
- JWT Authentication required

## Common Patterns
- Always use contentKey for content identification
- Publish content after creation
- Handle 401 errors by re-authenticating
```

## Option 4: Inline References

When starting a conversation, you can say:
- "Using the API reference in `.docs/salesforce-cms-api-reference.md`, help me..."
- "Check the endpoint documentation and implement..."
- "According to `.docs/salesforce-cms-api-reference.md`, the create endpoint requires..."

## What You've Already Set Up

✅ **Created `.docs/salesforce-cms-api-reference.md`** - Comprehensive API reference covering:
- All major CMS endpoints (list, get, create, update, publish, delete)
- Authentication requirements
- Request/response examples
- Error handling
- Best practices

## Next Steps

You can add more documentation:

1. **Authentication Guide**: Detailed JWT setup instructions
2. **Testing Guide**: How to test endpoints
3. **Migration Notes**: Specific notes from MCE to CMS migration
4. **Code Examples**: Common implementation patterns

## Using Documentation in Conversation

Simply reference the files naturally:

- "Based on the API reference, implement a function to create content"
- "Check `.docs/salesforce-cms-api-reference.md` for the publish endpoint"
- "What does the API reference say about pagination?"

I'll automatically read and reference the documentation! 📚
