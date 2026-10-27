'use strict';

const https = require('node:https');
const http = require('node:http');
const { URL } = require('node:url');

function isPinterestUrl(url) {
  try {
    const parsed = new URL(url);
    return /^(www\.)?pinterest\.(com|co\.uk|ca|de|fr|es|it|jp|au|at|ch|se|dk|no|fi|nl|be|pt|ie|nz|ph|ru|kr|cl|com\.mx|com\.au|co\.kr)$/.test(parsed.hostname)
      || parsed.hostname === 'pin.it'
      || parsed.hostname === 'in.pinterest.com'
      || parsed.hostname === 'br.pinterest.com';
  } catch {
    return false;
  }
}

function isShortUrl(url) {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'pin.it';
  } catch {
    return false;
  }
}

function extractPinId(url) {
  try {
    const parsed = new URL(url);
    const match = parsed.pathname.match(/\/pin\/(\d+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

function resolveShortUrl(shortUrl) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(shortUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.get(shortUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(res.headers.location);
      } else {
        res.resume();
        reject(new Error(`Failed to resolve short URL: HTTP ${res.statusCode}`));
      }
      res.resume();
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
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
  isPinterestUrl,
  isShortUrl,
  extractPinId,
  resolveShortUrl,
  sanitizeFilename,
  formatBytes,
  httpGet,
  httpGetStream
};
