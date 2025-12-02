# Salesforce CMS Connect API Reference (Enhanced CMS)

> **Last Updated**: December 2025  
> **API Version**: v61.0  
> **Important**: This documentation covers **Enhanced CMS Workspaces** which have different endpoints than standard CMS.

## Overview

The Salesforce CMS Connect API provides programmatic access to manage content within Salesforce CMS. This MCP server is configured for **Enhanced CMS Workspaces** (like "Content Workspace for Marketing Cloud").

---

## Critical API Learnings

### ⚠️ Common Pitfalls

1. **GET vs POST on `/connect/cms/contents`**: This endpoint only accepts **POST** for creating content. It does NOT support GET for listing.

2. **Listing Content**: Use `/connect/cms/items/search` with required parameters:
   - `contentSpaceOrFolderIds` (required): The workspace ID (starts with `0Zu`)
   - `queryTerm` (required): Search term, use `*` for all content
   - `pageSize` (optional): Number of results

3. **Getting Content Details**: Use `/connect/cms/contents/{contentKeyOrId}` - works with both contentKey (e.g., `MCWV26UCUUYNAFNP3Y53CVWGE23E`) or managedContentId.

4. **Block IDs Must Be UUIDs**: When creating content with `sfdc_cms:block`, all `id` fields must be valid UUIDs in format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

5. **No console.log in MCP Servers**: Never use `console.log` or `console.error` in MCP server code - it corrupts the stdio JSON communication.

---

## Working Endpoints

### 1. List/Search CMS Content

**Endpoint**: `GET /connect/cms/items/search`

**Required Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `contentSpaceOrFolderIds` | String | Workspace ID (0Zu prefix) or folder ID (9Pu prefix) |
| `queryTerm` | String | Search term (min 2 chars). Use `*` for all content |

**Optional Parameters**:
| Parameter | Type | Description |
|-----------|------|-------------|
| `pageSize` | Integer | Results per page (1-250, default 25) |
| `contentTypeFQN` | String | Filter by content type |
| `languages` | String | Language filter |

**Example**:
```
GET /connect/cms/items/search?contentSpaceOrFolderIds=0ZuWs0000011zP4KAI&queryTerm=*&pageSize=20
```

---

### 2. Get Content Details

**Endpoint**: `GET /connect/cms/contents/{contentKeyOrId}`

**Path Parameters**:
- `contentKeyOrId`: Either the contentKey (e.g., `MCWV26UCUUYNAFNP3Y53CVWGE23E`) or managedContentId

**Example**:
```
GET /connect/cms/contents/MCWV26UCUUYNAFNP3Y53CVWGE23E
```

---

### 3. Create CMS Content

**Endpoint**: `POST /connect/cms/contents`

**Request Body**:
```json
{
  "contentSpaceOrFolderId": "0ZuWs0000011zP4KAI",
  "contentType": "sfdc_cms__email",
  "apiName": "UNIQUE_CONTENT_KEY",
  "contentBody": {
    // Content-type specific fields
  }
}
```

---

## Content Type: Email (`sfdc_cms__email`)

Marketing Cloud emails use a block-based structure. Here's the required schema:

### Required Fields in `contentBody`:

| Field | Type | Description |
|-------|------|-------------|
| `subjectLine` | String | Email subject line |
| `sfdc_cms:title` | String | Content title |
| `sfdc_cms:block` | Object | Root content block with nested children |

### Optional Fields:

| Field | Type | Description |
|-------|------|-------------|
| `preheader` | String | Email preheader text |
| `messagePurpose` | String | `promotional` or `transactional` |

### Block Structure

The `sfdc_cms:block` must follow this hierarchy:

```
sfdc_cms/rootContentBlock
  └── lightning/section
        └── lightning/column
              ├── lightning/heading
              ├── lightning/paragraph
              ├── lightning/image
              ├── lightning/button
              └── lightning/html
```

### Complete Email Creation Example:

