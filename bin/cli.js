#!/usr/bin/env node

'use strict';

const { search } = require('../src/search');
const { getPin } = require('../src/pin');
const { download } = require('../src/download');
const { formatBytes } = require('../src/utils');
const path = require('node:path');

const VERSION = require('../package.json').version;

function parseArgs(argv) {
  const args = { _: [] };
  let i = 0;

  while (i < argv.length) {
    const arg = argv[i];

    if (arg.startsWith('--')) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        args[arg.substring(2, eqIndex)] = arg.substring(eqIndex + 1);
      } else if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        args[arg.substring(2)] = argv[i + 1];
        i++;
      } else {
        args[arg.substring(2)] = true;
      }
    } else if (arg.startsWith('-') && arg.length === 2) {
      if (i + 1 < argv.length && !argv[i + 1].startsWith('-')) {
        args[arg.substring(1)] = argv[i + 1];
        i++;
      } else {
        args[arg.substring(1)] = true;
      }
    } else {
      args._.push(arg);
    }
    i++;
  }

  return args;
}

const HELP = `
\x1b[1m\x1b[36mpinterest-dl\x1b[0m v${VERSION}
\x1b[2mSearch, extract, and download images & videos from Pinterest\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  pinterest-dl <command> [options]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[33msearch\x1b[0m <query>       Search Pinterest for images/videos
  \x1b[33minfo\x1b[0m <url>           Get pin metadata (title, type, media URLs)
  \x1b[33mdownload\x1b[0m <url>       Download a pin's media to disk

\x1b[1mSEARCH OPTIONS:\x1b[0m
  --limit, -l          Number of results (default: 10)
  --type, -t           Filter: 'all' | 'images' | 'videos' (default: 'all')
  --output, -o         Output format: 'table' | 'json' (default: 'table')

\x1b[1mDOWNLOAD OPTIONS:\x1b[0m
  --quality, -q        Quality: 'original' | 'high' | 'medium' | 'low' (default: 'original')
  --output, -o         Output directory (default: './')
  --filename, -f       Custom filename (auto-generated if omitted)
  --overwrite          Overwrite existing files

\x1b[1mGLOBAL OPTIONS:\x1b[0m
  --help, -h           Show this help message
  --version, -v        Show version

\x1b[1mEXAMPLES:\x1b[0m
  $ pinterest-dl search "aesthetic wallpapers" --limit 10
  $ pinterest-dl search "cooking videos" --type videos --output json
  $ pinterest-dl info https://pin.it/abc123
  $ pinterest-dl download https://pin.it/abc123 -q high -o ./downloads
`;

function printTable(pins) {
  if (pins.length === 0) {
    console.log('\x1b[33mNo results found.\x1b[0m');
    return;
  }

  console.log('');
  console.log(`\x1b[1m  Found ${pins.length} result(s):\x1b[0m`);
  console.log(`  ${'─'.repeat(80)}`);

  for (let i = 0; i < pins.length; i++) {
    const pin = pins[i];
    const num = String(i + 1).padStart(2, ' ');
    const type = pin.type === 'video' ? '\x1b[35m[VIDEO]\x1b[0m' : '\x1b[32m[IMAGE]\x1b[0m';
    const title = (pin.title || 'Untitled').substring(0, 60);

    console.log(`  \x1b[2m${num}.\x1b[0m ${type} ${title}`);

    if (pin.images?.original) {
      console.log(`      \x1b[2m📷 ${pin.images.original}\x1b[0m`);
    }

    if (pin.videos?.high?.url) {
      console.log(`      \x1b[2m🎬 ${pin.videos.high.url}\x1b[0m`);
    }

    console.log(`      \x1b[2m🔗 ${pin.link}\x1b[0m`);

    if (i < pins.length - 1) {
      console.log(`  \x1b[2m${'·'.repeat(80)}\x1b[0m`);
    }
  }

  console.log(`  ${'─'.repeat(80)}`);
  console.log('');
}

