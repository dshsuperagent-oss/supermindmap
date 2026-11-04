/* SuperMindMap — service worker (v26)
   Guarda o app no aparelho para abrir sem rede. Só é registrado em HTTPS ou
   localhost; em HTTP na rede local o navegador não permite, e o app segue
   funcionando normalmente online. */
const CACHE = 'supermindmap-v26';
const SHELL = [
  './gerador-mapa-mental.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-180.svg',
  './icon-180.png',
  './icon-192.png',
  './icon-maskable.svg',
  "./icon-maskable-512.png" // fallback colorido para iOS (gerado automaticamente)
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(SHELL.map((u) => c.add(new Request(u, {cache: 'reload'})).catch(() => null)))
    ).catch(() => null)
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;   /* IA e o resto vão direto para a rede */

  /* HTML: rede primeiro (para pegar a versão nova), cache como rede de segurança */
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(req)
        .then((r) => {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => null);
          return r;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./gerador-mapa-mental.html')))
    );
    return;
  }

  /* estáticos: cache primeiro, atualizando em segundo plano */
  e.respondWith(
    caches.match(req).then((hit) => {
      const rede = fetch(req).then((r) => {
        if (r && r.ok) {
          const cp = r.clone();
          caches.open(CACHE).then((c) => c.put(req, cp)).catch(() => null);
        }
        return r;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});
