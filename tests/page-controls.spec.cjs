const { test, expect } = require('@playwright/test');

test('postраничные кнопки больше не стандартные белые элементы', async ({page}) => {
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('/');
  await page.locator('[data-go="catalog"]:visible').first().click();
  await expect(page.locator('#bookPageCompanion')).toBeVisible();
  await expect(page.locator('#pageBookUnits .book-page-unit')).toHaveCount(10);
  await expect(page.locator('#pageBookQuick .book-page-number')).toHaveCount(7);
  await page.locator('#bookPage').fill('66');
  await page.locator('#findBookPage').click();
  await expect(page.locator('#pageBookSheet .book-page-lesson').first()).toBeVisible();
  for(const selector of [
    '#pageBookUnits .book-page-unit:first-child',
    '#pageBookQuick .book-page-number:not(.is-current):first-child',
    '#pageBookSheet .book-page-lesson:first-child',
    '#bookPrevPage','#bookNextPage'
  ]){
    const b=page.locator(selector);
    await expect(b).toBeVisible();
    const style=await b.evaluate(el=>{
      const c=getComputedStyle(el),bounds=el.getBoundingClientRect();
      return {
        bg:c.backgroundImage,
        fg:c.color,
        borderRadius:c.borderRadius,
        bounds:{left:bounds.left,right:bounds.right,width:bounds.width},
        text:el.innerText,
        scrollWidth:el.scrollWidth,
        clientWidth:el.clientWidth
      };
    });
    expect(style.bg,selector+' '+JSON.stringify(style)).toContain('gradient');
    expect(parseFloat(style.borderRadius),selector).toBeGreaterThan(10);
    expect(style.bounds.left,selector).toBeGreaterThanOrEqual(-3);
    expect(style.bounds.right,selector).toBeLessThanOrEqual(page.viewportSize().width+3);
    expect(style.scrollWidth-style.clientWidth,selector).toBeLessThanOrEqual(5);
  }
  const active=page.locator('#pageBookQuick .is-current');
  await expect(active).toHaveAttribute('aria-pressed','true');
  expect((await active.evaluate(el=>getComputedStyle(el).backgroundImage))).toContain('gradient');
  expect(errors).toEqual([]);
});

test('страницы и кнопки работают после обновления дизайна', async ({page}) => {
  await page.goto('/');
  await page.locator('[data-go="catalog"]:visible').first().click();
  await page.locator('#bookPage').fill('65');
  await page.locator('#findBookPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 65');
  await page.locator('#bookNextPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 66');
  await page.locator('#bookPrevPage').click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 65');
  await page.locator('#pageBookUnits .book-page-unit').last().click();
  await expect(page.locator('#pageBookSheet')).toContainText('СТРАНИЦА 84');
  await page.locator('#pageBookSheet .book-page-lesson').first().click();
  await expect(page.locator('#lesson')).toHaveClass(/on/);
});
