/**
 * Salesforce CMS Client
 * Handles authentication and API interactions with Salesforce CMS
 */

import axios from 'axios';
import jwt from 'jsonwebtoken';
import fs from 'fs';

export class SalesforceCMSClient {
  constructor(config) {
    this.config = config;
    this.accessToken = null;
    this.instanceUrl = config.instanceUrl;
    this.workspaceId = null;
    this.client = null;
  }

  /**
   * Authenticate using JWT Bearer Flow
   */
  async authenticate() {
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
      
      // Create authenticated client
      this.client = axios.create({
        baseURL: `${this.instanceUrl}/services/data/${this.config.apiVersion}`,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Get workspace ID
      await this.getWorkspaceId();
      
      return true;
    } catch (error) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  /**
   * Get workspace ID by name
   */
  async getWorkspaceId() {
    if (!this.config.workspaceName) {
      throw new Error('Workspace name not configured');
    }

    const query = `SELECT Id, Name FROM ManagedContentSpace WHERE Name = '${this.config.workspaceName}'`;
    const response = await this.client.get(`/query/?q=${encodeURIComponent(query)}`);
    
    if (response.data.records.length > 0) {
      this.workspaceId = response.data.records[0].Id;
    } else {
      throw new Error(`Workspace '${this.config.workspaceName}' not found`);
    }
  }

  /**
   * Ensure authentication is valid
   */
  async ensureAuthenticated() {
    if (!this.accessToken) {
      await this.authenticate();
    }
  }

  /**
   * List content in workspace using CMS Connect API
   */
  async listContent(limit = 10) {
    await this.ensureAuthenticated();
    
    // Use CMS Connect API instead of SOQL
    const response = await this.client.get(`/connect/cms/contents`, {
      params: {
        channelId: this.workspaceId,
        pageSize: limit
      }
    });
    
    return response.data.items || [];
  }

  /**
   * Get content by ID or ContentKey
   */
  async getContent(identifier) {
    await this.ensureAuthenticated();
    
    // If identifier looks like a ContentKey, search for it first
    if (!identifier.startsWith('0')) {
      try {
        const response = await this.client.get(`/connect/cms/contents`, {
          params: {
            channelId: this.workspaceId,
            contentKeys: identifier,
            pageSize: 1
          }
        });
        if (response.data.items && response.data.items.length > 0) {
          identifier = response.data.items[0].contentId;
        }
      } catch (error) {
        // If search fails, try using identifier as-is
      }
    }
    
    // Get full content via CMS API
    const response = await this.client.get(`/connect/cms/contents/${identifier}`);
    return response.data;
  }

  /**
   * Create new content
   */
  async createContent(contentData) {
    await this.ensureAuthenticated();
    
    // Prepare the content body
    const contentBody = contentData.contentBody || {};
    
    const payload = {
      contentSpaceId: this.workspaceId,
      contentType: contentData.type,
      title: contentData.title,
      urlName: contentData.urlName,
      contentKey: contentData.contentKey,
      language: contentData.language || 'en_US',
      contentBody: contentBody
    };
    
    const createResponse = await this.client.post('/connect/cms/contents', payload);
    return createResponse.data;
  }

  /**
   * Update content body
   */
  async updateContentBody(contentId, contentBody) {
    await this.ensureAuthenticated();
    
    const payload = {
      contentBody: contentBody
    };
    
    const response = await this.client.patch(
      `/connect/cms/contents/${contentId}`,
      payload
    );
    
    return response.data;
  }

  /**
   * Update content metadata (title, urlName, etc)
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
   * Get available content types
   */
  async getContentTypes() {
    await this.ensureAuthenticated();
    
    // Use the correct endpoint for content types
    const response = await this.client.get(`/connect/cms/channels/${this.workspaceId}/types`);
    return response.data.contentTypes || [];
  }

  /**
   * Search content
   */
  async searchContent(searchTerm, limit = 10) {
    await this.ensureAuthenticated();
    
    const response = await this.client.get(`/connect/cms/contents`, {
      params: {
        channelId: this.workspaceId,
        pageSize: limit
      }
    });
    
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
