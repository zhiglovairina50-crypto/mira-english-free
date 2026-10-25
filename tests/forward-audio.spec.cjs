const {test,expect}=require('@playwright/test');

test('Forward 8 official publisher listening links and private audio picker', async ({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.locator('[data-go="catalog"]:visible').first().click();
  const block=page.locator('.mira-forward-audio');
  await expect(block).toBeVisible();
  await expect(block).toContainText('Официальный аудиокурс');
  await expect(block.locator('a.mira-audio-link')).toHaveCount(2);
  await expect(block.locator('a.mira-audio-link').first()).toHaveAttribute('href','https://prosv.ru/product/angliiskii-yazik-audiokurs-8-klass-forward203/');
  await expect(page.locator('#forwardAudioPlayer')).toBeHidden();
  await page.locator('#forwardLocalAudio').setInputFiles({
    name:'forward-unit1.mp3',mimeType:'audio/mpeg',buffer:Buffer.from('audio test payload')
  });
  await expect(page.locator('#forwardAudioPlayer')).toBeVisible();
  await expect(page.locator('#forwardAudioPlayer')).toHaveAttribute('src',/^blob:/);
  await expect(page.locator('#forwardAudioClear')).toBeVisible();
  const box=await block.evaluate(el=>({right:el.getBoundingClientRect().right,left:el.getBoundingClientRect().left,
    win:document.documentElement.clientWidth,
    soundButton:getComputedStyle(el.querySelector('.mira-audio-link')).backgroundImage}));
  expect(box.left).toBeGreaterThanOrEqual(-2);
  expect(box.right).toBeLessThanOrEqual(box.win+3);
  expect(box.soundButton).toContain('gradient');
  await page.locator('#forwardAudioClear').click();
  await expect(page.locator('#forwardAudioPlayer')).toBeHidden();
  expect(errors).toEqual([]);
});

test('do not accept ZIP as a browser audio stream', async ({page})=>{
  await page.goto('/');
  await page.locator('[data-go="catalog"]:visible').first().click();
  await page.locator('#forwardLocalAudio').setInputFiles({
    name:'Forward-8.zip',mimeType:'application/zip',buffer:Buffer.from('test zip')
  });
  await expect(page.locator('#forwardAudioPlayer')).toBeHidden();
  await expect(page.locator('#forwardAudioStatus')).toContainText('распакованный аудиофайл');
});
