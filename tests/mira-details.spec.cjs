const { test,expect } = require('@playwright/test');

test('Мира видна в учебных разделах и маленькие портреты не обрезают экран', async ({page}) => {
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.goto('/');
  for(const id of ['diagnostic','foundation','catalog','unit','reading','homework','parent']){
    const portrait=page.locator('#'+id+' .mira-page-greeting img');
    await expect(portrait).toHaveCount(1);
    await expect(portrait).toHaveAttribute('src','assets/mira-0.webp');
    await expect(page.locator('#'+id+' .mira-hair-twinkle')).toHaveCount(3);
  }
  await expect(page.locator('#home canvas[data-mira-avatar]')).toHaveCount(1);
  await expect(page.locator('#lesson canvas[data-mira-avatar]')).toHaveCount(1);
  await expect(page.locator('#mentor canvas[data-mira-avatar]')).toHaveCount(1);
  await page.locator('[data-go="catalog"]:visible').first().click();
  const el=await page.locator('#catalog .mira-page-greeting').evaluate(node=>({right:node.getBoundingClientRect().right,bodyWidth:document.documentElement.clientWidth}));
  expect(el.right).toBeLessThanOrEqual(el.bodyWidth+2);
  expect(errors).toEqual([]);
});

test('записать — остановить — прослушать и скачать (имитация микрофона)', async ({page}) => {
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
      getUserMedia:async()=>({getTracks:()=>[{stop(){}}]})
    }});
    class FakeRecorder {
      static isTypeSupported(type){return type.includes('mp4');}
      constructor(stream,options){this.stream=stream;this.mimeType=options?.mimeType||'audio/mp4';this.state='inactive';}
      start(){this.state='recording';}
      stop(){
        this.state='inactive';
        this.ondataavailable?.({data:new Blob(['test audio payload'],{type:'audio/mp4'})});
        this.onstop?.();
      }
    }
    Object.defineProperty(window,'MediaRecorder',{configurable:true,value:FakeRecorder});
  });
  await page.goto('/');
  await page.locator('[data-go="mentor"]:visible').first().click();
  await expect(page.locator('#recordStart')).toBeVisible();
  await page.locator('#recordStart').click();
  await expect(page.locator('#recordStop')).toBeVisible();
  await expect(page.locator('#recordStatus')).toContainText('Запись идёт');
  await page.locator('#recordStop').click();
  await expect(page.locator('#recordPlayback')).toBeVisible();
  await expect(page.locator('#recordDownload')).toBeVisible();
  await expect(page.locator('#recordDownload')).toHaveAttribute('download',/\.m4a$/);
  expect(errors).toEqual([]);
});

test('при отсутствии распознавания кнопка диктовки помогает перейти к клавиатуре', async ({page}) => {
  const errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.addInitScript(()=>{
    Object.defineProperty(window,'SpeechRecognition',{configurable:true,value:undefined});
    Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,value:undefined});
  });
  await page.goto('/');
  await page.locator('[data-go="mentor"]:visible').first().click();
  await expect(page.locator('#dictateStart')).toContainText('клавиатуру');
  await page.locator('#dictateStart').click();
  await expect(page.locator('#mentorQuestion')).toBeFocused();
  await expect(page.locator('#dictationStatus')).toContainText('микрофона на клавиатуре');
  expect(errors).toEqual([]);
});
