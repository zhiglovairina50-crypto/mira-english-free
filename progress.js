/* Validated local progress and explicit JSON transfer. No network. */
(() => {
  'use strict';
  const KEY='mira.english.free.progress.v1',PREVIOUS=KEY+'.previous',SETTINGS='mira.english.free.settings.v1',COURSE='forward8-independent-v1';
  const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
  const integer=(v,min,max,fallback=min)=>Number.isInteger(v)&&v>=min&&v<=max?v:fallback;
  const stamp=v=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=Date.now()+86400000?v:0;
  const pages=['home','catalog','foundation','unit','lesson','reading','diagnostic','homework','mentor','parent'];
  let lessonIds=null,memory=null,blocked=false,reason='',revision=0;
  const validId=v=>typeof v==='string'&&/^(base[1-4]|u(?:[1-9]|10)l[1-9])$/.test(v)&&(!lessonIds||lessonIds.has(v));
  function normalize(input){
    const v=object(input)?input:{},p=object(v.position)?v.position:{};
    const answers=(Array.isArray(v.answers)?v.answers:[]).filter(x=>object(x)&&validId(x.id)&&typeof x.ok==='boolean'&&Number.isInteger(x.unit)&&x.unit>=-1&&x.unit<=9).slice(-1500).map(x=>({id:x.id,unit:x.unit,ok:x.ok,hint:x.hint===true,at:stamp(x.at)}));
    const diagnostics=(Array.isArray(v.diagnostics)?v.diagnostics:[]).filter(x=>object(x)&&object(x.unitHits)&&Number.isInteger(x.total)&&x.total>0&&x.total<=20).slice(-100).map(x=>{const unitHits={};for(let i=-1;i<10;i++){const h=x.unitHits[String(i)];if(object(h)){const total=integer(h.total,0,20);unitHits[String(i)]={total,ok:integer(h.ok,0,total)};}}return {score:integer(x.score,0,x.total),total:x.total,unitHits,at:stamp(x.at)};});
    return {answers,diagnostics,done:[...new Set((Array.isArray(v.done)?v.done:[]).filter(validId))],read:[...new Set((Array.isArray(v.read)?v.read:[]).filter(x=>Number.isInteger(x)&&x>=0&&x<10))],seconds:typeof v.seconds==='number'&&Number.isFinite(v.seconds)?Math.max(0,Math.min(315360000,Math.floor(v.seconds))):0,textbook:typeof v.textbook==='string'?v.textbook.slice(0,200):'',reduceMotion:v.reduceMotion===true,
      position:{page:pages.includes(p.page)?p.page:'home',unitIndex:integer(p.unitIndex,0,9),lessonId:validId(p.lessonId)?p.lessonId:'',step:integer(p.step,0,50),readIndex:integer(p.readIndex,-1,9,-1),quizChosen:integer(p.quizChosen,0,2,null),quizDone:p.quizDone===true,hintShown:p.hintShown===true,readChosen:integer(p.readChosen,0,2,null),readDone:p.readDone===true,diagIndex:integer(p.diagIndex,0,20),diagChoice:integer(p.diagChoice,0,2,null),diagRevealed:p.diagRevealed===true,diagRun:(Array.isArray(p.diagRun)?p.diagRun:[]).slice(0,20).map(x=>x===true),updatedAt:stamp(p.updatedAt)}};
  }
  function merge(left,right){const a=normalize(left),b=normalize(right);const unique=(items,key)=>[...new Map(items.map(x=>[key(x),x])).values()];return normalize({...a,...b,done:[...new Set([...a.done,...b.done])],read:[...new Set([...a.read,...b.read])],answers:unique([...a.answers,...b.answers],x=>[x.id,x.unit,x.at,x.ok,x.hint].join(':')).sort((x,y)=>x.at-y.at).slice(-1500),diagnostics:unique([...a.diagnostics,...b.diagnostics],x=>JSON.stringify(x)).sort((x,y)=>x.at-y.at).slice(-100),seconds:Math.max(a.seconds,b.seconds),position:a.position.updatedAt>b.position.updatedAt?a.position:b.position});}
  function parseEnvelope(text,legacyAllowed=false){
    if(typeof text!=='string'||text.length>2000000)throw new Error('Нужна JSON-копия до 2 МБ.');
    let d;try{d=JSON.parse(text);}catch(_){throw new Error('Файл повреждён или не является JSON. Прогресс не изменён.');}
    if(!object(d))throw new Error('В файле нет копии прогресса MIRA.');
    const current=d.format==='mira-english-progress'&&d.courseId===COURSE,legacy=legacyAllowed&&typeof d.app==='string'&&d.app.startsWith('MIRA English')&&object(d.progress);
    if(!current&&!legacy)throw new Error('Это не поддерживаемая копия MIRA English.');
    if(current&&d.schemaVersion!==1)throw new Error('Версия копии не поддерживается. Прогресс не изменён.');
    if(!object(d.progress)||!['done','answers','read','diagnostics'].every(k=>Array.isArray(d.progress[k])))throw new Error('В копии отсутствуют учебные результаты.');
    return {progress:normalize(d.progress),revision:integer(d.revision,0,Number.MAX_SAFE_INTEGER),exportedAt:typeof d.exportedAt==='string'?d.exportedAt.slice(0,40):''};
  }
  function envelope(progress){return {format:'mira-english-progress',schemaVersion:1,courseId:COURSE,revision,exportedAt:new Date().toISOString(),progress:normalize(progress)};}
  function load(){if(memory)return normalize(memory);try{const raw=localStorage.getItem(KEY);if(raw){const v=parseEnvelope(raw);memory=v.progress;revision=v.revision;}}catch(_){blocked=true;reason='Сохранение прочитать не удалось. Оно не перезаписано. Выбери резервную копию или скачай результаты текущего занятия.';}memory=normalize(memory);return normalize(memory);}
  function save(value,{replace=false}={}){memory=normalize(value);if(blocked&&!replace)return {ok:false,state:normalize(memory),message:reason};try{const raw=localStorage.getItem(KEY);if(raw){let remote;try{remote=parseEnvelope(raw);}catch(error){if(!replace)throw error;}if(remote){if(remote.revision>revision&&!replace)memory=merge(remote.progress,memory);revision=Math.max(revision,remote.revision);}localStorage.setItem(PREVIOUS,raw);}revision++;localStorage.setItem(KEY,JSON.stringify(envelope(memory)));blocked=false;reason='';return {ok:true,state:normalize(memory),message:'Прогресс сохранён на этом устройстве. Для другого устройства скачай копию.'};}catch(_){reason='Браузер не сохранил изменения. Не закрывай занятие: скачай копию прогресса.';return {ok:false,state:normalize(memory),message:reason};}}
  function previous(){try{const raw=localStorage.getItem(PREVIOUS);if(!raw)throw new Error();return parseEnvelope(raw).progress;}catch(_){throw new Error('Предыдущее сохранение недоступно. Выбери скачанную JSON-копию.');}}
  function readSettings(){try{const v=JSON.parse(localStorage.getItem(SETTINGS)||'{}');return object(v)?{voiceRu:String(v.voiceRu||'').slice(0,300),voiceEn:String(v.voiceEn||'').slice(0,300),rate:[.75,.9,1].includes(v.rate)?v.rate:.9}:{};}catch(_){return {};}}
  function settings(v){try{localStorage.setItem(SETTINGS,JSON.stringify({voiceRu:String(v.voiceRu||'').slice(0,300),voiceEn:String(v.voiceEn||'').slice(0,300),rate:[.75,.9,1].includes(v.rate)?v.rate:.9}));return true;}catch(_){return false;}}
  function reset(){try{localStorage.removeItem(KEY);localStorage.removeItem(PREVIOUS);blocked=false;reason='';revision=0;memory=normalize({});return save(memory,{replace:true});}catch(_){throw new Error('Браузер не разрешил очистить сохранение.');}}
  window.MiraProgress={key:KEY,normalize,merge,load,save,previous,parseBackup:text=>parseEnvelope(text,true),backup:state=>JSON.stringify(envelope(state),null,2),readSettings,settings,reset,configure(ids){lessonIds=new Set(ids);},get warning(){return reason;}};
})();
