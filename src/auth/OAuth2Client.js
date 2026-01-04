/**
 * OAuth2 Client Manager
 * 
 * Supports:
 * - Authorization Code flow
 * - Client Credentials flow
 * - Refresh Token flow
 * - PKCE (Proof Key for Code Exchange)
 * - State validation
 * 
 * @example
 * ```javascript
 * import { OAuth2Client } from '@microservice-framework/boilerplate/auth';
 * 
 * const oauth = new OAuth2Client({
 *   clientId: 'your-client-id',
 *   clientSecret: 'your-client-secret',
 *   redirectUri: 'http://localhost:3000/callback',
 *   authorizationUrl: 'https://provider.com/oauth/authorize',
 *   tokenUrl: 'https://provider.com/oauth/token',
 *   scopes: ['read', 'write']
 * });
 * 
 * // Generate authorization URL
 * const authUrl = oauth.getAuthorizationUrl();
 * 
 * // Exchange code for tokens
 * const tokens = await oauth.getTokensFromCode(code);
 * ```
 */

import crypto from 'crypto';
import axios from 'axios';

/**
 * Generate random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Generate PKCE challenge
 */
function generatePKCE() {
  const verifier = generateRandomString(32);
  const challenge = crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
  
  return { verifier, challenge };
}

/**
 * OAuth2 Client
 */
export class OAuth2Client {
  /**
   * @param {Object} options - OAuth2 configuration
   * @param {string} options.clientId - OAuth2 client ID
   * @param {string} options.clientSecret - OAuth2 client secret
   * @param {string} options.redirectUri - Redirect URI
   * @param {string} options.authorizationUrl - Authorization endpoint
   * @param {string} options.tokenUrl - Token endpoint
   * @param {string} options.revokeUrl - Token revocation endpoint
   * @param {string} options.userInfoUrl - User info endpoint
   * @param {string[]} options.scopes - OAuth2 scopes
   * @param {boolean} options.usePKCE - Use PKCE (default: true)
   */
  constructor(options = {}) {
    if (!options.clientId) {
      throw new Error('clientId is required');
    }
    
    if (!options.redirectUri) {
      throw new Error('redirectUri is required');
    }
    
    this.options = {
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUri: options.redirectUri,
      authorizationUrl: options.authorizationUrl,
      tokenUrl: options.tokenUrl,
      revokeUrl: options.revokeUrl,
      userInfoUrl: options.userInfoUrl,
      scopes: options.scopes || [],
      usePKCE: options.usePKCE !== false
    };
    
    // Store PKCE verifiers
    this.pkceStore = new Map();
    
    // Store state parameters
    this.stateStore = new Map();
  }
  
  /**
   * Get authorization URL
   * @param {Object} options - Override options
   * @returns {string} - Authorization URL
   */
  getAuthorizationUrl(options = {}) {
    const state = options.state || generateRandomString(16);
    const scopes = options.scopes || this.options.scopes;
    
    const params = new URLSearchParams({
      client_id: this.options.clientId,
      redirect_uri: this.options.redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      state
    });
    
    // Add PKCE if enabled
    if (this.options.usePKCE) {
      const { verifier, challenge } = generatePKCE();
      
      // Store verifier for later use
      this.pkceStore.set(state, verifier);
      
      params.append('code_challenge', challenge);
      params.append('code_challenge_method', 'S256');
    }
    
    // Store state
    this.stateStore.set(state, {
      createdAt: Date.now(),
      redirectUri: this.options.redirectUri
    });
    
    return `${this.options.authorizationUrl}?${params.toString()}`;
  }
  
  /**
   * Validate state parameter
   * @param {string} state - State from callback
   * @returns {boolean}
   */
  validateState(state) {
    if (!this.stateStore.has(state)) {
      return false;
    }
    
    const data = this.stateStore.get(state);
    
    // Check if state is expired (5 minutes)
    if (Date.now() - data.createdAt > 300000) {
      this.stateStore.delete(state);
      return false;
    }
    
    return true;
  }
  
  /**
   * Exchange authorization code for tokens
   * @param {string} code - Authorization code
   * @param {string} state - State parameter
   * @returns {Promise<Object>} - Tokens
   */
  async getTokensFromCode(code, state) {
    // Validate state
    if (!this.validateState(state)) {
      throw new Error('Invalid or expired state parameter');
    }
    
    const params = {
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.options.redirectUri,
      client_id: this.options.clientId
    };
    
    // Add client secret if available
    if (this.options.clientSecret) {
      params.client_secret = this.options.clientSecret;
    }
    
    // Add PKCE verifier if used
    if (this.options.usePKCE && this.pkceStore.has(state)) {
      params.code_verifier = this.pkceStore.get(state);
      this.pkceStore.delete(state);
    }
    
    try {
      const response = await axios.post(this.options.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Clean up state
      this.stateStore.delete(state);
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get tokens: ${error.response?.data?.error_description || error.message}`);
    }
  }
  
  /**
   * Refresh access token
   * @param {string} refreshToken - Refresh token
   * @returns {Promise<Object>} - New tokens
   */
  async refreshAccessToken(refreshToken) {
    const params = {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: this.options.clientId
    };
    
    if (this.options.clientSecret) {
      params.client_secret = this.options.clientSecret;
    }
    
    try {
      const response = await axios.post(this.options.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to refresh token: ${error.response?.data?.error_description || error.message}`);
    }
  }
  
  /**
   * Get user info using access token
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} - User info
   */
  async getUserInfo(accessToken) {
    if (!this.options.userInfoUrl) {
      throw new Error('userInfoUrl not configured');
    }
    
    try {
      const response = await axios.get(this.options.userInfoUrl, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get user info: ${error.response?.data?.error_description || error.message}`);
    }
  }
  
  /**
   * Revoke token
   * @param {string} token - Token to revoke
   * @param {string} tokenTypeHint - 'access_token' or 'refresh_token'
   */
  async revokeToken(token, tokenTypeHint = 'access_token') {
    if (!this.options.revokeUrl) {
      throw new Error('revokeUrl not configured');
    }
    
    const params = {
      token,
      token_type_hint: tokenTypeHint,
      client_id: this.options.clientId
    };
    
    if (this.options.clientSecret) {
      params.client_secret = this.options.clientSecret;
    }
    
    try {
      await axios.post(this.options.revokeUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
    } catch (error) {
      throw new Error(`Failed to revoke token: ${error.response?.data?.error_description || error.message}`);
    }
  }
  
  /**
   * Get tokens using client credentials
   * @param {string[]} scopes - Scopes to request
   * @returns {Promise<Object>} - Tokens
   */
  async getClientCredentialsTokens(scopes) {
    if (!this.options.clientSecret) {
      throw new Error('clientSecret required for client credentials flow');
    }
    
    const params = {
      grant_type: 'client_credentials',
      client_id: this.options.clientId,
      client_secret: this.options.clientSecret,
      scope: (scopes || this.options.scopes).join(' ')
    };
    
    try {
      const response = await axios.post(this.options.tokenUrl, params, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get client credentials: ${error.response?.data?.error_description || error.message}`);
    }
  }
}

export default {
  OAuth2Client
};
