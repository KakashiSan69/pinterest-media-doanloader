'use strict';

function parseSearchResults(rawData) {
  const results = [];
  let bookmark = null;

  try {
    const resourceResponse = rawData?.resource_response;
    if (!resourceResponse) {
      return { pins: [], bookmark: null };
    }

    bookmark = resourceResponse.bookmark || null;
    if (bookmark === '-end-') bookmark = null;

    const data = resourceResponse.data;
    if (!data) return { pins: [], bookmark };

    const rawPins = Array.isArray(data) ? data : (data.results || []);

    for (const item of rawPins) {
      if (!item || item.type === 'module' || !item.id) continue;
      if (item.type !== 'pin' && !item.images) continue;

      const pin = parsePinData(item);
      if (pin && (pin.images?.original || pin.images?.large || pin.images?.medium || pin.videos)) {
        results.push(pin);
      }
    }
  } catch (error) {
    console.error(`[pinterest-media-downloader] Parse error: ${error.message}`);
  }

  return { pins: results, bookmark };
}

function parsePinResponse(rawData) {
  try {
    const data = rawData?.resource_response?.data;
    if (!data) return null;
    return parsePinData(data);
  } catch (error) {
    console.error(`[pinterest-media-downloader] Parse error: ${error.message}`);
    return null;
  }
}

function parsePinData(pinData) {
  if (!pinData || !pinData.id) return null;

  const isVideo = !!(
    pinData.videos ||
    pinData.story_pin_data?.pages?.[0]?.blocks?.find(b => b.video) ||
    pinData.is_video
  );

  const pin = {
    id: String(pinData.id),
    title: pinData.title || pinData.grid_title || pinData.seo_title || '',
    description: pinData.description || pinData.description_html || '',
    type: isVideo ? 'video' : 'image',
    link: `https://www.pinterest.com/pin/${pinData.id}/`,
    images: extractImages(pinData),
    metadata: extractMetadata(pinData)
  };

  if (isVideo) {
    pin.videos = extractVideos(pinData);
    if (!pin.videos) {
      pin.type = 'image';
    }
  }

  return pin;
}

function extractImages(pinData) {
  const images = pinData.images || pinData.image_medium_size_pixels || {};

  const result = {
    small: null,
    medium: null,
    large: null,
    original: null
  };

  if (images.orig) {
    result.original = images.orig.url || images.orig;
  }
  if (images['736x']) {
    result.large = images['736x'].url || images['736x'];
  }
  if (images['474x']) {
    result.medium = images['474x'].url || images['474x'];
  } else if (images['564x']) {
    result.medium = images['564x'].url || images['564x'];
  }
  if (images['236x']) {
    result.small = images['236x'].url || images['236x'];
  } else if (images['170x']) {
    result.small = images['170x'].url || images['170x'];
  }

  if (!result.original && (result.large || result.medium || result.small)) {
    const anyUrl = result.large || result.medium || result.small;
    result.original = anyUrl.replace(/\/\d+x\d*\//, '/originals/') || anyUrl;
  }

  if (!result.original) {
    result.original = result.large || result.medium || result.small;
  }

  return result;
}

function extractVideos(pinData) {
  const processVideoList = (videoList, defaultDuration = 0) => {
    if (!videoList) return null;

    const qualities = Object.entries(videoList)
      .filter(([key]) => key.startsWith('V_') && !key.includes('HLS') && !key.includes('DASH'))
      .map(([key, value]) => ({
        key,
        url: value.url,
        width: value.width,
        height: value.height,
        duration: value.duration || defaultDuration || 0,
        resolution: parseInt(key.replace('V_', '').replace('P', '')) || 0
      }))
      .filter(v => v.url)
      .sort((a, b) => a.resolution - b.resolution);

    if (qualities.length > 0) {
      return {
        low: qualities[0],
        medium: qualities[Math.floor(qualities.length / 2)] || qualities[0],
        high: qualities[qualities.length - 1]
      };
    }

    const hlsEntry = Object.values(videoList).find(v => v && v.url);
    if (hlsEntry) {
      const mp4Url = hlsEntry.url
        .replace(/\/videos\/(?:iht|mc)\/hls\//, '/videos/mc/720p/')
        .replace(/\.m3u8$/, '.mp4');
      const videoObj = {
        key: 'V_720P',
        url: mp4Url,
        hlsUrl: hlsEntry.url,
        width: hlsEntry.width || 720,
        height: hlsEntry.height || 1280,
        duration: hlsEntry.duration || defaultDuration || 0,
        resolution: 720
      };
      return {
        low: videoObj,
        medium: videoObj,
        high: videoObj
      };
    }

    return null;
  };

  const fromStandard = processVideoList(pinData.videos?.video_list, pinData.videos?.duration);
  if (fromStandard) return fromStandard;

  const pages = pinData.story_pin_data?.pages || [];
  for (const page of pages) {
    const blocks = page.blocks || [];
    for (const block of blocks) {
      if (block.video?.video_list) {
        const fromStory = processVideoList(block.video.video_list, 0);
        if (fromStory) return fromStory;
      }
    }
  }

  return null;
}

function extractMetadata(pinData) {
  const pinner = pinData.pinner || {};
  const board = pinData.board || {};

  return {
    pinner: {
      username: pinner.username || null,
      fullName: pinner.full_name || null,
      profileUrl: pinner.username ? `https://www.pinterest.com/${pinner.username}/` : null
    },
    board: {
      name: board.name || null,
      url: board.url ? `https://www.pinterest.com${board.url}` : null
    },
    saves: pinData.aggregated_pin_data?.aggregated_stats?.saves || pinData.repin_count || 0,
    comments: pinData.comment_count || 0,
    domain: pinData.domain || null,
    createdAt: pinData.created_at || null
  };
}

module.exports = {
  parseSearchResults,
  parsePinResponse,
  parsePinData,
  extractImages,
  extractVideos,
  extractMetadata
};
