'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { getPin } = require('./pin');
const {
  isPinterestUrl,
  isShortUrl,
  sanitizeFilename,
  formatBytes,
  httpGetStream
} = require('./utils');

async function download(url, outputDir = './', options = {}) {
  if (!url || typeof url !== 'string') {
    throw new Error('URL must be a non-empty string');
  }

  if (typeof outputDir === 'object' && outputDir !== null) {
    options = outputDir;
    outputDir = options.outputDir || options.output || './';
  }

  const quality = options.quality || 'original';
  const overwrite = options.overwrite || false;
  const preferType = options.preferType || 'auto';
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  let mediaUrl = null;
  let mediaType = 'image';
  let autoFilename = null;

  if (url.includes('pinimg.com')) {
    mediaUrl = url;
    mediaType = url.includes('v.pinimg.com') || url.endsWith('.mp4') ? 'video' : 'image';
    autoFilename = path.basename(new URL(url).pathname);
  } else if (isPinterestUrl(url) || isShortUrl(url) || /^\d+$/.test(url.trim())) {
    const pin = await getPin(url);

    if (preferType === 'video' || (preferType === 'auto' && pin.type === 'video' && pin.videos)) {
      mediaType = 'video';
      const videoData = _selectVideoQuality(pin.videos, quality);
      if (videoData) {
        mediaUrl = videoData.url;
      }
    }

    if (!mediaUrl) {
      mediaType = 'image';
      mediaUrl = _selectImageQuality(pin.images, quality);
    }

    if (!mediaUrl) {
      throw new Error('No downloadable media found for this pin');
    }

    autoFilename = sanitizeFilename(pin.title || pin.id);
  } else {
    throw new Error(`Invalid URL: ${url}`);
  }

  const ext = _getExtension(mediaUrl, mediaType);
  const filename = options.filename
    ? sanitizeFilename(options.filename) + ext
    : (autoFilename && !autoFilename.includes('.') ? autoFilename + ext : autoFilename || `pinterest_${Date.now()}${ext}`);

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = path.join(outputDir, filename);

  if (!overwrite && fs.existsSync(outputPath)) {
    throw new Error(`File already exists: ${outputPath}. Use overwrite option to replace it.`);
  }

  let streamRes;
  try {
    streamRes = await httpGetStream(mediaUrl, {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://www.pinterest.com/'
    });

    if (streamRes.statusCode < 200 || streamRes.statusCode >= 300) {
      throw new Error(`HTTP ${streamRes.statusCode}`);
    }
  } catch (err) {
    if (mediaType === 'video' && mediaUrl.includes('/720p/')) {
      const altUrl = mediaUrl.replace('/720p/', '/expMp4/');
      streamRes = await httpGetStream(altUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.pinterest.com/'
      });
      if (streamRes.statusCode >= 200 && streamRes.statusCode < 300) {
        mediaUrl = altUrl;
      } else {
        throw new Error(`Failed to download media: ${err.message}`);
      }
    } else {
      throw new Error(`Failed to download media: ${err.message}`);
    }
  }

  const { stream, headers } = streamRes;
  const totalBytes = parseInt(headers['content-length'], 10) || 0;
  let downloadedBytes = 0;

  const progressTracker = new Transform({
    transform(chunk, encoding, callback) {
      downloadedBytes += chunk.length;
      if (onProgress && totalBytes > 0) {
        onProgress(downloadedBytes, totalBytes);
      }
      callback(null, chunk);
    }
  });

  const writeStream = fs.createWriteStream(outputPath);

  try {
    await pipeline(stream, progressTracker, writeStream);
  } catch (error) {
    try {
      fs.unlinkSync(outputPath);
    } catch {}
    throw new Error(`Download failed: ${error.message}`);
  }

  const stats = fs.statSync(outputPath);

  return {
    path: outputPath,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    type: mediaType,
    url: mediaUrl,
    filename
  };
}

function _selectImageQuality(images, quality) {
  if (!images) return null;

  switch (quality) {
    case 'original': return images.original || images.large || images.medium || images.small;
    case 'high':     return images.large || images.original || images.medium || images.small;
    case 'medium':   return images.medium || images.large || images.original || images.small;
    case 'low':      return images.small || images.medium || images.large || images.original;
    default:         return images.original || images.large || images.medium || images.small;
  }
}

function _selectVideoQuality(videos, quality) {
  if (!videos) return null;

  switch (quality) {
    case 'original':
    case 'high':   return videos.high || videos.medium || videos.low;
    case 'medium': return videos.medium || videos.high || videos.low;
    case 'low':    return videos.low || videos.medium || videos.high;
    default:         return videos.high || videos.medium || videos.low;
  }
}

function _getExtension(url, mediaType) {
  try {
    const pathname = new URL(url).pathname;
    const ext = path.extname(pathname).toLowerCase();
    if (ext && ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.webm', '.mov'].includes(ext)) {
      return ext;
    }
  } catch {}

  return mediaType === 'video' ? '.mp4' : '.jpg';
}

module.exports = { download };
