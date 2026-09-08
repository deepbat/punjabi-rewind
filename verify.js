const { chromium } = require('@playwright/test');
(async () => {
  const p = require('child_process').spawn('python', ['-m', 'http.server', '8123'], { detached: true, stdio: ['ignore', 'ignore', 'ignore'] });
  setTimeout(async () => {
    const b = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
    await pg.goto('http://localhost:8123', { waitUntil: 'networkidle' });
    await pg.waitForTimeout(700);
    await pg.screenshot({ path: 'preview.png', fullPage: false });
    const t = await pg.title();
    console.log('TITLE', t);
    console.log('SIZE', require('fs').readFileSync('preview.png').length);
    await b.close();
  }, 1400);
})();
