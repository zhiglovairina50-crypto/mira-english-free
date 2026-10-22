/* Static assets only. Relative URLs support GitHub project Pages. */
const BASE=new URL('./',self.location.href),PREFIX='mira-free-'+BASE.pathname.replace(/[^a-z0-9]/gi,'_')+'-',CACHE=PREFIX+'2026-10-22-v1';
const FILES=['./','index.html','progress.js','lessons.js','app.js','voice.js','avatar.js','app.css','manifest.webmanifest','assets/mira-0.webp','assets/mira-blink.webp','assets/mira-ah.webp','assets/mira-oh.webp','assets/icon-192.png','assets/icon-512.png','assets/icon-180.png'];
const URLS=FILES.map(file=>new URL(file,BASE).href);
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(URLS.map(url=>new Request(url,{cache:'reload',credentials:'omit'}))))));
self.addEventListener('message',e=>{if(e.data?.type==='MIRA_SKIP_WAITING')self.skipWaiting();});
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{const url=new URL(e.request.url);if(e.request.method!=='GET'||url.origin!==BASE.origin||!url.pathname.startsWith(BASE.pathname))return;if(e.request.mode==='navigate'){e.respondWith(fetch(e.request).catch(()=>caches.open(CACHE).then(c=>c.match(new URL('index.html',BASE).href))));return;}if(URLS.includes(url.href))e.respondWith(caches.open(CACHE).then(async c=>(await c.match(url.href))||fetch(e.request)));});
