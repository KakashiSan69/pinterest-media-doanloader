'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { Transform } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { getPin } = require('./pin');
const {
  isPinterestUrl,
  isShortUrl,
  extractPinId,
  sanitizeFilename,
  formatBytes,
  httpGetStream
} = require('./utils');

function hasFfmpeg() {
  return new Promise((resolve) => {
    execFile('ffmpeg', ['-version'], (err) => {
      resolve(!err);
    });
  });
}

function downloadHlsWithFfmpeg(hlsUrl, outputPath) {
  return new Promise((resolve, reject) => {
    execFile('ffmpeg', [
      '-y',
      '-i', hlsUrl,
      '-c', 'copy',
      outputPath
    ], { timeout: 120000 }, (error) => {
      if (error) {
        return reject(new Error(`ffmpeg HLS download failed: ${error.message}`));
      }
      resolve();
    });
  });
}

async function download(url, outputDir = './', options = {}) {
  if (!url || (typeof url !== 'string' && typeof url !== 'number')) {
    throw new Error('URL must be a non-empty string or number');
  }

  const rawUrl = String(url).trim();

  if (typeof outputDir === 'object' && outputDir !== null) {
    options = outputDir;
    outputDir = options.outputDir || options.output || './';
  }

  const quality = options.quality || 'original';
  const overwrite = options.overwrite || false;
  const preferType = options.preferType || 'auto';
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;

  let mediaUrl = null;
  let hlsUrl = null;
  let mediaType = 'image';
  let autoFilename = null;
  let pin = null;

  if (rawUrl.includes('pinimg.com')) {
    mediaUrl = rawUrl;
    mediaType = rawUrl.includes('v.pinimg.com') || rawUrl.endsWith('.mp4') ? 'video' : 'image';
    autoFilename = path.basename(new URL(rawUrl).pathname);
  } else if (isPinterestUrl(rawUrl) || isShortUrl(rawUrl) || extractPinId(rawUrl) || /^\d+$/.test(rawUrl)) {
    pin = await getPin(rawUrl);

    if (preferType === 'video' || (preferType === 'auto' && pin.type === 'video' && pin.videos)) {
      mediaType = 'video';
      const videoData = _selectVideoQuality(pin.videos, quality);
      if (videoData) {
        mediaUrl = videoData.url;
        hlsUrl = videoData.hlsUrl || null;
      }
    }

    if (!mediaUrl && !hlsUrl) {
      mediaType = 'image';
      mediaUrl = _selectImageQuality(pin.images, quality);
    }

    if (!mediaUrl && !hlsUrl) {
      throw new Error('No downloadable media found for this pin');
    }

    autoFilename = sanitizeFilename(pin.title || pin.id);
  } else {
    throw new Error(`Invalid URL: ${rawUrl}`);
  }

  const ext = _getExtension(mediaUrl || hlsUrl, mediaType);
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

  // Attempt direct download if mediaUrl is available
  let directDownloadSuccess = false;
  if (mediaUrl) {
    try {
      const streamRes = await httpGetStream(mediaUrl, {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.pinterest.com/'
      });

      if (streamRes.statusCode >= 200 && streamRes.statusCode < 300) {
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
        await pipeline(stream, progressTracker, writeStream);
        directDownloadSuccess = true;
      }
    } catch {}
  }

  // If direct stream failed or wasn't available, check for HLS or alternate formats
  if (!directDownloadSuccess) {
    let hlsSuccess = false;

    if (mediaType === 'video' && hlsUrl) {
      const canUseFfmpeg = await hasFfmpeg();
      if (canUseFfmpeg) {
        try {
          await downloadHlsWithFfmpeg(hlsUrl, outputPath);
          hlsSuccess = true;
        } catch {}
      }
    }

    // If video could not be fetched and preferType is auto, fallback to high quality image
    if (!hlsSuccess) {
      if (mediaType === 'video' && preferType === 'auto' && pin && pin.images) {
        const fallbackImgUrl = _selectImageQuality(pin.images, quality);
        if (fallbackImgUrl) {
          const imgExt = _getExtension(fallbackImgUrl, 'image');
          const imgFilename = (options.filename ? sanitizeFilename(options.filename) : autoFilename) + imgExt;
          const imgOutputPath = path.join(outputDir, imgFilename);

          const streamRes = await httpGetStream(fallbackImgUrl, {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer': 'https://www.pinterest.com/'
          });

          if (streamRes.statusCode >= 200 && streamRes.statusCode < 300) {
            const writeStream = fs.createWriteStream(imgOutputPath);
            await pipeline(streamRes.stream, writeStream);

            const stats = fs.statSync(imgOutputPath);
            return {
              path: imgOutputPath,
              size: stats.size,
              sizeFormatted: formatBytes(stats.size),
              type: 'image',
              url: fallbackImgUrl,
              filename: imgFilename
            };
          }
        }
      }

      // Cleanup any empty or partial file
      try {
        if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
      } catch {}

      throw new Error(`Failed to download media from: ${rawUrl}`);
    }
  }

  const stats = fs.statSync(outputPath);

  return {
    path: outputPath,
    size: stats.size,
    sizeFormatted: formatBytes(stats.size),
    type: mediaType,
    url: mediaUrl || hlsUrl,
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
