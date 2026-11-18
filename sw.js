/* Service worker M&M's: cache aplikasi agar bisa dibuka offline. Naikkan VER saat rilis baru. */
var VER = "mm-v40-1";
var SHELL = ["./", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "firebase-config.js", "mm-backend.js", "mm-sync.js", "mm-qr.js", "mm-friends.js", "pwa.js"];
self.addEventListener("install", function (e) { e.waitUntil(caches.open(VER).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); })); });
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k !== VER; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== location.origin) return;
  e.respondWith(fetch(r).then(function (res) {
    var cp = res.clone(); caches.open(VER).then(function (c) { c.put(r, cp); }); return res;
  }).catch(function () { return caches.match(r).then(function (m) { return m || caches.match("index.html"); }); }));
});

/* Notifikasi push (dikirim Cloud Function lewat FCM). Menampilkan pesan saat aplikasi tertutup. */
self.addEventListener("push", function (e) {
  var j = {}; try { j = e.data ? e.data.json() : {}; } catch (x) { try { j = { notification: { body: e.data.text() } }; } catch (y) {} }
  var n = j.notification || {}, d = j.data || {};
  var title = n.title || d.title || "M&M's", body = n.body || d.body || "";
  e.waitUntil(self.registration.showNotification(title, { body: body, icon: "icon-192.png", badge: "icon-192.png", tag: d.pair || "mm", renotify: true, data: { url: d.url || "./" } }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close(); var url = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (cs) {
    for (var i = 0; i < cs.length; i++) { if ("focus" in cs[i]) return cs[i].focus(); }
    return self.clients.openWindow(url);
  }));
});
