const { test, expect } = require('@playwright/test');

function watchErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}
async function fakeVoice(page) {
  await page.addInitScript(() => {
    window.__miraSpoken = [];
    const available = [
      { name: 'Natural English', lang: 'en-GB', voiceURI: 'test-natural-en', localService: true },
      { name: 'Мира — проверка русского', lang: 'ru-RU', voiceURI: 'test-ru', localService: true }
    ];
    const synth = {
      getVoices: () => available,
      cancel() {},
      pause() {},
      resume() {},
      addEventListener() {},
      speak(item) {
        window.__miraSpoken.push({ text: item.text, lang: item.lang });
        Promise.resolve().then(() => { item.onstart?.(); item.onend?.(); });
      }
    };
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
    if (!window.SpeechSynthesisUtterance) window.SpeechSynthesisUtterance = class {
      constructor(text) { this.text = text; }
    };
    class FakeSpeechRecognition {
      constructor() { this.continuous = false; this.interimResults = false; }
      start() {
        this.onstart?.();
        Promise.resolve().then(() => {
          this.onresult?.({results: [[{transcript:'Present Simple'}]]});
          this.onend?.();
        });
      }
      stop() { this.onend?.(); }
      abort() { this.onend?.(); }
    }
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: FakeSpeechRecognition });
  });
}

test('главное меню, уроки, вопросы, чтение и кнопки', async ({ page }) => {
  await fakeVoice(page);
  const errors = watchErrors(page);
  await page.goto('/');
  await expect(page.locator('#home')).toHaveClass(/on/);
  await page.locator('[data-go="catalog"]').first().click();
  await expect(page.locator('#catalog')).toHaveClass(/on/);
  await expect(page.locator('#unitsGrid [data-open-unit]')).toHaveCount(10);
  await page.locator('#unitsGrid [data-open-unit]').first().click();
  await expect(page.locator('#unit')).toHaveClass(/on/);
  await page.locator('#unitHost [data-open-lesson]').first().click();
  await expect(page.locator('#lesson')).toHaveClass(/on/);
  await expect(page.locator('#sayExample')).toBeVisible();
  await expect(page.locator('#sayRule')).toBeVisible();
  await page.locator('#sayExample').click();
  await page.locator('#sayRule').click();
  const spoken = await page.evaluate(() => window.__miraSpoken);
  expect(spoken.some(s => s.lang.startsWith('en'))).toBeTruthy();
  expect(spoken.some(s => s.lang.startsWith('ru'))).toBeTruthy();
  await page.locator('#lessonHost [data-choose]').first().click();
  await expect(page.locator('#nextTask')).toBeVisible();
  await page.locator('#nextTask').click();
  await page.locator('[data-go="reading"]').first().click();
  await expect(page.locator('#reading')).toHaveClass(/on/);
  await page.locator('#readGrid [data-open-read]').first().click();
  await expect(page.locator('#readAloud')).toBeVisible();
  await page.locator('#readAloud').click();
  await page.locator('#readHost [data-read-choice]').first().click();
  await expect(page.locator('#readHost .notice')).toBeVisible();
  expect(errors).toEqual([]);
});

test('страницы 1–140, навигация, упражнения из тематических уроков', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-go="catalog"]').first().click();
  await page.locator('#bookPage').fill('47');
  await page.locator('#findBookPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 47');
  await expect(page.locator('#pageBookSheet')).toContainText('Точные упражнения');
  await expect(page.locator('#pageBookSheet .book-page-lesson').first()).toBeVisible();
  await page.locator('#bookNextPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 48');
  await page.locator('#bookPrevPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 47');
  await page.locator('#bookPage').fill('140');
  await page.locator('#findBookPage').click();
  await expect(page.locator('#bookNextPage')).toBeDisabled();
  await page.locator('#bookPage').fill('1');
  await page.locator('#findBookPage').click();
  await expect(page.locator('#bookPrevPage')).toBeDisabled();
  await page.locator('#bookPage').fill('47');
  await page.locator('#findBookPage').click();
  await page.locator('#pageBookSheet .book-page-lesson').first().click();
  await expect(page.locator('#lesson')).toHaveClass(/on/);
  expect(errors).toEqual([]);
});

test('голоса, диктовка и поиск без платного API', async ({ page }) => {
  await fakeVoice(page);
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-go="mentor"]').first().click();
  await expect(page.locator('#mentor')).toHaveClass(/on/);
  await page.locator('#testRussian').click();
  await page.locator('#testEnglish').click();
  await page.locator('#stopReply').click();
  expect((await page.evaluate(() => window.__miraSpoken)).length).toBeGreaterThanOrEqual(2);
  await page.locator('#dictationConsent').check();
  await page.locator('#dictateStart').click();
  await expect(page.locator('#mentorQuestion')).toHaveValue(/Present Simple/);
  await page.locator('#mentorForm button[type="submit"]').click();
  await expect(page.locator('#mentorResults')).toContainText('уроки', { ignoreCase:true });
  expect(errors).toEqual([]);
});

test('резервная копия прогресса и мобильная ширина кнопок', async ({ page }) => {
  const errors = watchErrors(page);
  await page.goto('/');
  await page.locator('[data-go="parent"]').first().click();
  const download = page.waitForEvent('download');
  await page.locator('#exportProgress').click();
  const file = await download;
  expect(file.suggestedFilename()).toMatch(/^MIRA_English_Progress_.*\.json$/);
  await page.locator('#checkDevice').click();
  await expect(page.locator('#deviceStatus')).toContainText('HTTPS');
  await page.locator('[data-go="mentor"]').first().click();
  for (const id of ['#testRussian','#testEnglish','#dictateStart']) {
    const result = await page.locator(id).evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {scroll: el.scrollWidth, client: el.clientWidth, left:rect.left, right:rect.right};
    });
    expect(result.scroll - result.client).toBeLessThanOrEqual(4);
    expect(result.left).toBeGreaterThanOrEqual(-2);
    expect(result.right).toBeLessThanOrEqual(page.viewportSize().width + 2);
  }
  await page.locator('[data-go="catalog"]').first().click();
  await page.locator('#unitsGrid [data-open-unit]').first().click();
  await page.locator('#unitHost [data-open-lesson]').first().click();
  for (const id of ['#sayExample','#sayRule']) {
    const result = await page.locator(id).evaluate(el => {
      const rect = el.getBoundingClientRect();
      return {scroll: el.scrollWidth, client: el.clientWidth, left:rect.left, right:rect.right};
    });
    expect(result.scroll - result.client).toBeLessThanOrEqual(4);
    expect(result.left).toBeGreaterThanOrEqual(-2);
    expect(result.right).toBeLessThanOrEqual(page.viewportSize().width + 2);
  }
  expect(errors).toEqual([]);
});