```json
{
  "contentSpaceOrFolderId": "0ZuWs0000011zP4KAI",
  "contentType": "sfdc_cms__email",
  "apiName": "MY_EMAIL_2025",
  "contentBody": {
    "subjectLine": "Welcome to Our Newsletter",
    "preheader": "Check out what's new this month",
    "messagePurpose": "promotional",
    "sfdc_cms:title": "My Email Title",
    "sfdc_cms:block": {
      "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "type": "block",
      "definition": "sfdc_cms/rootContentBlock",
      "children": [
        {
          "id": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
          "type": "block",
          "definition": "lightning/section",
          "attributes": {
            "stackOnMobile": true
          },
          "children": [
            {
              "id": "c3d4e5f6-a7b8-9012-cdef-123456789012",
              "type": "block",
              "definition": "lightning/column",
              "attributes": {
                "columnWidth": 12
              },
              "children": [
                {
                  "id": "d4e5f6a7-b8c9-0123-def0-234567890123",
                  "type": "block",
                  "definition": "lightning/heading",
                  "attributes": {
                    "text": "Hello World",
                    "align": "center",
                    "level": 1
                  }
                },
                {
                  "id": "e5f6a7b8-c9d0-1234-ef01-345678901234",
                  "type": "block",
                  "definition": "lightning/paragraph",
                  "attributes": {
                    "text": "This is the email body content.",
                    "align": "center"
                  }
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

### Block Component Reference

#### lightning/heading
```json
{
  "attributes": {
    "text": "Heading Text",
    "align": "center|left|right",
    "level": 1-6
  }
}
```

#### lightning/paragraph
```json
{
  "attributes": {
    "text": "Paragraph content. Can include <b>HTML</b>.",
    "align": "center|left|right"
  }
}
```

#### lightning/button
```json
{
  "attributes": {
    "text": "CLICK HERE",
    "uri": "https://example.com",
    "width": "auto|full"
  }
}
```

#### lightning/image
```json
{
  "attributes": {
    "imageInfo": {
      "source": {
        "type": "imageReference",
        "ref": {
          "contentKey": "EXISTING_IMAGE_CONTENT_KEY"
        }
      }
    }
  }
}
```

#### lightning/html (Raw HTML)
```json
{
  "attributes": {
    "rawHtml": "<div style='padding: 20px;'>Custom HTML content</div>"
  }
}
```

---

### 4. Update CMS Content

**Endpoint**: `PATCH /connect/cms/contents/{contentId}`

**Request Body**:
```json
{
  "contentBody": {
    "subjectLine": "Updated Subject Line"
  }
}
```

---

### 5. Publish CMS Content

**Endpoint**: `POST /connect/cms/contents/{contentId}/publish`

**Request Body**: Empty `{}`

---

### 6. Delete CMS Content

**Endpoint**: `DELETE /connect/cms/contents/{contentId}`

---

## Available Content Types in Marketing Cloud Workspace

| Type | API Name | Description |
|------|----------|-------------|
| Email | `sfdc_cms__email` | Marketing emails with block structure |
| Email Template | `sfdc_cms__emailTemplate` | Reusable email templates |
| Content Block: Email | `sfdc_cms__emailFragment` | Reusable email components |
| Image | `sfdc_cms__image` | Image assets |

---

## ID Formats

| ID Type | Prefix | Example |
|---------|--------|---------|
| Workspace (ManagedContentSpace) | `0Zu` | `0ZuWs0000011zP4KAI` |
| Folder | `9Pu` | `9PuWs000000zvmGKAQ` |
| Content Variant | `9Ps` | `9PsWs00000GOLwZKAX` |
| Managed Content | `20Y` | `20YWs000005WcLrMAK` |
| Content Version | `5OU` | `5OUWs00000bTbmtOAC` |
| Channel | `0ap` | `0ap5w000000kcaiAAA` |
| Content Key | `MC...` | `MCWV26UCUUYNAFNP3Y53CVWGE23E` |

---

## Error Handling

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `405 METHOD_NOT_ALLOWED` | Using GET on POST-only endpoint | Use correct HTTP method |
| `MISSING_ARGUMENT: Specify a Library` | Wrong parameter name | Use `contentSpaceOrFolderIds` not `library` |
| `uuid is invalid` | Block IDs not in UUID format | Use format `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx` |
| `Content type not supported by this space` | Wrong content type for workspace | Check available types for the workspace |

---

## Best Practices

1. **Always use UUIDs** for block IDs when creating content
2. **Query existing content** to understand the structure before creating new content
3. **Use the items/search endpoint** for listing content, not /contents
4. **Include all required block hierarchy** (rootContentBlock → section → column → components)
5. **Test with simple content first** before adding complex nested blocks

---

*Documentation based on actual API testing with Salesforce CMS v61.0, December 2025*
