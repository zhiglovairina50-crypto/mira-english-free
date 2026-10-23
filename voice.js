/* Device/browser Web Speech only. No keys, fetch, paid API or audio uploads. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id),synth=window.speechSynthesis,Recognizer=window.SpeechRecognition||window.webkitSpeechRecognition;
  const preferences=window.MiraProgress.readSettings();
  let utterances=[],serial=0,recognition=null,dictation=false,starting=false,prefix='',timer;
  const signal=()=>window.dispatchEvent(new CustomEvent('mira:voice'));
  const status=text=>{$('voiceStatus').textContent=text;};
  const dictationStatus=text=>{$('dictationStatus').textContent=text;};
  function stopPlayback(){serial++;utterances=[];try{synth?.cancel();}catch(_){}window.MiraAvatar?.setState('idle');signal();}
  function voices(){try{return synth?.getVoices()||[];}catch(_){return [];}}
  function voiceRank(v){
    const name=(v.name+' '+v.voiceURI).toLowerCase();
    let score=0;
    if(/natural|neural|premium|enhanced|high quality|google|siri/.test(name))score+=12;
    if(/female|woman|женск/.test(name))score+=3;
    if(/robot|espeak|compact/.test(name))score-=8;
    if(v.localService)score+=2;
    return score;
  }
  function selected(lang){const select=$(lang.startsWith('ru')?'voiceRu':'voiceEn'),list=voices();return list.find(v=>v.voiceURI===select.value)||list.filter(v=>v.lang.toLowerCase().startsWith(lang.slice(0,2))).sort((a,b)=>voiceRank(b)-voiceRank(a))[0]||null;}
  function updateVoices(){
    const list=voices(),supported=!!synth&&!!window.SpeechSynthesisUtterance;
    for(const [id,lang]of [['voiceRu','ru'],['voiceEn','en']]){
      const select=$(id),chosen=select.value||preferences[id]||'';select.replaceChildren();
      const automatic=document.createElement('option');automatic.value='';automatic.textContent='Автоматически · '+(lang==='ru'?'русский':'English');select.append(automatic);
      for(const v of list.filter(v=>v.lang.toLowerCase().startsWith(lang)).sort((a,b)=>voiceRank(b)-voiceRank(a))){const o=document.createElement('option');o.value=v.voiceURI;o.textContent=v.name+' · '+v.lang+(v.localService?' · устройство':' · браузер / интернет');select.append(o);}
      if([...select.options].some(o=>o.value===chosen))select.value=chosen;select.disabled=!supported;
    }
    $('testRussian').disabled=!supported;$('testEnglish').disabled=!supported;
    status(!supported?'Этот браузер не поддерживает озвучку. Все уроки доступны текстом.':list.length?'Найдено голосов: '+list.length+'. Голос устройства может работать без интернета; другие зависят от браузера.':'Список голосов пока пуст. Попробуй «Послушать» или проверь установленные языки речи.');signal();
  }
  function savePreferences(){window.MiraProgress.settings({voiceRu:$('voiceRu').value,voiceEn:$('voiceEn').value,rate:Number($('speechRate').value)});}
  function speak(text,options={}){
    if(!synth||!window.SpeechSynthesisUtterance){status('Озвучка недоступна — прочитай текст урока.');return false;}
    stopDictation();stopPlayback();const clean=String(text||'').trim().slice(0,12000);if(!clean)return false;
    const lang=options.lang||(/[А-Яа-яЁё]/.test(clean)?'ru-RU':'en-GB'),voice=selected(lang),current=serial;
    const rate=Number(options.rate)||(lang.startsWith('en')?Number($('speechRate').value):.96);let completed=0;
    utterances=(clean.match(/.{1,180}(?:\s|$)|\S{1,180}/g)||[]).map(part=>{
      const u=new SpeechSynthesisUtterance(part);u.lang=lang;u.rate=Math.max(.5,Math.min(1.3,rate));if(voice)u.voice=voice;
      u.onstart=()=>{if(current!==serial)return;window.MiraAvatar?.setState('speaking');status('Читаю '+(voice?voice.name:lang)+'…');signal();};
      u.onend=()=>{if(current!==serial)return;if(++completed===utterances.length){utterances=[];window.MiraAvatar?.setState('idle');status('Чтение завершено');signal();}};
      u.onerror=e=>{if(current!==serial)return;stopPlayback();status(e.error==='not-allowed'?'Нажми «Послушать» ещё раз: браузер требует нажатие для звука.':'Голос не удалось воспроизвести. Выбери другой голос или читай текст.');};return u;
    });
    try{for(const u of utterances)synth.speak(u);synth.resume();return true;}catch(_){stopPlayback();status('Озвучка не запустилась. Текст урока остаётся доступен.');return false;}
  }
  function resetDictation(){clearTimeout(timer);dictation=false;starting=false;recognition=null;$('dictateStart').hidden=false;$('dictateStop').hidden=true;window.MiraAvatar?.setState('idle');signal();}
  function stopDictation(){const r=recognition;resetDictation();try{r?.abort();}catch(_){}}
  async function startDictation(){
    if(dictation||starting)return;
    if(!Recognizer){dictationStatus('Диктовка здесь недоступна. Введи тему текстом или используй микрофон экранной клавиатуры.');return;}
    if(!$('dictationConsent').checked){dictationStatus('Для диктовки отметь разрешение выше. Поиск работает и без микрофона.');$('dictationConsent').focus();return;}
    stopPlayback();starting=true;let r;
    try{
      r=new Recognizer();recognition=r;r.lang=$('dictationLang').value;r.continuous=false;r.interimResults=true;r.maxAlternatives=1;
      if($('localDictation').checked){
        if(!('processLocally'in r)||typeof Recognizer.available!=='function'){resetDictation();dictationStatus('Локальная диктовка не поддерживается. Используй текст или разрешённый голосовой ввод браузера.');return;}
        const available=await Recognizer.available({langs:[r.lang],processLocally:true});if(recognition!==r)return;
        if(available!=='available'){resetDictation();dictationStatus('Для этого языка нет установленного пакета локальной диктовки. Введи тему текстом.');return;}r.processLocally=true;
      }
      prefix=$('mentorQuestion').value.trim();
      r.onstart=()=>{if(recognition!==r)return;starting=false;dictation=true;$('dictateStart').hidden=true;$('dictateStop').hidden=false;window.MiraAvatar?.setState('listening');dictationStatus('Слушаю тему. После диктовки проверь текст и нажми «Найти объяснение».');signal();};
      r.onresult=e=>{if(recognition!==r)return;let text='';for(let i=0;i<e.results.length;i++)text+=e.results[i][0].transcript+' ';$('mentorQuestion').value=[prefix,text.trim()].filter(Boolean).join(' ').slice(0,700);};
      r.onerror=e=>{if(recognition!==r)return;const errors={'not-allowed':'Доступ к микрофону не разрешён. Можно продолжать текстом.','service-not-allowed':'Служба диктовки браузера недоступна. Используй текст.','audio-capture':'Микрофон не найден. Используй текст.','no-speech':'Речь не распознана. Попробуй ещё раз или напиши тему.','network':'Служба диктовки недоступна по сети. Введи тему текстом.','language-not-supported':'Язык диктовки недоступен. Измени язык или используй текст.'};dictationStatus(errors[e.error]||'Диктовка завершена. Можно исправить тему вручную.');resetDictation();};
      r.onend=()=>{if(recognition!==r)return;resetDictation();dictationStatus('Диктовка завершена. Проверь текст и нажми «Найти объяснение».');};
      r.start();timer=setTimeout(()=>{if(recognition===r){stopDictation();dictationStatus('Диктовка остановлена через минуту. Проверь текст.');}},60000);
    }catch(_){if(recognition===r)resetDictation();dictationStatus('Не удалось запустить диктовку. Используй текст или микрофон клавиатуры телефона.');}
  }
  $('speechRate').value=String(preferences.rate||.9);$('voiceRu').onchange=savePreferences;$('voiceEn').onchange=savePreferences;$('speechRate').onchange=savePreferences;
  $('testRussian').onclick=()=>speak('Привет! Я Мира. Давай спокойно разберёмся с английским.',{lang:'ru-RU'});
  $('testEnglish').onclick=()=>speak('Hello! Let us practise English together. You can learn one step at a time.',{lang:'en-GB'});
  $('stopReply').onclick=stopPlayback;$('dictateStart').onclick=startDictation;$('dictateStop').onclick=()=>{try{recognition?.stop();}catch(_){stopDictation();}};
  window.addEventListener('pagehide',()=>{stopDictation();stopPlayback();});document.addEventListener('visibilitychange',()=>{if(document.hidden){stopDictation();stopPlayback();}});
  if(synth?.addEventListener)synth.addEventListener('voiceschanged',updateVoices);
  updateVoices();dictationStatus(Recognizer?'Браузер предоставляет диктовку. Реальный запуск зависит от микрофона, языка и службы браузера.':'Диктовка в этом браузере недоступна. Используй текст или микрофон экранной клавиатуры.');
  window.MiraVoice={speak,stopPlayback,stopDictation,updateVoices,get active(){return dictation||starting;},capabilities(){return {synthesis:!!synth&&!!window.SpeechSynthesisUtterance,voices:voices().length,dictation:!!Recognizer};}};
})();
