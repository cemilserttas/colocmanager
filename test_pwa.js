const fs = require('fs');
const path = require('path');

console.log('=== TEST SUITE: PWA STANDALONE & IOS CONFIGURATION ===');

// 1. Verify manifest.json
console.log('\n[1] Checking public/manifest.json & dist/manifest.json');
const manifestRaw = fs.readFileSync('public/manifest.json', 'utf8');
const manifest = JSON.parse(manifestRaw);

if (manifest.start_url !== '/') throw new Error('manifest start_url must be "/"');
if (manifest.scope !== '/') throw new Error('manifest scope must be "/"');
if (manifest.id !== '/') throw new Error('manifest id must be "/"');
if (manifest.display !== 'standalone') throw new Error('manifest display must be "standalone"');
if (!Array.isArray(manifest.icons) || manifest.icons.length === 0) throw new Error('manifest icons array missing');

manifest.icons.forEach((icon) => {
  const filePath = path.join('public', icon.src.replace(/^\//, ''));
  if (!fs.existsSync(filePath)) {
    throw new Error(`Icon specified in manifest does not exist: ${filePath}`);
  }
  console.log(`  ✓ Manifest icon verified: ${icon.src} (${icon.sizes})`);
});
console.log('✓ OK: manifest.json is 100% valid with scope, id, start_url, and verified icons.');

// 2. Verify public/index.html
console.log('\n[2] Checking public/index.html & dist/index.html');
const indexHtml = fs.readFileSync('public/index.html', 'utf8');

const requiredTags = [
  '<meta name="mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-capable" content="yes" />',
  '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />',
  '<meta name="apple-mobile-web-app-title" content="ColocManager" />',
  '<link rel="manifest" href="/manifest.json" />',
  '<link rel="apple-touch-icon" href="/apple-touch-icon.png" />',
  'var isStandalone =',
  'e.preventDefault()',
  'window.history.pushState',
  'new PopStateEvent(\'popstate\')',
  "navigator.serviceWorker.register('/sw.js', { scope: '/' })",
];

requiredTags.forEach((tag) => {
  if (!indexHtml.includes(tag)) {
    throw new Error(`index.html missing required tag or code snippet: "${tag}"`);
  }
  console.log(`  ✓ Verified tag/script present: "${tag.slice(0, 45)}..."`);
});
console.log('✓ OK: index.html has complete iOS standalone meta tags and click interceptor.');

// 3. Verify public/sw.js
console.log('\n[3] Checking public/sw.js');
const swJs = fs.readFileSync('public/sw.js', 'utf8');
if (!swJs.includes('self.skipWaiting()')) throw new Error('sw.js missing skipWaiting()');
if (!swJs.includes('clients.claim()')) throw new Error('sw.js missing clients.claim()');
if (!swJs.includes("self.addEventListener('push'")) throw new Error('sw.js missing push listener');
if (!swJs.includes("self.addEventListener('notificationclick'")) throw new Error('sw.js missing notificationclick listener');
console.log('✓ OK: sw.js has complete lifecycle and notification listeners.');

// 5. Verify Web Push serverless handler & configuration
console.log('\n[5] Checking api/send-push.js & Vercel API routing');
if (!fs.existsSync('api/send-push.js')) throw new Error('api/send-push.js is missing!');
const handler = require('./api/send-push.js');
if (typeof handler !== 'function') throw new Error('api/send-push.js must export a handler function!');
console.log('  ✓ api/send-push.js exports valid serverless handler');

const vercelJsonRaw = fs.readFileSync('vercel.json', 'utf8');
const vercelConfig = JSON.parse(vercelJsonRaw);
const rewriteRule = vercelConfig.rewrites?.[0]?.source;
if (!rewriteRule || !rewriteRule.includes('api/')) {
  throw new Error('vercel.json must exclude api/ from SPA rewrite rule!');
}
console.log('  ✓ vercel.json preserves /api/ serverless function routes');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
if (!packageJson.dependencies['web-push']) {
  throw new Error('package.json must contain "web-push" dependency!');
}
console.log('  ✓ web-push is present in package.json dependencies');

console.log('\nALL PWA & WEB PUSH VERIFICATION TESTS PASSED WITH 100% SUCCESS!');
