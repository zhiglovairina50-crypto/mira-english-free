const { defineConfig, devices } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  timeout: 30000,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8765/',
    trace: 'retain-on-failure'
  },
  projects: [
    { name: 'desktop-chromium', use: { ...devices['Desktop Chrome'], viewport: {width:1280,height:900} } },
    { name: 'mobile-chromium-390', use: { ...devices['Pixel 7'], viewport: {width:390,height:844} } },
    { name: 'mobile-chromium-320', use: { ...devices['Desktop Chrome'], viewport: {width:320,height:720}, isMobile:true, hasTouch:true } }
  ],
  webServer: {
    command: 'python3 -m http.server 8765 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8765/',
    reuseExistingServer: !process.env.CI,
    timeout: 15000
  }
});
