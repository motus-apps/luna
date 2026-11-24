importScripts('core.js');

const CACHE = 'luna-v12';
const FILES = ['./', 'index.html', 'core.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/apple-touch-icon.png', 'fonts/fraunces.woff2', 'fonts/figtree.woff2'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Netzwerk zuerst (damit Updates ankommen), offline aus dem Cache
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('index.html')))
  );
});

// ---- Benachrichtigungen ----
const db = () => new Promise((res, rej) => {
  const r = indexedDB.open('luna', 1);
  r.onupgradeneeded = () => r.result.createObjectStore('kv');
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});
const get = async k => { const d = await db(); return new Promise(res => { const q = d.transaction('kv').objectStore('kv').get(k); q.onsuccess = () => res(q.result); q.onerror = () => res(undefined); }); };
const set = async (k, v) => { const d = await db(); return new Promise(res => { const t = d.transaction('kv', 'readwrite'); t.objectStore('kv').put(v, k); t.oncomplete = res; t.onerror = res; }); };

async function check() {
  const S = await get('state');
  if (!S || !S.notify || !S.notify.on) return;
  if (self.Notification && Notification.permission !== 'granted') return;
  const sent = (await get('sent')) || {}, inbox = (await get('inbox')) || [], T = LunaCore.T0();
  let changed = false;
  for (const p of S.persons || []) {
    for (const ev of LunaCore.events(p, T, S.notify)) {
      if (sent[ev.key]) continue;
      await self.registration.showNotification(ev.title, { body: ev.body, icon: 'icons/icon-192.png', tag: ev.key, data: { url: './' } });
      sent[ev.key] = Date.now();
      inbox.unshift({ key: ev.key, title: ev.title, body: ev.body, ts: Date.now(), read: false });
      changed = true;
    }
  }
  if (changed) {
    const limit = Date.now() - 90 * LunaCore.DAY;
    for (const k in sent) if (sent[k] < limit) delete sent[k];
    await set('sent', sent);
    await set('inbox', inbox.slice(0, 50));
    (await clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach(c => c.postMessage('inbox'));
  }
}

self.addEventListener('periodicsync', e => { if (e.tag === 'luna-daily') e.waitUntil(check()); });
self.addEventListener('message', e => { if (e.data === 'check') e.waitUntil(check()); });
// Antippen oder Wegwischen einer Benachrichtigung = gelesen
async function markRead(tag) {
  const inbox = (await get('inbox')) || [];
  inbox.forEach(i => { if (i.key === tag) i.read = true; });
  await set('inbox', inbox);
  (await clients.matchAll({ type: 'window', includeUncontrolled: true })).forEach(c => c.postMessage('inbox'));
}
self.addEventListener('notificationclose', e => e.waitUntil(markRead(e.notification.tag)));
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(markRead(e.notification.tag).then(() => clients.matchAll({ type: 'window', includeUncontrolled: true }))
    .then(cs => {
      if (cs.length) { cs[0].navigate && cs[0].navigate('./#mitteilungen').catch(() => {}); return cs[0].focus(); }
      return clients.openWindow('./#mitteilungen');
    }));
});
