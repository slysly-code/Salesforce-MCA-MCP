/**
 * Salesforce CMS Client
 * Handles authentication and API interactions with Salesforce CMS
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import { execFileSync } from 'child_process';

export class SalesforceCMSClient {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
    this.instanceUrl = config.instanceUrl;
    this.workspaceId = null;
    this.channelId = null;  // Channel ID for CMS Delivery API (starts with 0ap)
    this.client = null;
    this.toolingClient = null;
    this.tokenExpiry = null;
  }

  /**
   * Authenticate. Routes to JWT or sf-CLI based on config.authMode.
   */
  async authenticate() {
    if (this.config.authMode === 'sf-cli') {
      return this._authenticateViaSfCli();
    }
    return this._authenticateViaJwt();
  }

  /**
   * Reuse the access token from the local Salesforce CLI (`sf` / `sfdx`).
   * Token is short-lived; tokenExpiry is conservative so we refresh often.
   */
  async _authenticateViaSfCli() {
    const alias = this.config.sfCliAlias;
    if (!alias) {
      throw new Error('SF_CLI_ALIAS env var required when AUTH_MODE=sf-cli');
    }
    let raw;
    try {
      const isWin = process.platform === 'win32';
      const cmd = isWin ? 'cmd.exe' : 'sf';
      const args = isWin
        ? ['/c', 'sf', 'org', 'display', '--target-org', alias, '--json']
        : ['org', 'display', '--target-org', alias, '--json'];
      raw = execFileSync(cmd, args, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 10 * 1024 * 1024,
        env: { ...process.env, SF_TEMP_SHOW_SECRETS: 'true' }
      });
    } catch (e) {
      const stdout = (e.stdout || '').toString();
      if (stdout.trim().startsWith('{')) {
        raw = stdout;
      } else {
        throw new Error(`sf CLI auth failed for alias "${alias}": ${e.message}`);
      }
    }
    const parsed = JSON.parse(raw);
    if (parsed.status !== 0 || !parsed.result?.instanceUrl) {
      throw new Error(`sf CLI returned no instance URL for "${alias}": ${raw.slice(0, 300)}`);
    }
    this.instanceUrl = parsed.result.instanceUrl;
    let token = parsed.result.accessToken;
    if (!token || token.startsWith('[REDACTED]')) {
      const tokArgs = isWin
        ? ['/c', 'sf', 'org', 'auth', 'show-access-token', '--target-org', alias, '--no-prompt', '--json']
        : ['org', 'auth', 'show-access-token', '--target-org', alias, '--no-prompt', '--json'];
      const tokRaw = execFileSync(cmd, tokArgs, {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 1024 * 1024,
        env: { ...process.env, SF_TEMP_SHOW_SECRETS: 'true' }
      });
      const tokParsed = JSON.parse(tokRaw);
      if (tokParsed.status !== 0 || !tokParsed.result?.accessToken) {
        throw new Error(`sf CLI show-access-token returned no token for "${alias}": ${tokRaw.slice(0, 300)}`);
      }
      token = tokParsed.result.accessToken;
    }
    this.accessToken = token;
    // sf CLI tokens last ~2h; refresh after 30min to be safe
    this.tokenExpiry = Date.now() + (30 * 60 * 1000);

    this.client = axios.create({
      baseURL: `${this.instanceUrl}/services/data/${this.config.apiVersion}`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    this.toolingClient = axios.create({
      baseURL: `${this.instanceUrl}/services/data/${this.config.apiVersion}/tooling`,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!this.workspaceId) {
      await this.getWorkspaceId();
    }
    return true;
  }

  async _authenticateViaJwt() {
    try {
      const privateKey = fs.readFileSync(this.config.jwtPrivateKeyPath, 'utf8');
      
      const isSandbox = this.instanceUrl.includes('sandbox');
      const authEndpoint = isSandbox ? 'https://test.salesforce.com' : 'https://login.salesforce.com';
      
      const payload = {
        iss: this.config.clientId,
        sub: this.config.username,
        aud: authEndpoint,
        exp: Math.floor(Date.now() / 1000) + (60 * 5)
      };
      
      const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
      
      const authUrl = authEndpoint + '/services/oauth2/token';
      const params = new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion
      });
      
      const response = await axios.post(authUrl, params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
      
      this.accessToken = response.data.access_token;
      this.instanceUrl = response.data.instance_url;
      this.tokenExpiry = Date.now() + (3600 * 1000); // 1 hour from now
      
      // Create authenticated client for Connect API
      this.client = axios.create({
        baseURL: `${this.instanceUrl}/services/data/${this.config.apiVersion}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      // Create authenticated client for Tooling API
      this.toolingClient = axios.create({
        baseURL: `${this.instanceUrl}/services/data/${this.config.apiVersion}/tooling`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Get workspace ID if not already set
      if (!this.workspaceId) {
        await this.getWorkspaceId();
      }
      
      return true;
    } catch (error) {
      const detail = error.response?.data ? ` | ${JSON.stringify(error.response.data)}` : '';
      throw new Error(`Authentication failed: ${error.message}${detail}`);
    }
  }

  /**
   * Get workspace ID and channel ID by workspace name
   * The CMS Delivery API requires a Channel ID (0ap...), not a ManagedContentSpace ID (0Zu...)
   */
  async getWorkspaceId() {
    if (!this.config.workspaceName) {
      throw new Error('Workspace name not configured');
    }

    // First, get the ManagedContentSpace ID
    const spaceQuery = `SELECT Id, Name FROM ManagedContentSpace WHERE Name = '${this.config.workspaceName}'`;
    const spaceResponse = await this.client.get(`/query/?q=${encodeURIComponent(spaceQuery)}`);
    
    if (spaceResponse.data.records.length === 0) {
      throw new Error(`Workspace '${this.config.workspaceName}' not found`);
    }
    
    this.workspaceId = spaceResponse.data.records[0].Id;
    
    // Try to get channel ID via Connect API
    try {
      const channelsResponse = await this.client.get('/connect/cms/delivery/channels');
      if (channelsResponse.data.channels && channelsResponse.data.channels.length > 0) {
        // Find a channel associated with our workspace, or use the first available
        const matchingChannel = channelsResponse.data.channels.find(
          ch => ch.managedContentSpaceId === this.workspaceId
        );
        this.channelId = matchingChannel ? matchingChannel.channelId : channelsResponse.data.channels[0].channelId;
      } else {
        // Fallback: use workspaceId (may work for some configurations)
        this.channelId = this.workspaceId;
      }
    } catch (error) {
      // If channel lookup fails, use workspaceId as fallback
      this.channelId = this.workspaceId;
    }
  }

  /**
   * Ensure authentication is valid
   */
  async ensureAuthenticated() {
    // Check if token exists and is not expired
    if (!this.accessToken || !this.tokenExpiry || Date.now() >= this.tokenExpiry - 60000) {
      await this.authenticate();
    }
  }

  /**
   * List content in workspace
   * Uses Enhanced CMS items/search endpoint to find all content
   */
  async listContent(limit = 10) {
    await this.ensureAuthenticated();
    
    // Use the /connect/cms/items/search endpoint to search for content in the workspace
    // Required params: contentSpaceOrFolderIds, queryTerm (min 2 chars)
    // Using '*' or broad search term to get all content
    const response = await this.client.get(
      `/connect/cms/items/search`,
      {
        params: {
          contentSpaceOrFolderIds: this.workspaceId,
          queryTerm: '*',  // Wildcard to get all content
          pageSize: limit
        }
      }
    );
    
    return response.data.items || response.data.managedContentItems || response.data || [];
  }

  /**
   * Get content by ID or ContentKey
   * Uses the /connect/cms/contents/{contentKeyOrId} endpoint for Enhanced CMS
   */
  async getContent(identifier) {
    await this.ensureAuthenticated();
    
    // Use Enhanced CMS endpoint to get content details
    const response = await this.client.get(
      `/connect/cms/contents/${identifier}`
    );
    return response.data;
  }

  /**
   * Get workspace details including whether it's Enhanced CMS
   */
  async getWorkspaceDetails() {
    await this.ensureAuthenticated();
    
    const query = `SELECT Id, Name, IsEnhanced FROM ManagedContentSpace WHERE Id = '${this.workspaceId}'`;
    const response = await this.client.get(`/query/?q=${encodeURIComponent(query)}`);
    return response.data.records[0] || null;
  }

  /**
   * Get available API resources
   */
  async getAvailableResources() {
    await this.ensureAuthenticated();
    
    const response = await this.client.get(`/`);
    return response.data;
  }

  /**
   * Create new content - using /connect/cms/contents endpoint
   */
  async createContent(contentData) {
    await this.ensureAuthenticated();

    let contentBody = contentData.contentBody || {};

    // Round-trip safety for InApp: getContent returns user-supplied text fields
    // HTML-entity encoded (e.g. "&lt;&lt;privacy policy&gt;&gt;"). Salesforce
    // re-escapes "&" on the way back in, so a naive clone double-encodes
    // (→ "&amp;lt;…"). Decode entities in known text leaves before POST.
    if (contentData.type === 'sfdc_cms__inApp') {
      contentBody = decodeInAppTextEntities(contentBody);
    }

    const payload = {
      contentSpaceOrFolderId: this.workspaceId,
      contentType: contentData.type,
      contentBody
    };

    if (contentData.apiName || contentData.contentKey) {
      payload.apiName = contentData.apiName || contentData.contentKey;
    }

    if ((contentData.type === 'sfdc_cms__email' || contentData.type === 'sfdc_cms__inApp') && contentData.title) {
      if (!payload.contentBody['sfdc_cms:title']) {
        payload.contentBody['sfdc_cms:title'] = contentData.title;
      }
    }

    const createResponse = await this.client.post(
      `/connect/cms/contents`,
      payload
    );
    return createResponse.data;
  }

  /**
   * Update content body
   */
  async updateContentBody(contentId, contentBody) {
    await this.ensureAuthenticated();
    
    const response = await this.client.patch(
      `/connect/cms/contents/${contentId}`,
      { contentBody }
    );
    
    return response.data;
  }

  /**
   * Update content metadata
   */
  async updateContentMetadata(contentId, metadata) {
    await this.ensureAuthenticated();
    
    const response = await this.client.patch(
      `/connect/cms/contents/${contentId}`,
      metadata
    );
    
    return response.data;
  }

  /**
   * Get available content types using Tooling API
   */
  async getContentTypes() {
    await this.ensureAuthenticated();
    
    const query = `SELECT Id, DeveloperName, MasterLabel, Description FROM ManagedContentType`;
    const response = await this.toolingClient.get(`/query/?q=${encodeURIComponent(query)}`);
    return response.data.records || [];
  }

  /**
   * Search content
   * Uses the CMS delivery search API which supports GET method
   */
  async searchContent(searchTerm, limit = 10) {
    await this.ensureAuthenticated();
    
    // Use CMS delivery search API with channelId
    const response = await this.client.get(
      `/connect/cms/delivery/channels/${this.channelId}/contents/search`,
      {
        params: {
          searchTerm: searchTerm,
          pageSize: limit
        }
      }
    );
    
    return response.data.items || [];
  }

  /**
   * Publish content
   */
  async publishContent(contentId) {
    await this.ensureAuthenticated();
    
    await this.client.post(`/connect/cms/contents/${contentId}/publish`);
    return true;
  }

  /**
   * Delete content
   */
  async deleteContent(contentId) {
    await this.ensureAuthenticated();
    
    await this.client.delete(`/connect/cms/contents/${contentId}`);
    return true;
  }
}

const HTML_ENTITY_MAP = { lt: '<', gt: '>', amp: '&', quot: '"', apos: "'", '#39': "'" };

function decodeHtmlEntities(s) {
  if (typeof s !== 'string' || s.indexOf('&') === -1) return s;
  let prev;
  let cur = s;
  do {
    prev = cur;
    cur = cur.replace(/&(lt|gt|amp|quot|apos|#39);/g, (_, n) => HTML_ENTITY_MAP[n]);
  } while (cur !== prev);
  return cur;
}

const INAPP_TEXT_LEAF_KEYS = new Set([
  'title', 'message', 'text', 'label', 'altText', 'hyperText', 'hyperLink', 'actionUrl'
]);

function decodeInAppTextEntities(node) {
  if (Array.isArray(node)) return node.map(decodeInAppTextEntities);
  if (node && typeof node === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(node)) {
      out[k] = INAPP_TEXT_LEAF_KEYS.has(k) ? decodeHtmlEntities(v) : decodeInAppTextEntities(v);
    }
    return out;
  }
  return node;
}
