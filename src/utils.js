'use strict';

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

function isPinterestDomain(hostname) {
  if (!hostname || typeof hostname !== 'string') return false;
  hostname = hostname.toLowerCase();
  if (hostname === 'pin.it' || hostname.endsWith('.pin.it')) return true;
  return /(^|\.)pinterest\.(?:com|org|net|co\.[a-z]{2}|com\.[a-z]{2}|[a-z]{2,4})$/i.test(hostname)
    || /(^|\.)pinimg\.com$/i.test(hostname);
}

function normalizeUrl(input) {
  if (!input || typeof input !== 'string') return '';
  let trimmed = input.trim();
  if (/^(?:pinterest|pinit):\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = 'https://' + trimmed;
  }
  try {
    const parsed = new URL(trimmed);
    if (parsed.hostname.toLowerCase() === 'www.pin.it') {
      parsed.hostname = 'pin.it';
      return parsed.toString();
    }
  } catch {}
  return trimmed;
}

function isPinterestUrl(url) {
  if (!url || (typeof url !== 'string' && typeof url !== 'number')) return false;
  const str = String(url).trim();
  if (/^(?:pinterest|pinit):\/\//i.test(str)) {
    return true;
  }
  const normalized = normalizeUrl(str);
  try {
    const parsed = new URL(normalized);
    return isPinterestDomain(parsed.hostname);
  } catch {
    return false;
  }
}

function isShortUrl(url) {
  if (!url || typeof url !== 'string') return false;
  const str = url.trim();
  const normalized = normalizeUrl(str);
  try {
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (host === 'pin.it' || host.endsWith('.pin.it')) return true;
    if (host.includes('pinterest.') && parsed.pathname.startsWith('/url_shortener/')) return true;
    if (['bit.ly', 't.co', 'tinyurl.com', 'is.gd', 'buff.ly', 'ow.ly', 'rebrand.ly', 'cutt.ly'].includes(host)) return true;
    return false;
  } catch {
    return false;
  }
}

function extractPinId(url) {
  if (url === null || url === undefined) return null;
  const trimmed = String(url).trim();
  if (!trimmed) return null;

  // Pure numeric ID (6 to 25 digits)
  if (/^\d{6,25}$/.test(trimmed)) {
    return trimmed;
  }

  // Custom scheme: pinterest://pin/123 or pinit://pin/123
  const customSchemeMatch = trimmed.match(/^(?:pinterest|pinit):\/\/(?:pin\/)?(\d+)/i);
  if (customSchemeMatch) {
    return customSchemeMatch[1];
  }

  const normalized = normalizeUrl(trimmed);

  try {
    const parsed = new URL(normalized);

    // If it is a web URL, it must belong to a Pinterest domain
    if (!isPinterestDomain(parsed.hostname)) {
      return null;
    }

    // 1. Check query parameters: ?pin=..., ?pin_id=..., ?id=...
    const paramPin = parsed.searchParams.get('pin') ||
                     parsed.searchParams.get('pin_id') ||
                     parsed.searchParams.get('id');
    if (paramPin && /^\d{6,25}$/.test(paramPin)) {
      return paramPin;
    }

    const pathname = parsed.pathname;

    // 2. Standard /pin/<id>
    const pinMatch = pathname.match(/\/pin\/(\d+)/i);
    if (pinMatch) return pinMatch[1];

    // 3. Idea pin / story pin: /idea-pin/<id>, /idea-pin/<slug>/<id>, /ideas/<slug>/<id>, /ideas/<id>
    const ideaMatch = pathname.match(/\/(?:idea-pin|ideas|story-pin)(?:\/[^/]+)*\/(\d+)/i);
    if (ideaMatch) return ideaMatch[1];

    // 4. Pin creation / builder: /pin-creation/<id>, /pin-builder/<id>
    const creationMatch = pathname.match(/\/(?:pin-creation|pin-builder)\/(\d+)/i);
    if (creationMatch) return creationMatch[1];

    // 5. User or board path with numeric ID segment (typically 15-22 digits)
    const longIdMatch = pathname.match(/\/(\d{15,22})(?:[/?#]|$)/);
    if (longIdMatch) return longIdMatch[1];
  } catch {}

  return null;
}

function resolveShortUrl(shortUrl, maxRedirects = 10) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects resolving short URL'));
    }

    if (!shortUrl || typeof shortUrl !== 'string') {
      return reject(new Error('Invalid URL provided to resolveShortUrl'));
    }

    const normalized = normalizeUrl(shortUrl);
    let parsed;
    try {
      parsed = new URL(normalized);
    } catch {
      return reject(new Error(`Invalid URL: ${normalized}`));
    }

    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        res.resume();

        // If the redirect location already exposes a pin ID, resolve right away!
        if (extractPinId(redirectUrl)) {
          return resolve(redirectUrl);
        }

        return resolveShortUrl(redirectUrl, maxRedirects - 1)
          .then(resolve)
          .catch(reject);
      }

      if (extractPinId(normalized)) {
        res.resume();
        return resolve(normalized);
      }

      let body = '';
      res.on('data', (chunk) => {
        if (body.length < 65536) {
          body += chunk;
        }
      });

      res.on('end', () => {
        const ogMatch = body.match(/<meta\s+property=["\x27]og:url["\x27]\s+content=["\x27]([^"\x27]+)["\x27]/i)
          || body.match(/<link\s+rel=["\x27]canonical["\x27]\s+href=["\x27]([^"\x27]+)["\x27]/i);
        if (ogMatch && extractPinId(ogMatch[1])) {
          return resolve(ogMatch[1]);
        }

        const pinMatch = body.match(/\/pin\/(\d+)/i);
        if (pinMatch) {
          return resolve(`https://www.pinterest.com/pin/${pinMatch[1]}/`);
        }

        resolve(normalized);
      });

      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(15000, () => {
      req.destroy();
      reject(new Error('Request timed out while resolving short URL'));
    });
  });
}

function sanitizeFilename(name, maxLength = 200) {
  if (!name || typeof name !== 'string') return 'untitled';

  let sanitized = name
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim();

  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized || 'untitled';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function httpGet(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return httpGet(redirectUrl, headers, maxRedirects - 1).then(resolve).catch(reject);
      }

      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          body: Buffer.concat(chunks).toString('utf-8'),
          headers: res.headers,
          statusCode: res.statusCode
        });
      });
      res.on('error', reject);
    });

    req.on('error', reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

function httpGetStream(url, headers = {}, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    if (maxRedirects < 0) {
      return reject(new Error('Too many redirects'));
    }

    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        let redirectUrl = res.headers.location;
        if (redirectUrl.startsWith('/')) {
          redirectUrl = `${parsed.protocol}//${parsed.host}${redirectUrl}`;
        }
        return httpGetStream(redirectUrl, headers, maxRedirects - 1).then(resolve).catch(reject);
      }

      resolve({
        stream: res,
        headers: res.headers,
        statusCode: res.statusCode
      });
    });

    req.on('error', reject);
    req.setTimeout(60000, () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });
  });
}

module.exports = {
  isPinterestDomain,
  normalizeUrl,
  isPinterestUrl,
  isShortUrl,
  extractPinId,
  resolveShortUrl,
  sanitizeFilename,
  formatBytes,
  httpGet,
  httpGetStream
};
