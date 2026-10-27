'use strict';

const { PinterestClient } = require('./client');
const { parseSearchResults } = require('./parser');

async function search(query, options = {}) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query must be a non-empty string');
  }

  const scope = options.scope || 'pins';
  const limit = Math.min(Math.max(options.limit || 25, 1), 250);
  const type = options.type || 'all';

  const client = new PinterestClient();
  await client.init();

  const allPins = [];
  let bookmark = options.bookmark || null;
  let attempts = 0;
  const maxAttempts = Math.ceil(limit / 25) + 2;

  while (allPins.length < limit && attempts < maxAttempts) {
    attempts++;

    const pageSize = Math.min(25, limit - allPins.length);
    const requestOptions = {
      query,
      scope,
      page_size: pageSize
    };

    if (bookmark) {
      requestOptions.bookmarks = [bookmark];
    }

    const sourceUrl = `/search/${scope}/?q=${encodeURIComponent(query)}`;

    let data;
    try {
      data = await client.request('/resource/BaseSearchResource/get/', {
        source_url: sourceUrl,
        data: JSON.stringify({
          options: requestOptions,
          context: {}
        })
      });
    } catch (error) {
      if (allPins.length > 0) {
        break;
      }
      throw new Error(`Pinterest search failed: ${error.message}`);
    }

    const parsed = parseSearchResults(data);

    if (parsed.pins.length === 0) {
      break;
    }

    allPins.push(...parsed.pins);
    bookmark = parsed.bookmark;

    if (!bookmark) break;
  }

  let filteredPins = allPins;
  if (type === 'images') {
    filteredPins = allPins.filter(pin => pin.type === 'image');
  } else if (type === 'videos') {
    filteredPins = allPins.filter(pin => pin.type === 'video');
  }

  return {
    pins: filteredPins.slice(0, limit),
    bookmark
  };
}

module.exports = { search };
