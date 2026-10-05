/* Yearly Budget Tracker: keeps the site's own files on the device so it opens offline.
   Only the site's files are cached; your data is never here (it lives in your folder, Drive or browser storage).
   The page itself is fetched fresh when online, so updates arrive on the next visit. */
const VERSION='1.0.0-b0a133d969';
const CACHE='ybt-'+VERSION;
const FILES=["./", "config.js", "fonts/bricolage-grotesque-latin-ext-opsz-normal.woff2", "fonts/bricolage-grotesque-latin-opsz-normal.woff2", "fonts/fonts.css", "fonts/ibm-plex-mono-latin-400-normal.woff2", "fonts/ibm-plex-mono-latin-500-normal.woff2", "fonts/ibm-plex-mono-latin-ext-400-normal.woff2", "fonts/ibm-plex-mono-latin-ext-500-normal.woff2", "fonts/public-sans-latin-ext-wght-normal.woff2", "fonts/public-sans-latin-wght-normal.woff2", "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "js/web-ai.js", "js/web-boot.js", "js/web-shim.js", "manifest.webmanifest", "privacy.html", "vendor/pdf.min.js", "vendor/pdf.worker.min.js", "vendor/xlsx.full.min.js", "web.css"];
self.addEventListener('install',e=>{ e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting())); });
self.addEventListener('activate',e=>{ e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('ybt-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())); });
self.addEventListener('fetch',e=>{
  const r=e.request, u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==self.location.origin) return;   /* Google sign-in and Drive go straight to Google */
  if(r.mode==='navigate'){
    e.respondWith(fetch(r).then(res=>{ if(res.ok){ const c=res.clone(); caches.open(CACHE).then(x=>x.put(r,c)); } return res; })
      .catch(()=>caches.match(r,{ignoreSearch:true}).then(x=>x||caches.match('./')).then(x=>x||caches.match('index.html'))));
    return;
  }
  /* config.js can be edited on its own (the Google sign-in ID), so it's fetched fresh when online */
  if(u.pathname.endsWith('/config.js')){
    e.respondWith(fetch(r).then(res=>{ const c=res.clone(); caches.open(CACHE).then(x=>x.put(r,c)); return res; }).catch(()=>caches.match(r,{ignoreSearch:true})));
    return;
  }
  e.respondWith(caches.match(r,{ignoreSearch:true}).then(hit=>hit||fetch(r).then(res=>{ if(res.ok){ const c=res.clone(); caches.open(CACHE).then(x=>x.put(r,c)); } return res; })));
});
