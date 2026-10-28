'use strict';

const { PinterestClient } = require('./client');
const { parsePinResponse } = require('./parser');
const {
  isPinterestUrl,
  isShortUrl,
  extractPinId,
  resolveShortUrl
} = require('./utils');

async function getPin(urlOrId) {
  if (!urlOrId || (typeof urlOrId !== 'string' && typeof urlOrId !== 'number')) {
    throw new Error('Pin URL or ID must be a non-empty string or number');
  }

  const rawInput = String(urlOrId).trim();
  let pinId = extractPinId(rawInput);

  // If pinId was not extracted directly, resolve short / redirected URL
  if (!pinId) {
    if (isShortUrl(rawInput) || isPinterestUrl(rawInput) || /^https?:\/\//i.test(rawInput)) {
      try {
        const resolvedUrl = await resolveShortUrl(rawInput);
        pinId = extractPinId(resolvedUrl);
      } catch (error) {
        throw new Error(`Failed to resolve short URL: ${error.message}`);
      }
    }
  }

  if (!pinId) {
    throw new Error(`Could not extract pin ID from: ${rawInput}`);
  }

  const client = new PinterestClient();
  await client.init();

  const data = await client.request('/resource/PinResource/get/', {
    source_url: `/pin/${pinId}/`,
    data: JSON.stringify({
      options: {
        id: pinId,
        field_set_key: 'detailed'
      },
      context: {}
    })
  });

  const pin = parsePinResponse(data);

  if (!pin) {
    throw new Error(`Failed to parse pin data for ID: ${pinId}`);
  }

  return pin;
}

module.exports = { getPin };
