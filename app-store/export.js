// Saves each slide in slides.html as a PNG at Apple's iPhone sizes.
// Usage: node export.js   (writes to export/<size>/NN-name.png)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const NAMES = ['find-a-game', 'spare-space', 'club-opens', 'my-season', 'group-chat', 'golfers'];
// 6.9 inch is the one Apple requires; it scales the rest down from it. 6.5 inch is kept for older listings.
const SIZES = [
  { label: '6.9in', w: 1320, h: 2868 },
  { label: '6.5in', w: 1284, h: 2778 },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1400, height: 3000 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'slides.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const base = path.join(__dirname, 'export', SIZES[0].label);
  fs.mkdirSync(base, { recursive: true });
  for (let i = 0; i < NAMES.length; i++) {
    const file = path.join(base, `${String(i + 1).padStart(2, '0')}-${NAMES[i]}.png`);
    await page.locator(`#s${i + 1}`).screenshot({ path: file });
    console.log('saved', path.relative(__dirname, file));
  }
  await browser.close();
})();
