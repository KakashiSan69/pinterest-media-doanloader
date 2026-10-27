<div align="center">

# 📌 pinterest-media-downloader

**A powerful, zero-dependency Node.js library and CLI tool to search, extract metadata, and download high-resolution images & videos from Pinterest.**

[![npm version](https://img.shields.io/npm/v/pinterest-media-downloader?color=E60023&style=for-the-badge&logo=npm)](https://www.npmjs.com/package/pinterest-media-downloader)
[![npm downloads](https://img.shields.io/npm/dm/pinterest-media-downloader?style=for-the-badge&color=blue)](https://www.npmjs.com/package/pinterest-media-downloader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-43853d?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=for-the-badge)](https://www.npmjs.com/package/pinterest-media-downloader)

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-cli-tool">CLI Guide</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-advanced-recipes">Advanced Recipes</a> •
  <a href="#-legal-disclaimer">Disclaimer</a>
</p>

</div>

---

## ⚡ Key Features

- 🔍 **Universal Search** — Search Pinterest by keyword with filters for images, videos, and pagination bookmark support.
- 📌 **Deep Pin Metadata** — Extract title, description, author profile, board info, likes/saves count, and dominant color.
- ⬇️ **Lossless Media Downloader** — Fetch the highest quality original image (`/originals/`) or highest bitrate video (`1080p`/`720p`).
- ⚡ **Zero External Dependencies** — Built 100% on native Node.js core modules (`node:https`, `node:stream`). Super fast and lightweight!
- 🖥️ **First-Class CLI** — Use `pinterest-dl` from your terminal or directly via `npx` with progress indicators and JSON output.
- 📦 **Dual Module & TypeScript Ready** — First-class support for ES Modules (`import`), CommonJS (`require`), and bundled TypeScript declarations (`.d.ts`).
- 🔗 **Smart URL Resolver** — Automatically expands short URLs (`pin.it/...`), handles regional domains (`in.pinterest.com`, `pinterest.co.uk`), and extracts pin IDs directly.

---

## 📦 Installation

Install globally for CLI usage or locally in your project:

### Package Managers

```bash
# npm
npm install pinterest-media-downloader

# pnpm
pnpm add pinterest-media-downloader

# yarn
yarn add pinterest-media-downloader

# bun
bun add pinterest-media-downloader
```

### Run Instantly via NPX (No install needed)

```bash
npx pinterest-media-downloader search "cyberpunk aesthetic" --limit 5
```

---

## 🚀 Quick Start

### 1. Search for Images & Videos

```javascript
// ESM
import { search } from 'pinterest-media-downloader';

// CommonJS
// const { search } = require('pinterest-media-downloader');

const results = await search('cozy desk setup', {
  limit: 10,
  type: 'all' // 'all' | 'images' | 'videos'
});

console.log(`Found ${results.pins.length} pins:`);
for (const pin of results.pins) {
  console.log(`- [${pin.type.toUpperCase()}] ${pin.title}`);
  console.log(`  Link: ${pin.link}`);
  console.log(`  Image: ${pin.images.original}`);
}
```

---

### 2. Get Metadata for Any Pin

Supports full Pinterest URLs, short links (`pin.it`), or raw pin IDs:

```javascript
import { getPin } from 'pinterest-media-downloader';

const pin = await getPin('https://pin.it/3L9xK2A');

console.log('📌 Title:', pin.title);
console.log('👤 Creator:', pin.metadata.pinner.fullName, `(@${pin.metadata.pinner.username})`);
console.log('📁 Board:', pin.metadata.board.name);
console.log('❤️ Saves:', pin.metadata.saves);
console.log('🖼️ Original Image:', pin.images.original);

if (pin.type === 'video' && pin.videos) {
  console.log('🎥 High Quality Video:', pin.videos.high.url);
}
```

---

### 3. Download Media with Real-time Progress

```javascript
import { download } from 'pinterest-media-downloader';

const result = await download('https://pin.it/3L9xK2A', './downloads', {
  quality: 'original',
  overwrite: true,
  onProgress: (downloadedBytes, totalBytes) => {
    const percent = Math.round((downloadedBytes / totalBytes) * 100);
    process.stdout.write(`\rDownloading: ${percent}%`);
  }
});

console.log(`\n✅ Saved to: ${result.path} (${result.sizeFormatted})`);
```

---

## 🖥️ CLI Tool (`pinterest-dl`)

The package includes a powerful command-line interface executable as `pinterest-dl` or via `npx pinterest-media-downloader`.

### Commands Overview

```
pinterest-dl <command> [options]

Commands:
  search <query>       Search Pinterest for images/videos
  info <url>           Get full pin metadata (JSON or table)
  download <url>       Download media directly to disk

Global Options:
  -h, --help           Show help information
  -v, --version        Show version number
```

### CLI Command Options

#### `pinterest-dl search <query>`
| Option | Alias | Default | Description |
|---|---|---|---|
| `--limit` | `-l` | `10` | Number of results to return (1-250) |
| `--type` | `-t` | `all` | Filter results: `all`, `images`, or `videos` |
| `--output`| `-o` | `table` | Display format: `table` or `json` |

```bash
# Search aesthetic wallpapers (table view)
pinterest-dl search "minimalist architecture" --limit 15

# Search cooking videos and pipe JSON to jq
pinterest-dl search "pasta recipe" --type videos -o json | jq '.[0]'
```

#### `pinterest-dl info <url>`
| Option | Alias | Default | Description |
|---|---|---|---|
| `--output`| `-o` | `table` | Display format: `table` or `json` |

```bash
pinterest-dl info https://pin.it/abc123
```

#### `pinterest-dl download <url>`
| Option | Alias | Default | Description |
|---|---|---|---|
| `--output` | `-o` | `./` | Destination folder |
| `--quality`| `-q` | `original` | Media quality: `original`, `high`, `medium`, `low` |
| `--filename`| `-f` | *auto* | Custom filename (without extension) |
| `--overwrite`| | `false` | Overwrite existing files |

```bash
# Download to ./my-gallery folder in maximum quality
pinterest-dl download https://pin.it/abc123 -o ./my-gallery -q original

# Download with a custom name
pinterest-dl download https://pin.it/abc123 -f "hero-wallpaper"
```

---

## 📖 API Reference

### `search(query, options?)`
Search Pinterest for pins matching the query.

```typescript
function search(query: string, options?: SearchOptions): Promise<SearchResult>
```

#### Parameters:
- `query` *(string, required)*: The search query string.
- `options` *(object, optional)*:
  - `limit` *(number, default: 25)*: Maximum items to retrieve (1 to 250).
  - `type` *(string, default: `'all'`)*: Filter results (`'all'` | `'images'` | `'videos'`).
  - `scope` *(string, default: `'pins'`)*: Search scope (`'pins'` | `'boards'`).
  - `bookmark` *(string, optional)*: Cursor for pagination to fetch subsequent pages.

#### Returns:
```typescript
{
  pins: Pin[],
  bookmark: string | null // Pass to next search() call to paginate
}
```

---

### `getPin(urlOrId)`
Fetch comprehensive pin details by URL, short URL, or pin ID.

```typescript
function getPin(urlOrId: string): Promise<Pin>
```

#### Pin Object Structure:
```json
{
  "id": "123456789012345678",
  "title": "Aesthetic Desktop Wallpaper",
  "description": "Minimal 4K workspace inspiration",
  "type": "image",
  "link": "https://www.pinterest.com/pin/123456789012345678/",
  "images": {
    "small": "https://i.pinimg.com/236x/...",
    "medium": "https://i.pinimg.com/474x/...",
    "large": "https://i.pinimg.com/736x/...",
    "original": "https://i.pinimg.com/originals/..."
  },
  "videos": {
    "high": { "url": "https://v.pinimg.com/...", "width": 1080, "height": 1920, "duration": 15 },
    "medium": { "url": "https://v.pinimg.com/...", "width": 720, "height": 1280, "duration": 15 },
    "low": { "url": "https://v.pinimg.com/...", "width": 480, "height": 854, "duration": 15 }
  },
  "metadata": {
    "pinner": {
      "username": "aesthetic_curator",
      "fullName": "Aesthetic Curator",
      "profileUrl": "https://www.pinterest.com/aesthetic_curator/"
    },
    "board": {
      "name": "Workspace Inspo",
      "url": "https://www.pinterest.com/aesthetic_curator/workspace-inspo/"
    },
    "saves": 1420,
    "comments": 28,
    "dominantColor": "#2b303a"
  }
}
```

---

### `download(url, outputDir?, options?)`
Stream-downloads the media file with automatic format detection and progress hooks.

```typescript
function download(
  url: string,
  outputDir?: string | DownloadOptions,
  options?: DownloadOptions
): Promise<DownloadResult>
```

#### Options:
- `quality` *(string, default: `'original'`)*: `'original'` | `'high'` | `'medium'` | `'low'`
- `overwrite` *(boolean, default: `false`)*: Whether to replace files if they already exist.
- `filename` *(string, optional)*: Custom name (auto-sanitized, extension appended automatically).
- `onProgress` *(function, optional)*: Callback `(downloadedBytes, totalBytes) => void`.

#### Returns:
```typescript
{
  path: "/absolute/path/to/downloads/pin-title.jpg",
  size: 2451928,
  sizeFormatted: "2.3 MB",
  type: "image",
  url: "https://i.pinimg.com/originals/...",
  filename: "pin-title.jpg"
}
```

---

## 💡 Advanced Recipes

### Batch Downloading Multiple Pins Concurrently

```javascript
import { search, download } from 'pinterest-media-downloader';

// 1. Search for 5 pins
const { pins } = await search('nature photography', { limit: 5 });

// 2. Download all in parallel
const downloads = await Promise.all(
  pins.map(pin => download(pin.link, './nature-wallpapers'))
);

console.log(`Downloaded ${downloads.length} files successfully!`);
```

### Building an Express.js API Route

```javascript
import express from 'express';
import { getPin } from 'pinterest-media-downloader';

const app = express();

app.get('/api/pin', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: 'URL is required' });

    const pinData = await getPin(url);
    res.json(pinData);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => console.log('Server running on :3000'));
```

---

## 🛡️ Error Handling

Always wrap calls in `try / catch` blocks to gracefully handle network issues or private pins:

```javascript
import { getPin } from 'pinterest-media-downloader';

try {
  const pin = await getPin('https://pin.it/invalid_url');
} catch (error) {
  if (error.message.includes('Could not extract pin ID')) {
    console.error('Invalid Pinterest link provided.');
  } else {
    console.error('Fetch failed:', error.message);
  }
}
```

---

## 🤝 Contributing

Contributions are welcome! If you have suggestions, bug reports, or feature requests:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## ⚖️ Legal Disclaimer

> **Notice:** This software is provided for educational and research purposes only. The library interacts with public web endpoints. The authors are not affiliated with, authorized, maintained, or endorsed by Pinterest. You are solely responsible for ensuring that your use of this software complies with Pinterest's [Terms of Service](https://policy.pinterest.com/en/terms-of-service) and local laws.

---

## 📄 License

[MIT License](LICENSE) © 2026 [KakashiSan69](https://github.com/KakashiSan69)
