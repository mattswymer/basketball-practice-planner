const CACHE_NAME="basketball-planner-v30";
const CORE_ASSETS=[
 "./","./index.html","./css/app.css","./js/app.js","./js/core/store.js",
 "./js/ui/render.js","./js/data/drills.js","./js/features/practice.js",
 "./js/features/groups.js","./js/features/teams.js","./js/features/skills.js",
 "./js/services/export.js","./vendor/jspdf.umd.min.js","./manifest.webmanifest",
 "./icons/basketball.svg","./js/services/cloud.js"
];

const FIREBASE_MODULES=[
 "https://www.gstatic.com/firebasejs/13.3.0/firebase-app.js",
 "https://www.gstatic.com/firebasejs/13.3.0/firebase-auth.js",
 "https://www.gstatic.com/firebasejs/13.3.0/firebase-firestore.js"
];

self.addEventListener("install",event=>{
 event.waitUntil((async()=>{
  const cache=await caches.open(CACHE_NAME);
  await cache.addAll([...new Set(CORE_ASSETS)]);
  await Promise.allSettled(FIREBASE_MODULES.map(async asset=>{
   const response=await fetch(asset,{mode:"cors"});
   if(response.ok)await cache.put(asset,response);
  }));
  await self.skipWaiting();
 })());
});

self.addEventListener("activate",event=>{
 event.waitUntil(
  caches.keys()
   .then(keys=>Promise.all(keys.filter(key=>key!==CACHE_NAME).map(key=>caches.delete(key))))
   .then(()=>self.clients.claim())
 );
});

self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET")return;
 const url=new URL(event.request.url);
 const isFirebaseModule=FIREBASE_MODULES.includes(url.href);
 if(url.origin!==self.location.origin&&!isFirebaseModule)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE_NAME);
  const cached=await cache.match(event.request);
  if(cached)return cached;
  try{
   const response=await fetch(event.request);
   if(response?.ok)cache.put(event.request,response.clone()).catch(()=>{});
   return response;
  }catch(error){
   if(isFirebaseModule)throw error;
   return cache.match(event.request.mode==="navigate"?"./index.html":event.request);
  }
 })());
});
