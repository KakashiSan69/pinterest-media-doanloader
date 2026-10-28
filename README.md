<div align="center">

# �� pinterest-media-downloader v2.0.0

**A powerful, zero-dependency Node.js library and CLI tool to search, extract metadata, and download high-resolution images & videos from Pinterest.**

[![npm version](https://img.shields.io/npm/v/pinterest-media-downloader?color=E60023&style=for-the-badge&logo=npm)](https://www.npmjs.com/package/pinterest-media-downloader)
[![npm downloads](https://img.shields.io/npm/dm/pinterest-media-downloader?style=for-the-badge&color=blue)](https://www.npmjs.com/package/pinterest-media-downloader)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-43853d?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0-success?style=for-the-badge)](https://www.npmjs.com/package/pinterest-media-downloader)

<p align="center">
  <a href="#-key-features">Features</a> •
  <a href="#-supported-url-formats">Supported URL Types</a> •
  <a href="#-installation">Installation</a> •
  <a href="#-quick-start">Quick Start</a> •
  <a href="#-cli-tool">CLI Guide</a> •
  <a href="#-api-reference">API Reference</a> •
  <a href="#-testing">Testing</a> •
  <a href="#-legal-disclaimer">Disclaimer</a>
</p>

</div>

---

## ⚡ Key Features

- 🌐 **Universal URL Compatibility (v2.0)** — Supports **ALL** Pinterest URL variations: `pin.it` shortlinks (with multi-hop redirect resolution), international ccTLDs (`.co.uk`, `.ca`, `.de`, `.fr`, etc.), mobile subdomains (`m.pinterest.com`), Idea/Story Pins, app deep links (`pinterest://`), protocol-less URLs, and raw pin IDs.
- 🔍 **Universal Search** — Search Pinterest by keyword with filters for images, videos, and pagination bookmark support.
- 📌 **Deep Pin Metadata** — Extract title, description, author profile, board info, likes/saves count, and dominant color.
- ⬇️ **Lossless Media Downloader** — Fetch the highest quality original image (`/originals/`) or highest bitrate video (`1080p`/`720p` MP4 & HLS stream support).
- ⚡ **Zero External Dependencies** — Built 100% on native Node.js core modules (`node:https`, `node:stream`). Super fast and lightweight!
- 🖥️ **First-Class CLI** — Use `pinterest-dl` from your terminal or directly via `npx` with progress indicators and `--json` output.
- 📦 **Dual Module & TypeScript Ready** — First-class support for ES Modules (`import`), CommonJS (`require`), and bundled TypeScript declarations (`.d.ts`).
- 🛠️ **Exported Utility Helpers** — Validate and extract pin IDs directly with `extractPinId()`, `isPinterestUrl()`, `isShortUrl()`, and `resolveShortUrl()`.

---

## 🔗 Supported URL Formats

`pinterest-media-downloader` v2.0 introduces universal URL recognition and recursive redirect expansion:

| URL Type | Example Format |
|---|---|
| **Short Links (pin.it)** | `https://pin.it/WyKwAMsAR`, `http://pin.it/abc1234`, `pin.it/abc` |
| **Short Links with Tracking** | `https://pin.it/WyKwAMsAR?sub_id=share123` |
| **API Redirect Endpoints** | `https://api.pinterest.com/url_shortener/WyKwAMsAR/redirect/` |
| **Standard Pins (HTTPS/HTTP)** | `https://www.pinterest.com/pin/659073726759755724/` |
| **Without Trailing Slash** | `https://www.pinterest.com/pin/659073726759755724` |
| **Protocol-less URLs** | `pinterest.com/pin/659073726759755724`, `pin.it/WyKwAMsAR` |
| **Mobile Subdomains** | `https://m.pinterest.com/pin/...`, `https://mobile.pinterest.com/pin/...` |
| **Regional Subdomains** | `https://in.pinterest.com/...`, `https://de.pinterest.com/...`, `https://br.pinterest.com/...` |
| **Country ccTLDs** | `https://www.pinterest.co.uk/pin/...`, `pinterest.ca`, `pinterest.de`, `pinterest.fr`, etc. |
| **Idea & Story Pins** | `https://www.pinterest.com/idea-pin/659073726759755724/`, `.../ideas/slug/659.../` |
| **Pin Creation & Builder** | `https://www.pinterest.com/pin-creation/659073726759755724/` |
| **User & Board Paths** | `https://www.pinterest.com/username/boardname/pin/659073726759755724/` |
| **Query Parameter Pins** | `https://www.pinterest.com/?pin=659073726759755724` |
| **Mobile App Deep Links** | `pinterest://pin/659073726759755724`, `pinit://pin/659073726759755724` |
| **Raw Pin IDs** | `659073726759755724` (string or number) |
| **Direct CDN Media URLs** | `https://i.pinimg.com/originals/...jpg`, `https://v.pinimg.com/...mp4` |

---

## 📦 Installation

Install globally for CLI usage or locally in your project:

```bash
# Install locally
npm install pinterest-media-downloader

# Install globally for CLI
npm install -g pinterest-media-downloader
```

---

## 🚀 Quick Start

### 1. Download Media (Image or Video)
```javascript
const { download } = require('pinterest-media-downloader');

// Works with shortlinks, full URLs, mobile links, or raw IDs!
const result = await download('https://pin.it/WyKwAMsAR', './my-downloads', {
  quality: 'original',
  overwrite: true,
  onProgress: (downloadedBytes, totalBytes) => {
    const percent = Math.round((downloadedBytes / totalBytes) * 100);
    process.stdout.write(`\rDownloading: ${percent}%`);
  }
});

console.log(`\nSaved ${result.type} to ${result.path} (${result.sizeFormatted})`);
```

### 2. Fetch Pin Information
```javascript
const { getPin } = require('pinterest-media-downloader');

const pin = await getPin('https://pin.it/WyKwAMsAR');
console.log('Title:', pin.title);
console.log('Media Type:', pin.type);
console.log('Original Image:', pin.images.original);
if (pin.videos) {
  console.log('Video High:', pin.videos.high.url);
}
```

### 3. Search Pinterest
```javascript
const { search } = require('pinterest-media-downloader');

const { pins, bookmark } = await search('cyberpunk city aesthetic', {
  limit: 10,
  type: 'images'
});

for (const pin of pins) {
  console.log(`[${pin.id}] ${pin.title} -> ${pin.images.original}`);
}
```

### 4. Direct URL Utility Helpers
```javascript
const { extractPinId, isPinterestUrl, isShortUrl, resolveShortUrl } = require('pinterest-media-downloader');

// Check URL validity
isPinterestUrl('https://in.pinterest.com/pin/659073726759755724/'); // true
isShortUrl('https://pin.it/WyKwAMsAR'); // true

// Extract pin ID synchronously without network request
extractPinId('https://www.pinterest.com/idea-pin/cyberpunk/659073726759755724/'); // '659073726759755724'

// Resolve short link through redirects
const fullUrl = await resolveShortUrl('https://pin.it/WyKwAMsAR');
console.log(fullUrl);
```

---

## 🖥️ CLI Tool (`pinterest-dl`)

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

### CLI Examples

```bash
# 1. Download a pin from a short link
pinterest-dl download https://pin.it/WyKwAMsAR -o ./downloads -q high

# 2. Inspect pin details formatted as JSON
pinterest-dl info https://pin.it/WyKwAMsAR --json

# 3. Search videos and pipe output as JSON
pinterest-dl search "anime wallpaper" --type videos --limit 5 --json

# 4. Download directly via npx without installing
npx pinterest-dl download https://pin.it/WyKwAMsAR
```

---

## 🧪 Testing

The package includes a comprehensive URL test suite covering 80+ test cases across all Pinterest URL variations, subdomains, international ccTLDs, short URLs, custom app schemes, and live API resolution.

```bash
npm test
```

Test results are automatically exported to `test-results.json` detailing execution statistics, pass/fail state, and resolution metrics.

---

## ⚖️ Legal Disclaimer

> **Notice:** This software is provided for educational and research purposes only. The library interacts with public web endpoints. The authors are not affiliated with, authorized, maintained, or endorsed by Pinterest. You are solely responsible for ensuring that your use of this software complies with Pinterest's [Terms of Service](https://policy.pinterest.com/en/terms-of-service) and local laws.

---

## 📄 License

[MIT License](LICENSE) © 2026 [KakashiSan69](https://github.com/KakashiSan69)