async function cmdSearch(query, args) {
  const limit = parseInt(args.limit || args.l || '10', 10);
  const type = args.type || args.t || 'all';
  const output = args.output || args.o || 'table';

  console.log(`\x1b[36m⏳ Searching Pinterest for "${query}"...\x1b[0m`);

  try {
    const results = await search(query, { limit, type });

    if (output === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else {
      printTable(results.pins);
      if (results.bookmark) {
        console.log(`\x1b[2m  Bookmark for next page: ${results.bookmark.substring(0, 30)}...\x1b[0m`);
      }
    }
  } catch (error) {
    console.error(`\x1b[31m✖ Search failed: ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

async function cmdInfo(url, args) {
  console.log(`\x1b[36m⏳ Fetching pin info...\x1b[0m`);

  try {
    const pin = await getPin(url);
    const output = args.output || args.o || 'table';

    if (output === 'json') {
      console.log(JSON.stringify(pin, null, 2));
      return;
    }

    console.log('');
    console.log(`\x1b[1m  Pin Information:\x1b[0m`);
    console.log(`  ${'─'.repeat(60)}`);
    console.log(`  \x1b[33mID:\x1b[0m          ${pin.id}`);
    console.log(`  \x1b[33mTitle:\x1b[0m        ${pin.title || 'Untitled'}`);
    console.log(`  \x1b[33mType:\x1b[0m         ${pin.type === 'video' ? '\x1b[35mvideo\x1b[0m' : '\x1b[32mimage\x1b[0m'}`);
    console.log(`  \x1b[33mLink:\x1b[0m         ${pin.link}`);

    if (pin.description) {
      const desc = pin.description.substring(0, 100);
      console.log(`  \x1b[33mDescription:\x1b[0m  ${desc}${pin.description.length > 100 ? '...' : ''}`);
    }

    console.log(`  ${'─'.repeat(60)}`);
    console.log(`  \x1b[1mImages:\x1b[0m`);
    if (pin.images.original) console.log(`    Original:   ${pin.images.original}`);
    if (pin.images.large)    console.log(`    Large:      ${pin.images.large}`);
    if (pin.images.medium)   console.log(`    Medium:     ${pin.images.medium}`);
    if (pin.images.small)    console.log(`    Small:      ${pin.images.small}`);

    if (pin.videos) {
      console.log(`  ${'─'.repeat(60)}`);
      console.log(`  \x1b[1mVideos:\x1b[0m`);
      if (pin.videos.high)   console.log(`    High:       ${pin.videos.high.url} (${pin.videos.high.width}x${pin.videos.high.height})`);
      if (pin.videos.medium) console.log(`    Medium:     ${pin.videos.medium.url} (${pin.videos.medium.width}x${pin.videos.medium.height})`);
      if (pin.videos.low)    console.log(`    Low:        ${pin.videos.low.url} (${pin.videos.low.width}x${pin.videos.low.height})`);
    }

    console.log(`  ${'─'.repeat(60)}`);
    console.log(`  \x1b[1mMetadata:\x1b[0m`);
    if (pin.metadata.pinner.username) console.log(`    Pinner:     ${pin.metadata.pinner.fullName || pin.metadata.pinner.username}`);
    if (pin.metadata.board.name)      console.log(`    Board:      ${pin.metadata.board.name}`);
    if (pin.metadata.saves)           console.log(`    Saves:      ${pin.metadata.saves}`);
    if (pin.metadata.domain)          console.log(`    Domain:     ${pin.metadata.domain}`);
    console.log('');
  } catch (error) {
    console.error(`\x1b[31m✖ Failed to get pin info: ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

async function cmdDownload(url, args) {
  const quality = args.quality || args.q || 'original';
  const outputDir = args.output || args.o || './';
  const filename = args.filename || args.f || undefined;
  const overwrite = args.overwrite || false;

  console.log(`\x1b[36m⏳ Downloading...\x1b[0m`);

  try {
    let lastProgress = 0;
    const result = await download(url, outputDir, {
      quality,
      filename,
      overwrite,
      onProgress: (downloaded, total) => {
        const pct = Math.round(downloaded / total * 100);
        if (pct >= lastProgress + 10) {
          process.stdout.write(`\r\x1b[36m  ⬇ Downloading... ${pct}% (${formatBytes(downloaded)} / ${formatBytes(total)})\x1b[0m`);
          lastProgress = pct;
        }
      }
    });

    console.log('');
    console.log('');
    console.log(`\x1b[32m  ✔ Download complete!\x1b[0m`);
    console.log(`  ${'─'.repeat(50)}`);
    console.log(`  \x1b[33mFile:\x1b[0m      ${result.filename}`);
    console.log(`  \x1b[33mPath:\x1b[0m      ${path.resolve(result.path)}`);
    console.log(`  \x1b[33mSize:\x1b[0m      ${result.sizeFormatted}`);
    console.log(`  \x1b[33mType:\x1b[0m      ${result.type}`);
    console.log('');
  } catch (error) {
    console.error(`\n\x1b[31m✖ Download failed: ${error.message}\x1b[0m`);
    process.exit(1);
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  if (args.version || args.v) {
    console.log(VERSION);
    return;
  }

  if (args.help || args.h || args._.length === 0) {
    console.log(HELP);
    return;
  }

  const command = args._[0];
  const target = args._[1];

  switch (command) {
    case 'search':
      if (!target) {
        console.error('\x1b[31m✖ Please provide a search query.\x1b[0m');
        console.error('  Usage: pinterest-dl search "your query" [--limit 10]');
        process.exit(1);
      }
      await cmdSearch(target, args);
      break;

    case 'info':
      if (!target) {
        console.error('\x1b[31m✖ Please provide a Pinterest URL or pin ID.\x1b[0m');
        console.error('  Usage: pinterest-dl info <url>');
        process.exit(1);
      }
      await cmdInfo(target, args);
      break;

    case 'download':
    case 'dl':
      if (!target) {
        console.error('\x1b[31m✖ Please provide a Pinterest URL or pin ID.\x1b[0m');
        console.error('  Usage: pinterest-dl download <url> [--output ./downloads]');
        process.exit(1);
      }
      await cmdDownload(target, args);
      break;

    default:
      console.error(`\x1b[31m✖ Unknown command: "${command}"\x1b[0m`);
      console.error('  Run "pinterest-dl --help" to see available commands.');
      process.exit(1);
  }
}

main().catch((error) => {
  console.error(`\x1b[31m✖ Unexpected error: ${error.message}\x1b[0m`);
  process.exit(1);
});
