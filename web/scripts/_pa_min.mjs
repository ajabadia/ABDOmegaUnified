import { chromium } from 'playwright';

console.log('[1] launch...');
const browser = await chromium.launch({ headless: true, args: ['--disable-gpu', '--no-sandbox'] });
console.log('[2] launched');
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE_ERR:', m.text().slice(0, 200)); });
console.log('[3] goto (domcontentloaded)...');
await page.goto('http://localhost:6789/en/player', { waitUntil: 'domcontentloaded', timeout: 30000 });
console.log('[4] goto ok');
await page.getByRole('button', { name: /START AUDIO WORKLET/ }).waitFor({ timeout: 30000 });
console.log('[5] button visible, count =', await page.getByRole('button', { name: /START AUDIO WORKLET/ }).count());
await browser.close();
console.log('[6] closed - MIN OK');
