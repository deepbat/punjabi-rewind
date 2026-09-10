const { chromium } = require('@playwright/test');
(async () => {
  const b = await chromium.launch({ args:['--no-sandbox','--disable-dev-shm-usage'] });
  const pg = await b.newPage({ viewport:{ width:1440, height:900 } });
  await pg.goto('http://localhost:8123', { waitUntil:'networkidle' });
  await pg.waitForTimeout(600);
  await pg.click('#taskbarStartBtn'); await pg.waitForTimeout(380);
  await pg.screenshot({ path:'preview.png', fullPage:false });
  await pg.click('#taskbarStartBtn'); await pg.waitForTimeout(180);
  await pg.click('#trayQuickBtn'); await pg.waitForTimeout(360);
  await pg.screenshot({ path:'qs.png', fullPage:false });
  const st = await pg.evaluate(()=>document.getElementById('startMenu').getAttribute('aria-hidden'));
  const qs = await pg.evaluate(()=>document.getElementById('quickSettings').getAttribute('aria-hidden'));
  const qsH = await pg.evaluate(()=>document.getElementById('quickSettings').offsetHeight);
  console.log('START', st, 'QS', qs, 'QS_H', qsH);
  await b.close();
})().catch(e => { console.error(e.message); process.exit(1); });
