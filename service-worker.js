const CACHE_NAME="basketball-planner-v2";
const CORE_ASSETS=[
 "./","./index.html","./css_style.css","./js_drills_db.js","./manifest.webmanifest",
 "./icons/basketball.svg","./js/app.js","./js/core/store.js","./js/ui/render.js",
 "./js/features/practice.js","./js/features/groups.js","./js/features/teams.js","./js/features/skills.js",
 "./js/services/export.js","./vendor/jspdf.umd.min.js"
];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(CORE_ASSETS)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);if(url.origin!==self.location.origin)return;
 event.respondWith(fetch(event.request).then(response=>{
  if(response&&response.ok)caches.open(CACHE_NAME).then(cache=>cache.put(event.request,response.clone()));
  return response;
 }).catch(()=>caches.match(event.request.mode==="navigate"?"./index.html":event.request)));
});