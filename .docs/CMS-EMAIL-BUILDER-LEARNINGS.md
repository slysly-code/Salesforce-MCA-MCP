# Salesforce CMS Email Builder - Learning Document

> **Date**: December 2025  
> **Purpose**: Document learnings from MCE MCP Server and Salesforce CMS email structure analysis

---

## 1. MCE MCP Server Architecture Analysis

### Key Design Patterns from MCE MCP Server

The MCE (Marketing Cloud Engagement) MCP Server uses a **preflight check pattern** that forces LLMs to read documentation before creating content. This dramatically improved success rates from ~10% to ~95%.

### Three-Step Flow:
1. **Preflight Check** (`mce_v1_preflight_check`) - Returns clearance token + required reading
2. **Read Documentation** (`mce_v1_read_documentation`) - LLM reads the guide
3. **Validate Request** (`mce_v1_validate_request`) - Check structure before API call
4. **Execute** (`mce_v1_rest_request`) - Requires clearance token

### Why This Works:
- LLMs often skip to action without reading context
- Clearance token mechanism forces sequential flow
- Documentation is comprehensive and inline (not external links)
- Validation catches common errors before they hit the API

---

## 2. Salesforce CMS Email Block Structure Analysis

### From Email `MCSSLY4WPOFZFBXAY2UXF75KRYPQ`

The email contains 6 sections demonstrating all common patterns:

### Section 1: Banner Image (Full Width)
```
Section → Column (width: 12) → lightning/image
```
- `columnWidth: 12` = full width
- Image references CMS media via `contentKey`

### Section 2: Heading
```
Section → Column (width: 12) → lightning/heading
```
- `level: 3` = H3
- Text can include HTML entities (`&lt;br /&gt;`)

### Section 3: Paragraph
```
Section → Column (width: 12) → lightning/paragraph
```
- Long-form text with HTML entities
- `align: "left"` for alignment

### Section 4: Two-Column Layout (Image Left, Text Right)
```
Section → Column (width: 6) → lightning/image
        → Column (width: 6) → lightning/paragraph
```
- `columnWidth: 6` each = 50/50 split
- `stackOnMobile: true` for responsive

### Section 5: Button (CTA)
```
Section → Column (width: 12) → lightning/actionButton
```
- Note: Uses `lightning/actionButton` not `lightning/button`
- Has `text`, `width`, and style attributes

### Section 6: Imprint/Footer Paragraph
```
Section → Column (width: 12) → lightning/paragraph
```
- Contains merge field `{!$organization.Address}`

---

## 3. Component Type Reference

| User Request | CMS Definition | Key Attributes |
|--------------|----------------|----------------|
| "banner", "hero image" | `lightning/image` | `imageInfo.source.ref.contentKey` |
| "heading", "headline", "title" | `lightning/heading` | `text`, `level` (1-6), `align` |
| "paragraph", "text", "body" | `lightning/paragraph` | `text`, `align` |
| "button", "CTA" | `lightning/actionButton` | `text`, `uri`, `width` |
| "2 columns", "side by side" | Section with 2 columns | `columnWidth: 6` each |
| "3 columns" | Section with 3 columns | `columnWidth: 4` each |
| "raw HTML", "custom" | `lightning/html` | `rawHtml` |

---

## 4. Natural Language to Section Mapping

### Common Request Patterns:

| User Says | Interpretation | Structure |
|-----------|----------------|-----------|
| "Start with a headline" | Heading section | Section → Col(12) → heading |
| "Add a banner image" | Full-width image | Section → Col(12) → image |
| "Two columns with text and image" | Split layout | Section → Col(6) + Col(6) |
| "Product description on left, image on right" | 2-col with content | Section → Col(6)[para] + Col(6)[image] |
| "Call-to-action button" | CTA section | Section → Col(12) → actionButton |
| "Footer with address" | Imprint paragraph | Section → Col(12) → paragraph |

### Example User Request Decomposition:
```
User: "Start with paragraph and write a headline, continue with a banner image, 
       3rd section will be 2 columns left describe the product, right display the product, 
       below a new section to tell more about the product, next section a CTA to buy the product 
       and finish with the imprint paragraph."

Breakdown:
1. "Start with paragraph and write a headline" → heading (level 2 or 3)
2. "continue with a banner image" → image (full width)
3. "2 columns left describe the product, right display the product" → 2-col: para + image
4. "new section to tell more about the product" → paragraph (full width)
5. "CTA to buy the product" → actionButton
6. "imprint paragraph" → paragraph with address merge field
```

---

## 5. Block Hierarchy Rules

### Every email follows this pattern:
```
sfdc_cms:block (rootContentBlock)
  └── children: [
        Section 1 (lightning/section)
          └── children: [
                Column(s) (lightning/column)
                  └── children: [
                        Component (lightning/heading|paragraph|image|actionButton|html)
                      ]
              ]
        Section 2...
        Section N...
      ]
```

### Critical Rules:
1. **All block IDs must be UUIDs** - Format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`
2. **Every section needs at least one column**
3. **Column widths must total 12** (grid system)
4. **Components go inside columns, never directly in sections**
5. **stackOnMobile: true** for responsive multi-column layouts

### Column Width Examples:
- Full width: `columnWidth: 12`
- Two columns (50/50): `columnWidth: 6` each
- Two columns (33/67): `columnWidth: 4` + `columnWidth: 8`
- Three columns: `columnWidth: 4` each

---

## 6. Applying MCE Patterns to CMS MCP Server

### Recommended Implementation:

#### 1. Add Preflight Check Tool
```javascript
{
  name: 'cms_preflight_check',
  description: 'MANDATORY - Call FIRST before creating emails. Returns clearance token and required reading.'
}
```

#### 2. Add Documentation Resource Tool
```javascript
{
  name: 'cms_read_documentation',
  description: 'Read CMS email building guide. Call after preflight check.'
}
```

#### 3. Add Validation Tool
```javascript
{
  name: 'cms_validate_email_structure',
  description: 'Validate email structure before creation.'
}
```

#### 4. Modify Create Tool
- Require clearance token for email creation
- Validate structure before API call

---

## 7. Master Guide Structure for CMS

### Required Sections:
1. **Quick Start** - Minimal working email example
2. **Section Types** - How to interpret user requests
3. **Component Reference** - All component types with attributes
4. **Multi-Column Layouts** - Column width patterns
5. **Common Errors** - UUID format, missing children, etc.
6. **Example Mappings** - User request → JSON structure

---

## 8. Key Differences: MCE vs CMS Email Structure

| Aspect | MCE (Marketing Cloud) | CMS (Enhanced CMS) |
|--------|----------------------|-------------------|
| Block System | Slots → Blocks | Sections → Columns → Components |
| ID Format | Any unique string | Must be UUID |
| Column Definition | Nested slots | `columnWidth` attribute |
| Image Handling | Direct URL | Content Key reference |
| Button Type | `buttonblock` | `lightning/actionButton` |
| Root Element | `views.html` | `sfdc_cms:block` |

---

## 9. Next Steps

1. Create `MASTER-GUIDE.md` for CMS MCP Server (similar to MCE)
2. Implement preflight check mechanism
3. Add section/component templates as inline documentation
4. Create validation logic for CMS email structure
5. Test with complex multi-section emails

---

*Document created based on analysis of MCE MCP Server and CMS email structure from MCSSLY4WPOFZFBXAY2UXF75KRYPQ*
