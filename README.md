# pinterest-media-downloader

[![npm version](https://img.shields.io/npm/v/pinterest-media-downloader.svg)](https://www.npmjs.com/package/pinterest-media-downloader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)

> Search, extract, and download images & videos from Pinterest. Lightweight, zero-dependency Node.js module with CLI support.

## Features

- 🔍 **Search** — Search Pinterest by keyword, filter by images or videos
- 📌 **Pin Info** — Extract full metadata from any Pinterest URL or pin ID
- ⬇️ **Download** — Download images and videos in multiple quality levels
- 🖥️ **CLI** — Full-featured command-line interface
- 📦 **Zero Dependencies** — Uses only Node.js built-in modules
- 🔄 **Dual Format** — Works with both CommonJS (`require`) and ESM (`import`)

## Installation

```bash
npm install pinterest-media-downloader
```

Or use it directly with npx:

```bash
npx pinterest-media-downloader search "cats"
```

## Quick Start

### Search for Images

```javascript
const { search } = require('pinterest-media-downloader');

const results = await search('aesthetic wallpapers', { limit: 10 });

results.pins.forEach(pin => {
  console.log(`[${pin.type}] ${pin.title}`);
  console.log(`  Image: ${pin.images.original}`);
});
```

### Search for Videos

```javascript
const { search } = require('pinterest-media-downloader');

const results = await search('cooking recipes', {
  limit: 5,
  type: 'videos'
});

results.pins.forEach(pin => {
  if (pin.videos) {
    console.log(`${pin.title} → ${pin.videos.high.url}`);
  }
});
```

### Get Pin Info

```javascript
const { getPin } = require('pinterest-media-downloader');

// Works with full URLs, short URLs, or pin IDs
const pin = await getPin('https://pin.it/abc123');
// const pin = await getPin('https://www.pinterest.com/pin/123456789/');
// const pin = await getPin('123456789');

console.log(pin.title);       // Pin title
console.log(pin.type);        // 'image' or 'video'
console.log(pin.images);      // { small, medium, large, original }
console.log(pin.videos);      // { low, medium, high } (if video)
console.log(pin.metadata);    // { pinner, board, saves, comments }
```

### Download Media

```javascript
const { download } = require('pinterest-media-downloader');

const result = await download('https://pin.it/abc123', './downloads', {
  quality: 'original',
  onProgress: (downloaded, total) => {
    console.log(`${Math.round(downloaded / total * 100)}%`);
  }
});

console.log(`Saved: ${result.path} (${result.sizeFormatted})`);
```

### ESM Import

```javascript
import { search, getPin, download } from 'pinterest-media-downloader';
```

## CLI Usage

```
pinterest-dl <command> [options]

Commands:
  search <query>       Search Pinterest for images/videos
  info <url>           Get pin metadata (title, type, media URLs)
  download <url>       Download a pin's media to disk

Search Options:
  --limit, -l          Number of results (default: 10)
  --type, -t           Filter: 'all' | 'images' | 'videos' (default: 'all')
  --output, -o         Output format: 'table' | 'json' (default: 'table')

Download Options:
  --quality, -q        Quality: 'original' | 'high' | 'medium' | 'low'
  --output, -o         Output directory (default: './')
  --filename, -f       Custom filename (auto-generated if omitted)
  --overwrite          Overwrite existing files

Global Options:
  --help, -h           Show help
  --version, -v        Show version
```

### CLI Examples

```bash
# Search for images
pinterest-dl search "aesthetic wallpapers" --limit 10

# Search for videos only, output as JSON
pinterest-dl search "cooking recipes" --type videos --output json

# Get pin info
pinterest-dl info https://pin.it/abc123

# Download a pin in high quality
pinterest-dl download https://pin.it/abc123 -q high -o ./downloads

# Download with a custom filename
pinterest-dl download https://www.pinterest.com/pin/123456789/ -f my-photo -o ./photos
```

## API Reference

### `search(query, options?)`

Search Pinterest for pins matching a keyword.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `query` | `string` | *(required)* | Search query |
| `options.limit` | `number` | `25` | Max results (1–250) |
| `options.type` | `string` | `'all'` | `'all'`, `'images'`, or `'videos'` |
| `options.scope` | `string` | `'pins'` | `'pins'`, `'boards'`, or `'videos'` |
| `options.bookmark` | `string` | `null` | Pagination bookmark |

**Returns:** `Promise<{ pins: Pin[], bookmark: string|null }>`

---

### `getPin(urlOrId)`

Extract metadata from a Pinterest pin.

**Parameters:**

| Parameter | Type | Description |
|---|---|---|
| `urlOrId` | `string` | Pinterest URL, short URL (`pin.it`), or pin ID |

**Returns:** `Promise<Pin>`

---

### `download(url, outputDir?, options?)`

Download media from a Pinterest pin.

**Parameters:**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `url` | `string` | *(required)* | Pinterest URL, pin ID, or direct media URL |
| `outputDir` | `string` | `'./'` | Output directory |
| `options.quality` | `string` | `'original'` | `'original'`, `'high'`, `'medium'`, `'low'` |
| `options.overwrite` | `boolean` | `false` | Overwrite existing files |
| `options.filename` | `string` | *auto* | Custom filename (without extension) |
| `options.onProgress` | `function` | – | `(downloadedBytes, totalBytes) => void` |

**Returns:** `Promise<{ path, size, sizeFormatted, type, url, filename }>`

---

### Pin Object

```javascript
{
  id: '123456789',
  title: 'Pin title',
  description: 'Pin description',
  type: 'image' | 'video',
  link: 'https://www.pinterest.com/pin/123456789/',
  images: {
    small: 'https://i.pinimg.com/236x/...',
    medium: 'https://i.pinimg.com/474x/...',
    large: 'https://i.pinimg.com/736x/...',
    original: 'https://i.pinimg.com/originals/...'
  },
  videos: {                              // Only for video pins
    low:    { url, width, height, duration },
    medium: { url, width, height, duration },
    high:   { url, width, height, duration }
  },
  metadata: {
    pinner: { username, fullName, profileUrl },
    board:  { name, url },
    saves: 42,
    comments: 5,
    domain: 'example.com',
    createdAt: '2024-01-01T00:00:00'
  }
}
```

## Requirements

- **Node.js >= 18.0.0** (uses native `node:test`, `node:stream/promises`, etc.)

## Legal Disclaimer

> **⚠️ This package is provided for educational and personal use only.** Scraping Pinterest may violate their [Terms of Service](https://policy.pinterest.com/en/terms-of-service). Users are responsible for ensuring their use complies with Pinterest's terms and applicable laws. The authors are not responsible for any misuse of this software.

## License

MIT © [Your Name]
