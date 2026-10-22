const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const base=fs.existsSync(__dirname+'/web/progress.js')?__dirname+'/web/':__dirname+'/';
const progressSource=fs.readFileSync(base+'progress.js','utf8');
const voiceSource=fs.readFileSync(base+'voice.js','utf8');
const html=fs.readFileSync(base+'index.html','utf8');
let passed=0;
function test(name,fn){return Promise.resolve().then(fn).then(()=>{passed++;console.log('PASS '+name);});}
function createStore(initial={}){
  const values=new Map(Object.entries(initial));let failWrites=false;
  const storage={getItem:k=>values.get(k)||null,setItem:(k,v)=>{if(failWrites)throw Error('QuotaExceeded');values.set(k,v);},removeItem:k=>values.delete(k)};
  const context={window:{},localStorage:storage,Date,Set,Map,JSON,Number,Array,Object,Error,String,Math};vm.createContext(context);vm.runInContext(progressSource,context);
  return {p:context.window.MiraProgress,values,set fail(v){failWrites=v;}};
}
function voiceEnvironment({recognizer=true,synthesis=true}={}){
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);const nodes={};
  const node=()=>({value:'',checked:false,hidden:false,options:[],textContent:'',append(o){this.options.push(o);},replaceChildren(){this.options=[];},focus(){this.focused=true;}});
  for(const id of ids)nodes[id]=node();nodes.dictationLang.value='ru-RU';
  const states=[],spoken=[],recognizers=[],listeners={};
  class Recognition{constructor(){recognizers.push(this);}start(){this.started=true;this.onstart?.();}abort(){this.aborted=true;}stop(){this.onend?.();}}
  const window={MiraProgress:{readSettings:()=>({}),settings:()=>true},MiraAvatar:{setState:s=>states.push(s)},addEventListener:(k,f)=>listeners[k]=f,dispatchEvent:()=>{}};
  if(synthesis){window.speechSynthesis={getVoices:()=>[{voiceURI:'ru',lang:'ru-RU',name:'Local RU',localService:true},{voiceURI:'en',lang:'en-GB',name:'Local EN',localService:true}],cancel(){},resume(){},addEventListener(){},speak:u=>spoken.push(u)};window.SpeechSynthesisUtterance=function(text){this.text=text;};}
  if(recognizer)window.webkitSpeechRecognition=Recognition;
  const context={window,document:{getElementById:id=>{assert(nodes[id],id);return nodes[id];},createElement:node,addEventListener:(k,f)=>listeners[k]=f},CustomEvent:function(){},SpeechSynthesisUtterance:window.SpeechSynthesisUtterance,Number,String,Math,setTimeout:()=>1,clearTimeout(){}};
  vm.createContext(context);vm.runInContext(voiceSource,context);return {voice:window.MiraVoice,nodes,states,spoken,recognizers,listeners};
}
(async()=>{
 await test('local save, reload and JSON transfer retain completed work',()=>{const a=createStore();a.p.configure(['u1l1']);a.p.load();assert(a.p.save({done:['u1l1'],read:[0],answers:[{id:'u1l1',unit:0,ok:true,hint:false,at:Date.now()}],seconds:90}).ok);const backup=a.p.backup(a.p.load());const b=createStore();b.p.configure(['u1l1']);const restored=b.p.parseBackup(backup).progress;assert.equal(restored.done[0],'u1l1');assert.equal(restored.answers.length,1);assert.equal(restored.seconds,90);assert(b.p.save(restored,{replace:true}).ok);const c=createStore(Object.fromEntries(b.values));assert.equal(c.p.load().done[0],'u1l1');});
 await test('merge is idempotent and does not double time or answers',()=>{const {p}=createStore();const a={done:['base1'],read:[0],seconds:90,answers:[{id:'base1',unit:-1,ok:true,at:1}]},b={done:['u1l1'],read:[1],seconds:120,answers:[{id:'u1l1',unit:0,ok:false,at:2}]};const merged=p.merge(a,b);assert.equal(merged.done.length,2);assert.equal(merged.answers.length,2);assert.equal(merged.seconds,120);assert.equal(JSON.stringify(p.merge(merged,merged)),JSON.stringify(merged));});
 await test('invalid, unrelated, future and oversized backup files rejected',()=>{const {p}=createStore();for(const text of ['oops','[]','{}',JSON.stringify({format:'mira-english-progress',courseId:'wrong',schemaVersion:1,progress:{}}),'x'.repeat(2000001)])assert.throws(()=>p.parseBackup(text));const d=JSON.parse(p.backup({}));d.schemaVersion=2;assert.throws(()=>p.parseBackup(JSON.stringify(d)));});
 await test('import whitelist strips personal fields, invalid IDs and hostile structure',()=>{const {p}=createStore();p.configure(['u1l1']);const v=p.normalize(JSON.parse('{"name":"PRIVATE","password":"PRIVATE","done":["u1l1","u1l1","u99l1"],"read":[0,99],"seconds":-5,"diagnostics":[{"total":20}],"position":{"page":"<script>","step":999},"__proto__":{"polluted":true}}'));assert.equal(v.done.length,1);assert.equal(v.read.length,1);assert.equal(v.seconds,0);assert.equal(v.position.page,'home');assert(!JSON.stringify(v).includes('PRIVATE'));assert.equal({}.polluted,undefined);});
 await test('corrupt stored record is preserved until explicit replacement',()=>{const key='mira.english.free.progress.v1',x=createStore({[key]:'broken'});x.p.load();assert.equal(x.p.save({done:['base1']}).ok,false);assert.equal(x.values.get(key),'broken');assert.equal(x.p.save({done:['base1']},{replace:true}).ok,true);assert.equal(x.p.parseBackup(x.values.get(key)).progress.done[0],'base1');assert.equal(x.values.get(key+'.previous'),'broken');});
 await test('storage quota failure reports unsaved result and keeps export available',()=>{const x=createStore();x.p.load();assert(x.p.save({done:['base1']}).ok);const old=x.values.get(x.p.key);x.fail=true;assert.equal(x.p.save({done:['base1','base2']}).ok,false);assert.equal(x.values.get(x.p.key),old);assert.equal(x.p.parseBackup(x.p.backup({done:['base2']})).progress.done[0],'base2');});
 await test('legacy MIRA export imports without a new account',()=>{const {p}=createStore();const d=p.parseBackup(JSON.stringify({app:'MIRA English Forward 8',progress:{done:['base1'],read:[],answers:[],diagnostics:[]}}));assert.equal(d.progress.done[0],'base1');});
 await test('speech uses requested language, device voice and native cancel',()=>{const e=voiceEnvironment();assert(e.voice.speak('Hello, Mira.',{lang:'en-GB',rate:.75}));assert.equal(e.spoken[0].voice.voiceURI,'en');assert.equal(e.spoken[0].rate,.75);e.spoken[0].onstart();assert.equal(e.states.at(-1),'speaking');e.spoken[0].onend();assert.equal(e.states.at(-1),'idle');e.voice.stopPlayback();});
 await test('missing speech APIs leave text fallback and no simulated AI',()=>{const e=voiceEnvironment({recognizer:false,synthesis:false});assert.equal(e.voice.speak('Hello'),false);assert.match(e.nodes.dictationStatus.textContent,/недоступна/);assert.equal(e.voice.capabilities().dictation,false);});
 await test('dictation requires consent and fills text without auto-submit',async()=>{const e=voiceEnvironment();await e.nodes.dictateStart.onclick();assert.equal(e.recognizers.length,0);e.nodes.dictationConsent.checked=true;await e.nodes.dictateStart.onclick();const r=e.recognizers[0];assert(r.started);r.onresult({results:[[{transcript:'Present Perfect'}]]});assert.equal(e.nodes.mentorQuestion.value,'Present Perfect');r.onerror({error:'not-allowed'});assert.match(e.nodes.dictationStatus.textContent,/не разрешён/);assert.equal(e.voice.active,false);});
 await test('on-device-only recognition never silently falls back to cloud',async()=>{const e=voiceEnvironment();e.nodes.dictationConsent.checked=true;e.nodes.localDictation.checked=true;await e.nodes.dictateStart.onclick();assert(!e.recognizers[0].started);assert.match(e.nodes.dictationStatus.textContent,/не поддерживается/);});
 await test('public scripts contain no network client or paid provider address',()=>{for(const name of ['app.js','voice.js','progress.js','lessons.js','avatar.js']){const s=fs.readFileSync(base+name,'utf8');assert(!/\bfetch\s*\(|XMLHttpRequest|new\s+WebSocket|functions\.yandexcloud\.net|MIRA_ACCESS_CODE|Api-Key/.test(s),name);}assert(!/accountOverlay|homeworkPhoto|ИИ-Мира|Спроси Миру · AI/.test(html));});
 console.log(passed+' free-edition checks passed');
})().catch(e=>{console.error(e);process.exitCode=1;});
