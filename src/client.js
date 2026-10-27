'use strict';

const { httpGet } = require('./utils');

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

class PinterestClient {
  constructor(options = {}) {
    this.baseUrl = 'https://www.pinterest.com';
    this.cookies = {};
    this.appVersion = null;
    this.csrfToken = null;
    this.initialized = false;
    this.userAgent = options.userAgent || DEFAULT_USER_AGENT;
  }

  async init() {
    if (this.initialized) return;

    try {
      const response = await httpGet(this.baseUrl, {
        'User-Agent': this.userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity',
        'Connection': 'keep-alive'
      });

      this._parseCookies(response.headers);
      this._extractAppVersion(response.body);

      if (!this.csrfToken) {
        this._extractCsrfFromHtml(response.body);
      }

      if (!this.csrfToken) {
        throw new Error('Failed to extract csrftoken from Pinterest response');
      }

      this.initialized = true;
    } catch (error) {
      throw new Error(`Failed to initialize Pinterest session: ${error.message}`);
    }
  }

  async request(resourcePath, params) {
    if (!this.initialized) {
      await this.init();
    }

    const queryParams = new URLSearchParams(params);
    const url = `${this.baseUrl}${resourcePath}?${queryParams.toString()}`;
    const headers = this._getHeaders(params.source_url || '/');
    const response = await httpGet(url, headers);

    if (response.statusCode !== 200) {
      throw new Error(`Pinterest API returned HTTP ${response.statusCode}`);
    }

    this._parseCookies(response.headers);

    try {
      return JSON.parse(response.body);
    } catch {
      throw new Error('Failed to parse Pinterest API response as JSON');
    }
  }

  _getHeaders(refererPath = '/') {
    const cookieString = Object.entries(this.cookies)
      .map(([key, value]) => `${key}=${value}`)
      .join('; ');

    return {
      'User-Agent': this.userAgent,
      'Accept': 'application/json, text/javascript, */*, q=0.01',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity',
      'Referer': `${this.baseUrl}${refererPath}`,
      'X-Requested-With': 'XMLHttpRequest',
      'X-APP-VERSION': this.appVersion || 'unknown',
      'X-CSRFToken': this.csrfToken || '',
      'X-Pinterest-PWS-Handler': 'www/index.js',
      'Cookie': cookieString,
      'Connection': 'keep-alive'
    };
  }

  _parseCookies(headers) {
    const setCookieHeaders = headers['set-cookie'];
    if (!setCookieHeaders) return;

    const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    for (const cookieStr of cookieArray) {
      const parts = cookieStr.split(';')[0].trim();
      const eqIndex = parts.indexOf('=');
      if (eqIndex === -1) continue;

      const name = parts.substring(0, eqIndex).trim();
      const value = parts.substring(eqIndex + 1).trim();

      this.cookies[name] = value;

      if (name === 'csrftoken') {
        this.csrfToken = value;
      }
    }
  }

  _extractAppVersion(html) {
    const pwsMatch = html.match(/<script\s+id="__PWS_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (pwsMatch) {
      try {
        const data = JSON.parse(pwsMatch[1]);
        if (data.appVersion) {
          this.appVersion = data.appVersion;
          return;
        }
      } catch {}
    }

    const versionMatch = html.match(/appVersion["']?\s*[:=]\s*["']([a-f0-9]+)["']/);
    if (versionMatch) {
      this.appVersion = versionMatch[1];
      return;
    }

    const propsMatch = html.match(/<script\s+id="__PWS_INITIAL_PROPS__"[^>]*>([\s\S]*?)<\/script>/);
    if (propsMatch) {
      try {
        const data = JSON.parse(propsMatch[1]);
        if (data.appVersion) {
          this.appVersion = data.appVersion;
          return;
        }
      } catch {}
    }

    this.appVersion = 'unknown';
  }

  _extractCsrfFromHtml(html) {
    const metaMatch = html.match(/name="csrf-token"\s+content="([^"]+)"/);
    if (metaMatch) {
      this.csrfToken = metaMatch[1];
      return;
    }

    const jsMatch = html.match(/csrftoken["']?\s*[:=]\s*["']([^"']+)["']/);
    if (jsMatch) {
      this.csrfToken = jsMatch[1];
    }
  }
}

module.exports = { PinterestClient, DEFAULT_USER_AGENT };
