/* ÜÇEL Personel Servisi — service worker
   Amaç: uygulamanın masaüstüne/telefona kurulabilmesi ve internet yokken
   en azından açılabilmesi. Veri istekleri ASLA önbelleğe alınmaz. */
const SURUM = 'ucel-servis-v3.0';
const VARLIKLAR = ['./', './index.html', './rota.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SURUM)
      .then(c => c.addAll(VARLIKLAR).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(a => Promise.all(a.filter(k => k !== SURUM).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const istek = e.request;
  if (istek.method !== 'GET') return;

  const url = new URL(istek.url);
  const ayniKaynak = url.origin === self.location.origin;

  // Veritabanı, harita, rota, hava durumu: her zaman ağdan, önbelleğe alma.
  if (!ayniKaynak) return;

  // Sayfanın kendisi: önce ağ (yeni sürüm hemen gelsin), olmazsa önbellek.
  if (istek.mode === 'navigate' || url.pathname.endsWith('/index.html') || url.pathname.endsWith('/')) {
    // cache:'reload' → tarayıcının HTTP önbelleğini atla, her zaman sunucudan al.
    // Yeni sürüm yayınlandığı an gelsin diye; GitHub Pages HTML'i 10 dk önbellekliyor.
    e.respondWith(
      fetch(new Request(istek.url, {cache:'reload', credentials:'same-origin'}))
        .then(y => {
          const kopya = y.clone();
          caches.open(SURUM).then(c => c.put(istek, kopya)).catch(() => {});
          return y;
        })
        .catch(() => caches.match(istek).then(y => y || caches.match('./index.html')))
    );
    return;
  }

  // İkon/manifest gibi sabit dosyalar: önce önbellek, arkadan tazele.
  e.respondWith(
    caches.match(istek).then(onbellek => {
      const agdan = fetch(istek).then(y => {
        const kopya = y.clone();
        caches.open(SURUM).then(c => c.put(istek, kopya)).catch(() => {});
        return y;
      }).catch(() => onbellek);
      return onbellek || agdan;
    })
  );
});
