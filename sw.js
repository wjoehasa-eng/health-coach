/* 건강코치 전용 서비스 워커 (wjoehasa-eng/health-coach)
   - 범위: /health-coach/  (다른 앱과 완전히 분리된 독립 저장소)
   - 전략: Network-first — 온라인일 때 항상 새 index.html 을 받고,
           오프라인일 때만 캐시로 대체한다.
   - 건강 기록(data.json)은 저장소에 없고 기기(localStorage)에만 있으므로
     미리 캐시할 데이터 파일이 없다. */

const CACHE = 'health-coach-v3';
const SCOPE_PATH = new URL('./', self.location).pathname; // /health-coach/
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(SCOPE_PATH)) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(cache => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(hit => {
          if (hit) return hit;
          if (req.mode === 'navigate') {
            return caches.match('./index.html').then(page => page || Response.error());
          }
          return Response.error();
        })
      )
  );
});
