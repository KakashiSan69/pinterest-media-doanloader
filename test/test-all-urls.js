'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {
  isPinterestUrl,
  isShortUrl,
  extractPinId,
  resolveShortUrl,
  normalizeUrl
} = require('../src/utils');
const { getPin } = require('../src/pin');

const PIN_ID = '659073726759755724';

const testDefinitions = [
  // 1. Standard Pin URLs
  { category: 'Standard Pin URLs', name: 'HTTPS with www and trailing slash', input: `https://www.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Standard Pin URLs', name: 'HTTPS with www without trailing slash', input: `https://www.pinterest.com/pin/${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Standard Pin URLs', name: 'HTTPS without www', input: `https://pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Standard Pin URLs', name: 'HTTP with www', input: `http://www.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Standard Pin URLs', name: 'HTTP without www', input: `http://pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 2. Protocol-less URLs
  { category: 'Protocol-less URLs', name: 'No protocol domain and pin path', input: `pinterest.com/pin/${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Protocol-less URLs', name: 'No protocol with www', input: `www.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Protocol-less URLs', name: 'No protocol mobile subdomain', input: `m.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Protocol-less URLs', name: 'No protocol pin.it short URL', input: 'pin.it/WyKwAMsAR', expectedId: null, isPin: true, isShort: true, isLiveShort: true },

  // 3. Subdomains & Regional
  { category: 'Subdomains & Regional', name: 'm.pinterest.com (Mobile)', input: `https://m.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'mobile.pinterest.com', input: `https://mobile.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'touch.pinterest.com', input: `https://touch.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'in.pinterest.com (India)', input: `https://in.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'br.pinterest.com (Brazil)', input: `https://br.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'de.pinterest.com (Germany)', input: `https://de.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'fr.pinterest.com (France)', input: `https://fr.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'es.pinterest.com (Spain)', input: `https://es.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'it.pinterest.com (Italy)', input: `https://it.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'jp.pinterest.com (Japan)', input: `https://jp.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'kr.pinterest.com (Korea)', input: `https://kr.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'ru.pinterest.com (Russia)', input: `https://ru.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'id.pinterest.com (Indonesia)', input: `https://id.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'ar.pinterest.com (Arabic)', input: `https://ar.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'tr.pinterest.com (Turkey)', input: `https://tr.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'mx.pinterest.com (Mexico)', input: `https://mx.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subdomains & Regional', name: 'pl.pinterest.com (Poland)', input: `https://pl.pinterest.com/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 4. Country ccTLDs
  { category: 'Country ccTLDs', name: 'pinterest.co.uk (United Kingdom)', input: `https://www.pinterest.co.uk/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.ca (Canada)', input: `https://pinterest.ca/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.de (Germany)', input: `https://pinterest.de/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.fr (France)', input: `https://pinterest.fr/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.es (Spain)', input: `https://pinterest.es/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.it (Italy)', input: `https://pinterest.it/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.jp (Japan)', input: `https://pinterest.jp/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.at (Austria)', input: `https://pinterest.at/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.ch (Switzerland)', input: `https://pinterest.ch/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.se (Sweden)', input: `https://pinterest.se/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.dk (Denmark)', input: `https://pinterest.dk/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.no (Norway)', input: `https://pinterest.no/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.fi (Finland)', input: `https://pinterest.fi/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.nl (Netherlands)', input: `https://pinterest.nl/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.be (Belgium)', input: `https://pinterest.be/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.pt (Portugal)', input: `https://pinterest.pt/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.ie (Ireland)', input: `https://pinterest.ie/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.nz (New Zealand)', input: `https://pinterest.nz/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.ph (Philippines)', input: `https://pinterest.ph/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.cl (Chile)', input: `https://pinterest.cl/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.com.mx (Mexico)', input: `https://pinterest.com.mx/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.com.au (Australia)', input: `https://pinterest.com.au/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Country ccTLDs', name: 'pinterest.co.kr (South Korea)', input: `https://pinterest.co.kr/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 5. Pin Subpaths & Query Params
  { category: 'Subpaths & Params', name: 'Share link with /sent/ and invite params', input: `https://www.pinterest.com/pin/${PIN_ID}/sent/?invite_code=abc&sender=123&sfo=1`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin feedback path', input: `https://www.pinterest.com/pin/${PIN_ID}/feedback/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin activity path', input: `https://www.pinterest.com/pin/${PIN_ID}/activity/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin comments path', input: `https://www.pinterest.com/pin/${PIN_ID}/comments/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin visual search path', input: `https://www.pinterest.com/pin/${PIN_ID}/visual-search/?cropSource=6`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin via query parameter ?pin=', input: `https://www.pinterest.com/?pin=${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Pin creation with query parameter ?pin_id=', input: `https://www.pinterest.com/pin-creation/?pin_id=${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Subpaths & Params', name: 'Search pins with ?id=', input: `https://www.pinterest.com/search/pins/?id=${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 6. Idea Pins & Story Pins & Creators
  { category: 'Idea & Story Pins', name: 'Direct idea-pin with ID', input: `https://www.pinterest.com/idea-pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Idea-pin with title slug and ID', input: `https://www.pinterest.com/idea-pin/cybertron-leaders/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Ideas path with slug and ID', input: `https://www.pinterest.com/ideas/cybertron-leaders/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Ideas path direct ID', input: `https://www.pinterest.com/ideas/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Story-pin with ID', input: `https://www.pinterest.com/story-pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Pin creation path with ID', input: `https://www.pinterest.com/pin-creation/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'Idea & Story Pins', name: 'Pin builder path with ID', input: `https://www.pinterest.com/pin-builder/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 7. User & Board Paths
  { category: 'User & Board Paths', name: 'User board with trailing numeric ID', input: `https://www.pinterest.com/optimus_fan/transformers-lore/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'User & Board Paths', name: 'User board with /pin/ segment', input: `https://www.pinterest.com/optimus_fan/transformers-lore/pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },

  // 8. Custom App Schemes & Raw IDs
  { category: 'App Deep Links & Raw IDs', name: 'pinterest:// scheme', input: `pinterest://pin/${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'App Deep Links & Raw IDs', name: 'pinterest:// scheme with trailing slash', input: `pinterest://pin/${PIN_ID}/`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'App Deep Links & Raw IDs', name: 'pinit:// scheme', input: `pinit://pin/${PIN_ID}`, expectedId: PIN_ID, isPin: true, isShort: false },
  { category: 'App Deep Links & Raw IDs', name: 'Raw string pin ID', input: PIN_ID, expectedId: PIN_ID, isPin: false, isShort: false },
  { category: 'App Deep Links & Raw IDs', name: 'Raw numeric pin ID', input: 659073726759755724n.toString(), expectedId: PIN_ID, isPin: false, isShort: false },

  // 9. Short URLs & Redirection
  { category: 'Short URLs', name: 'pin.it short URL HTTPS', input: 'https://pin.it/WyKwAMsAR', expectedId: null, isPin: true, isShort: true, isLiveShort: true },
  { category: 'Short URLs', name: 'pin.it short URL HTTP', input: 'http://pin.it/WyKwAMsAR', expectedId: null, isPin: true, isShort: true, isLiveShort: true },
  { category: 'Short URLs', name: 'pin.it with www', input: 'https://www.pin.it/WyKwAMsAR', expectedId: null, isPin: true, isShort: true, isLiveShort: true },
  { category: 'Short URLs', name: 'Pinterest API url_shortener redirect endpoint', input: 'https://api.pinterest.com/url_shortener/WyKwAMsAR/redirect/', expectedId: null, isPin: true, isShort: true, isLiveShort: true },
  { category: 'Short URLs', name: 'pin.it with query tracking params', input: 'https://pin.it/WyKwAMsAR?sub_id=share_tracking', expectedId: null, isPin: true, isShort: true, isLiveShort: true },

  // 10. Direct CDN Media URLs
  { category: 'Direct CDN URLs', name: 'i.pinimg.com image URL', input: 'https://i.pinimg.com/originals/2d/28/7b/2d287bc2bde4ffefa7965c18834aa308.jpg', expectedId: null, isPin: true, isShort: false },
  { category: 'Direct CDN URLs', name: 'v1.pinimg.com video URL', input: 'https://v1.pinimg.com/videos/mc/720p/95/3f/b0/953fb0c1a480a3cebed8e0051cb1d69a.mp4', expectedId: null, isPin: true, isShort: false },

  // 11. Negative Cases (Non-Pinterest URLs)
  { category: 'Negative Validation', name: 'External Google URL with pin path', input: 'https://google.com/pin/123456789/', expectedId: null, isPin: false, isShort: false },
  { category: 'Negative Validation', name: 'Unrelated domain notpinterest.com', input: 'https://notpinterest.com/pin/123456789/', expectedId: null, isPin: false, isShort: false },
  { category: 'Negative Validation', name: 'Random text input', input: 'hello world from test', expectedId: null, isPin: false, isShort: false }
];

async function runTests() {
  console.log('\x1b[1m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m   pinterest-media-downloader v2.0.0 — Comprehensive URL Test Suite  \x1b[0m');
  console.log('\x1b[1m══════════════════════════════════════════════════════════════════════\x1b[0m\n');

  const suiteStartTime = Date.now();
  const results = [];
  const categoryStats = {};
  let totalPassed = 0;
  let totalFailed = 0;

  for (const test of testDefinitions) {
    const start = Date.now();
    let passed = true;
    let actualId = extractPinId(test.input);
    const actualIsPin = isPinterestUrl(test.input);
    const actualIsShort = isShortUrl(test.input);
    let resolvedUrl = null;

    if (test.expectedId !== undefined && actualId !== test.expectedId) {
      passed = false;
    }
    if (test.isPin !== undefined && actualIsPin !== test.isPin) {
      passed = false;
    }
    if (test.isShort !== undefined && actualIsShort !== test.isShort) {
      passed = false;
    }

    // If it's a live short URL test, resolve it to verify end-to-end resolution
    if (test.isLiveShort && passed) {
      try {
        resolvedUrl = await resolveShortUrl(test.input);
        const resolvedId = extractPinId(resolvedUrl);
        if (resolvedId !== PIN_ID) {
          passed = false;
          actualId = `resolved to wrong ID: ${resolvedId}`;
        } else {
          actualId = resolvedId;
        }
      } catch (err) {
        passed = false;
        actualId = `resolve failed: ${err.message}`;
      }
    }

    const durationMs = Date.now() - start;

    if (passed) {
      totalPassed++;
      console.log(` \x1b[32m✔\x1b[0m [\x1b[36m${test.category}\x1b[0m] ${test.name.padEnd(46)} \x1b[2m(${durationMs}ms)\x1b[0m`);
    } else {
      totalFailed++;
      console.log(` \x1b[31m✖\x1b[0m [\x1b[36m${test.category}\x1b[0m] ${test.name.padEnd(46)} \x1b[31mFAIL\x1b[0m`);
      console.log(`    Input:       ${test.input}`);
      console.log(`    Expected ID: ${test.expectedId}, got: ${actualId}`);
      console.log(`    Expected isPin: ${test.isPin}, got: ${actualIsPin}`);
      console.log(`    Expected isShort: ${test.isShort}, got: ${actualIsShort}`);
    }

    if (!categoryStats[test.category]) {
      categoryStats[test.category] = { total: 0, passed: 0, failed: 0 };
    }
    categoryStats[test.category].total++;
    if (passed) categoryStats[test.category].passed++;
    else categoryStats[test.category].failed++;

    results.push({
      category: test.category,
      name: test.name,
      input: test.input,
      expectedId: test.expectedId,
      actualId,
      isPinterestUrl: actualIsPin,
      isShortUrl: actualIsShort,
      resolvedUrl,
      status: passed ? 'PASS' : 'FAIL',
      durationMs
    });
  }

  // 12. Live End-to-End API Metadata Integration
  console.log('\n\x1b[1m── Live API Integration Test ──────────────────────────────────────────\x1b[0m');
  const liveStart = Date.now();
  let livePassed = false;
  let liveData = null;

  try {
    const pin = await getPin('https://pin.it/WyKwAMsAR');
    if (pin && pin.id === PIN_ID && pin.title && pin.images) {
      livePassed = true;
      liveData = {
        id: pin.id,
        title: pin.title,
        type: pin.type,
        imagesAvailable: Object.keys(pin.images).filter(k => pin.images[k]),
        videosAvailable: pin.videos ? Object.keys(pin.videos) : []
      };
      totalPassed++;
      console.log(` \x1b[32m✔\x1b[0m [Live Integration] getPin("https://pin.it/WyKwAMsAR") -> "${pin.title.substring(0, 45)}..." (${Date.now() - liveStart}ms)`);
    } else {
      totalFailed++;
      console.log(` \x1b[31m✖\x1b[0m [Live Integration] Incomplete pin data returned`);
    }
  } catch (err) {
    totalFailed++;
    console.log(` \x1b[31m✖\x1b[0m [Live Integration] getPin failed: ${err.message}`);
  }

  const liveDuration = Date.now() - liveStart;
  results.push({
    category: 'Live Integration',
    name: 'getPin live resolution and metadata fetch for pin.it/WyKwAMsAR',
    input: 'https://pin.it/WyKwAMsAR',
    expectedId: PIN_ID,
    actualId: liveData?.id || null,
    liveMetadata: liveData,
    status: livePassed ? 'PASS' : 'FAIL',
    durationMs: liveDuration
  });

  categoryStats['Live Integration'] = { total: 1, passed: livePassed ? 1 : 0, failed: livePassed ? 0 : 1 };

  const totalDuration = Date.now() - suiteStartTime;

  console.log('\n\x1b[1m══════════════════════════════════════════════════════════════════════\x1b[0m');
  console.log(`\x1b[1m   RESULTS SUMMARY: \x1b[32m${totalPassed} Passed\x1b[0m, \x1b[${totalFailed > 0 ? '31' : '32'}m${totalFailed} Failed\x1b[0m (${totalPassed + totalFailed} Total, ${totalDuration}ms)`);
  console.log('\x1b[1m══════════════════════════════════════════════════════════════════════\x1b[0m\n');

  // Save all test results to test-results.json
  const jsonReport = {
    testSuite: 'pinterest-media-downloader URL Compatibility Suite',
    version: require('../package.json').version,
    timestamp: new Date().toISOString(),
    summary: {
      total: totalPassed + totalFailed,
      passed: totalPassed,
      failed: totalFailed,
      durationMs: totalDuration,
      allPassed: totalFailed === 0
    },
    categoryStats,
    results
  };

  const outputPath = path.resolve(__dirname, '../test-results.json');
  fs.writeFileSync(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
  console.log(`\x1b[32m✔ Test report successfully saved to:\x1b[0m ${outputPath}`);

  if (totalFailed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('\x1b[31mFatal test error:\x1b[0m', err);
  process.exit(1);
});
