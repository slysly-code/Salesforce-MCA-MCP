# Salesforce CMS MCP Server - Enhancement Progress

## Version 2.1.0 - Editable Email Components (December 15, 2025)

### Problem Solved
Emails created via MCP were using `lightning/html` blocks for all content, making them **non-editable** in the Salesforce CMS UI. Users had to manually recreate content using proper semantic components.

### Root Cause
The documentation showed correct component types but:
1. Lacked emphasis on using editable components vs HTML
2. Missing required styling attributes (`lightning:colorGroup`)
3. No warnings about non-editable HTML blocks

### Solution
Updated documentation and validation to:

1. **Emphasize EDITABLE components**:
   - `lightning/heading` - Editable headlines
   - `lightning/paragraph` - Editable text blocks  
   - `lightning/actionButton` - Editable buttons
   - `lightning/image` - Editable images (requires CMS upload)

2. **Custom color styling** (no brand setup required):
   ```json
   "lightning:colorGroup": {
     "textColor": "#333333",
     "linkColor": "#0176d3",
     "backgroundColor": "#1C6E7D"
   }
   ```

3. **Validation warnings** about HTML block usage:
   - Tracks editable vs HTML block count
   - Warns when all content is non-editable
   - Suggests using editable components

4. **Clear guidance on when to use `lightning/html`**:
   - External image URLs (CMS upload not available)
   - Complex custom layouts
   - Special formatting not possible with semantic components

### Key Learnings

#### Editable Component Requirements
Each editable component needs:
- Valid UUID for `id`
- `type: "block"`
- Correct `definition` (e.g., `lightning/heading`)
- `attributes` with content (`text`, `align`, etc.)
- `lightning:colorGroup` for text/background colors

#### Image Limitations
- `lightning/image` requires images uploaded to CMS first
- Use `list_cms_content` to find image `contentKey` values
- For external URLs, use `lightning/html` with `<img>` tag

#### Color Styling Simplified
Using explicit hex colors instead of brand variables:
- No need for brand configuration
- Direct control: `"textColor": "#FFFFFF"`
- Works immediately without setup

### Files Changed
- `src/index.js` - Updated API_GUIDES with v2.1 documentation
- `src/index.js` - Enhanced validation with HTML block warnings
- `src/index.js` - Version bump to 2.1.0

### Testing Checklist
- [ ] Restart Claude Desktop to reload MCP server
- [ ] Create test email with editable components
- [ ] Verify content is editable in Salesforce CMS UI
- [ ] Test validation warnings for HTML-heavy emails

### Next Iteration Ideas
- Image upload capability via MCP
- Explore formatting options (padding, margins, borders)
- Template system for common email layouts
- Brand variable support (optional)

---

## Version 2.0.0 - Complex Email Builder (Previous)

- Added preflight check with clearance tokens
- Block hierarchy validation
- UUID validation for all block IDs
- Section and column templates
