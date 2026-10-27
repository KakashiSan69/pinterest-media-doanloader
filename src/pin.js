'use strict';

const { PinterestClient } = require('./client');
const { parsePinResponse } = require('./parser');
const { isPinterestUrl, isShortUrl, extractPinId, resolveShortUrl } = require('./utils');

async function getPin(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') {
    throw new Error('Pin URL or ID must be a non-empty string');
  }

  let pinId = null;

  if (/^\d+$/.test(urlOrId.trim())) {
    pinId = urlOrId.trim();
  } else if (isShortUrl(urlOrId)) {
    try {
      const resolvedUrl = await resolveShortUrl(urlOrId);
      pinId = extractPinId(resolvedUrl);
    } catch (error) {
      throw new Error(`Failed to resolve short URL: ${error.message}`);
    }
  } else if (isPinterestUrl(urlOrId)) {
    pinId = extractPinId(urlOrId);
  } else {
    throw new Error(`Invalid Pinterest URL or pin ID: ${urlOrId}`);
  }

  if (!pinId) {
    throw new Error(`Could not extract pin ID from: ${urlOrId}`);
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
