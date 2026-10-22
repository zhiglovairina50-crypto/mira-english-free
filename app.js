/* Existing MIRA course, free static edition. Local records; no server or AI. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),store=window.MiraProgress,learning=window.MiraLearning;
  const course=learning.catalog(),lessons=[...course.foundation,...course.units.flatMap(u=>u.lessons)];
  store.configure(lessons.map(l=>l.id));
  let restoring=false,toastTimer,installPrompt=null,registration=null,pendingImport=null,lastSaved='';
  function toast(text){$('appToast').textContent=text;$('appToast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('appToast').hidden=true;},6500);}
  function snapshot(){const v=learning.snapshot();v.textbook=$('textbookEdition').value;v.reduceMotion=$('reduceMotion').checked;return store.normalize(v);}
  function restore(value){restoring=true;try{const v=store.normalize(value);$('textbookEdition').value=v.textbook;$('reduceMotion').checked=v.reduceMotion;document.body.classList.toggle('reduce-motion',v.reduceMotion);learning.restore(v);}finally{restoring=false;}}
  function save(options){
    if(restoring)return;
    const v=snapshot(),comparable=JSON.stringify({...v,position:{...v.position,updatedAt:0}});
    if(comparable===lastSaved&&!options?.replace)return;
    const result=store.save(v,options);$('profileStatus').textContent=result.message;lastSaved=result.ok?comparable:'';
    if(JSON.stringify(result.state.done)!==JSON.stringify(v.done)||result.state.answers.length!==v.answers.length)restore(result.state);
    return result;
  }
  function download(){const blob=new Blob([store.backup(snapshot())],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='MIRA_English_Progress_'+new Date().toISOString().slice(0,10)+'.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);$('backupStatus').textContent='Копия подготовлена. Сохрани JSON-файл в «Загрузки» / «Файлы». Для переноса выбери его в Мире на другом устройстве.';}
  function preview(state,description){pendingImport=store.normalize(state);$('importSummary').textContent=description+' Уроков: '+pendingImport.done.length+', текстов: '+pendingImport.read.length+', ответов: '+pendingImport.answers.length+'. Текущие результаты ещё не изменены.';$('importPreview').hidden=false;$('importPreview').scrollIntoView({block:'nearest'});}
  function applyImport(replace){if(!pendingImport)return;if(replace&&!confirm('Заменить текущие результаты выбранной копией? Для сохранения обеих историй нажми «Отмена» и выбери «Объединить».'))return;const value=replace?pendingImport:store.merge(snapshot(),pendingImport);restore(value);lastSaved='';const result=save({replace:true});pendingImport=null;$('importPreview').hidden=true;$('importProgress').value='';const message=result?.ok?'Прогресс перенесён и сохранён на этом устройстве.':(result?.message||'Прогресс загружен в эту вкладку. Скачай копию перед закрытием.');$('backupStatus').textContent=message;toast(message);}
  const normalized=text=>String(text).normalize('NFKC').toLowerCase().replace(/ё/g,'е').replace(/[^\p{L}\p{N}]+/gu,' ').trim();
  function search(query){
    window.MiraVoice.stopDictation();const host=$('mentorResults');host.replaceChildren();const q=normalized(query);if(!q)return;
    const match=query.match(/(?:страниц[аеуы]?|стр\.?|page)\s*(\d{1,3})/i);
    if(match){const b=document.createElement('button');b.className='btn primary';b.textContent='Открыть карту страницы '+Number(match[1]);b.onclick=()=>learning.openPage(Number(match[1]));host.append(b);return;}
    const aliases=[[/перфект|завершенн|уже сделал/,'present perfect'],[/прошедш|вчера/,'past simple'],[/будущ|собираюсь/,'going to'],[/пассив|страдательн/,'passive'],[/друг|письм/,'пишем письмо'],[/вопрос/,'do does вопросы'],[/сейчас|настоящ/,'present continuous']];
    let words=q.split(' ').filter(w=>w.length>1);for(const [pattern,extra]of aliases)if(pattern.test(q))words.push(...extra.split(' '));words=[...new Set(words)];
    const found=lessons.map(l=>{const title=normalized(l.title),body=normalized([l.rule,l.tip,l.example].join(' '));return {l,score:(title.includes(q)?20:0)+words.reduce((n,w)=>n+(title.includes(w)?5:body.includes(w)?1:0),0)};}).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,6);
    const note=document.createElement('p');note.className='small';note.textContent=found.length?'Подходящие готовые уроки. Это поиск по курсу, без свободного ИИ-ответа.':'Урок по этой формулировке не найден. Попробуй название времени или выбери тему в каталоге. Свободного ИИ-чата здесь нет.';host.append(note);
    for(const {l}of found){const b=document.createElement('button');b.className='listrow';const title=document.createElement('b');title.textContent=l.title;const text=document.createElement('span');text.textContent=(l.unit<0?'Повторение основ':'Unit '+(l.unit+1))+' · '+l.questions.length+' задания';b.append(title,text);b.onclick=()=>learning.openLesson(l.id);host.append(b);}
  }
  function checkDevice(){const c=window.MiraVoice.capabilities();let local=false;try{const k='mira.check.storage';localStorage.setItem(k,'ok');local=localStorage.getItem(k)==='ok';localStorage.removeItem(k);}catch(_){}$('deviceStatus').textContent=['HTTPS: '+(window.isSecureContext?'доступен':'нужна HTTPS-ссылка'),'Сохранение в браузере: '+(local?'доступно':'недоступно — скачивай копии'),'Озвучка: '+(c.synthesis?'API доступен, голосов '+c.voices:'недоступна'),'Диктовка: '+(c.dictation?'API доступен; микрофон и служба проверяются при запуске':'недоступна — используй текст'),'Офлайн-копия: '+(navigator.serviceWorker?.controller?'управляется установленным service worker':'пока не подтверждена')].join(' · ')+'. Наличие API не подтверждает слышимый звук или распознанную речь.';}
  window.Mira={toast,speak:(text,options)=>window.MiraVoice.speak(text,options),save};
  restore(store.load());$('profileStatus').textContent=store.warning||'Результаты этого браузера загружены. Скачивай копию для резервирования и переноса.';
  window.addEventListener('mira:progress',()=>save());$('textbookEdition').oninput=()=>save();$('reduceMotion').onchange=()=>{document.body.classList.toggle('reduce-motion',$('reduceMotion').checked);save();};
  $('exportProgress').onclick=download;
  $('importProgress').onchange=async()=>{const f=$('importProgress').files[0];if(!f)return;try{if(f.size>2000000)throw new Error('Нужна JSON-копия до 2 МБ.');const d=store.parseBackup(await f.text());preview(d.progress,'Выбрана копия'+(d.exportedAt?' от '+d.exportedAt.slice(0,10):'')+'.');}catch(e){$('backupStatus').textContent=e.message;$('importProgress').value='';}};
  $('restoreLocalBackup').onclick=()=>{try{preview(store.previous(),'Выбрано предыдущее локальное сохранение.');}catch(e){toast(e.message);}};
  $('importMerge').onclick=()=>applyImport(false);$('importReplace').onclick=()=>applyImport(true);$('importCancel').onclick=()=>{pendingImport=null;$('importPreview').hidden=true;$('importProgress').value='';};
  $('deleteProgress').onclick=()=>{if(!confirm('Очистить все учебные результаты в этом браузере? Сначала скачай копию, если хочешь сохранить их. Другие устройства не изменятся.'))return;try{const r=store.reset();restore(r.state);lastSaved='';$('profileStatus').textContent=r.message;toast('Результаты на этом устройстве очищены.');}catch(e){toast(e.message);}};
  $('mentorForm').onsubmit=e=>{e.preventDefault();search($('mentorQuestion').value);};
  $('collapseMira').onclick=()=>{const p=$('collapseMira').closest('aside');p.classList.toggle('collapsed');$('collapseMira').textContent=p.classList.contains('collapsed')?'Показать Миру':'Свернуть Миру';};
  $('printReport').onclick=()=>window.print();$('checkDevice').onclick=checkDevice;
  document.addEventListener('click',e=>{if(e.target.closest('[data-go],[data-open-unit],[data-open-lesson],[data-open-read]')){window.MiraVoice.stopDictation();window.MiraVoice.stopPlayback();}});
  window.addEventListener('storage',e=>{if(e.key!==store.key||!e.newValue)return;try{restore(store.merge(snapshot(),store.parseBackup(e.newValue).progress));lastSaved='';$('profileStatus').textContent='Учтены результаты другой вкладки этого браузера.';}catch(_){}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)save();});window.addEventListener('pagehide',()=>save());
  window.addEventListener('offline',()=>toast('Интернета нет. Загруженные уроки и локальный прогресс доступны. Диктовка и некоторые голоса могут требовать сеть.'));
  window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;$('installApp').textContent='Установить MIRA';});
  $('installApp').onclick=async()=>{if(installPrompt){await installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;}else toast('iPhone: Safari → «Поделиться» → «На экран Домой». Windows / Android: меню браузера → «Установить приложение».');};
  window.addEventListener('appinstalled',()=>{$('installHelp').textContent='MIRA установлена. Прогресс хранится в браузере установки; резервируй его через JSON-файл.';});
  if('serviceWorker'in navigator&&window.isSecureContext){navigator.serviceWorker.register('./sw.js',{scope:'./'}).then(r=>{registration=r;const waiting=()=>{if(r.waiting)$('updateApp').hidden=false;};waiting();r.addEventListener('updatefound',()=>r.installing?.addEventListener('statechange',waiting));checkDevice();}).catch(()=>{$('deviceStatus').textContent='Офлайн-копию подготовить не удалось. Онлайн-уроки и локальное сохранение доступны.';});let refreshing=false;navigator.serviceWorker.addEventListener('controllerchange',()=>{if(refreshing)return;refreshing=true;location.reload();});}
  $('updateApp').onclick=()=>{save();registration?.waiting?.postMessage({type:'MIRA_SKIP_WAITING'});};checkDevice();
})();
