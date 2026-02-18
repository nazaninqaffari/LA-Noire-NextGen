const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  
  page.on('request', req => {
    if (req.url().includes('accounts')) {
      console.log('REQUEST:', req.method(), req.url());
    }
  });
  page.on('response', res => {
    if (res.url().includes('accounts')) {
      console.log('RESPONSE:', res.status(), res.url());
    }
  });
  
  await page.goto('http://localhost:3000/register');
  await page.waitForLoadState('networkidle');
  
  await page.fill('#first_name', 'Test');
  await page.fill('#last_name', 'User');
  await page.fill('#national_id', '12345678TEST');
  await page.fill('#email', 'test_debug@lapd.gov');
  await page.fill('#phone_number', '5559999999');
  await page.fill('#username', 'debuguser_' + Date.now());
  await page.fill('#password', 'TestPass123!');
  await page.fill('#confirm_password', 'TestPass123!');
  
  await page.click('button[type="submit"]');
  await page.waitForTimeout(5000);
  
  // Check for notification
  const notifs = await page.locator('.notification').count();
  console.log('NOTIFICATIONS:', notifs);
  if (notifs > 0) {
    const text = await page.locator('.notification').first().textContent();
    console.log('NOTIFICATION TEXT:', text);
  }
  
  await browser.close();
})().catch(e => console.error(e));
