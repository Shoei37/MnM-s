/* M&M's — sinkron antar perangkat untuk progres game & kebiasaan.
   Chat, pengaturan, dompet koin, cerita sudah disinkron oleh aplikasi sendiri;
   modul ini menambahkan data yang selama ini hanya di perangkat (progres Kebun Tanaman, favorit game, dll).
   Memakai window.claude.use("user"|"db") (claude.ai atau mm-backend.js). Dokumen: data/users/<uid>/ls_all */
(function () {
  "use strict";
  var KEYS = ["shoeixp-df2", "shoeixp-dm", "shoeixp-dots", "shoeixp-spin", "shoeixp-rst", "shoeixp-sched", "shoeixp-vr", "shoeixp-dens", "shoeixp-grecent", "shoeixp-gfav"];
  var META = "shoeixp-syncmeta", GUARD = "mm-sync-reloaded";
  var applying = false, doc = null, timer = null, ready = false, busy = false;

  function jget(k, d) { try { var v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }
  function meta() { return jget(META, {}) || {}; }
  var rawSet = Storage.prototype.setItem, rawRemove = Storage.prototype.removeItem;
  function setMeta(m) { try { rawSet.call(localStorage, META, JSON.stringify(m)); } catch (e) {} }
  function stamp(k) { var m = meta(); m[k] = Date.now(); setMeta(m); schedule(); }
  function isLS(o) { try { return o === window.localStorage; } catch (e) { return false; } }
  Storage.prototype.setItem = function (k, v) {
    rawSet.call(this, k, v);
    if (!applying && KEYS.indexOf(k) >= 0 && isLS(this)) stamp(k);
  };
  Storage.prototype.removeItem = function (k) {
    rawRemove.call(this, k);
    if (!applying && KEYS.indexOf(k) >= 0 && isLS(this)) stamp(k);
  };

  function mergeVal(k, a, b) { // a = lokal (string|null), b = remote (string|null) → string dipakai untuk kedua sisi bila perlu gabung
    try {
      if (k === "shoeixp-df2") { var x = JSON.parse(a || "{}"), y = JSON.parse(b || "{}"), cx = x.cl || [], cy = y.cl || []; return JSON.stringify({ cl: [Math.max(cx[0] || 0, cy[0] || 0), Math.max(cx[1] || 0, cy[1] || 0)] }); }
      if (k === "shoeixp-gfav") { var p = JSON.parse(a || "[]"), q = JSON.parse(b || "[]"); return JSON.stringify(Array.from(new Set(p.concat(q)))); }
    } catch (e) {}
    return null;
  }

  function snapshot() {
    var m = meta(), o = {};
    KEYS.forEach(function (k) { var v = localStorage.getItem(k); if (v != null && v.length < 60000) o[k] = { v: v, t: m[k] || 0 }; });
    return o;
  }

  async function pull() {
    var s = await doc.get(); var remote = {};
    if (s && s.exists) { try { remote = JSON.parse((s.data() || {}).json || "{}"); } catch (e) {} }
    var m = meta(), changed = false, needPush = false, now = Date.now();
    applying = true;
    try {
      KEYS.forEach(function (k) {
        var r = remote[k], lv = localStorage.getItem(k), lt = m[k] || 0;
        if (lv != null && !lt) { lt = m[k] = now; needPush = true; }
        if (!r) { if (lv != null) needPush = true; return; }
        var merged = mergeVal(k, lv, r.v);
        if (merged != null) {
          if (merged !== lv) { rawSet.call(localStorage, k, merged); changed = true; }
          if (merged !== r.v) needPush = true;
          m[k] = Math.max(lt, r.t || 0, merged !== r.v ? now : 0); return;
        }
        if ((r.t || 0) > lt) { rawSet.call(localStorage, k, r.v); m[k] = r.t; changed = true; }
        else if (lt > (r.t || 0)) needPush = true;
      });
    } finally { applying = false; }
    setMeta(m);
    return { changed: changed, needPush: needPush };
  }
  async function push() {
    if (!doc) return;
    await doc.set({ json: JSON.stringify(snapshot()), updatedAt: Date.now() });
  }
  function schedule() { if (!ready) return; clearTimeout(timer); timer = setTimeout(function () { sync(false); }, 2500); }

  function banner() {
    if (document.getElementById("mmSyncBar")) return;
    var b = document.createElement("div"); b.id = "mmSyncBar";
    b.style.cssText = "position:fixed;left:12px;right:12px;bottom:76px;z-index:9998;background:#2a2150;color:#fff;border-radius:14px;padding:12px 14px;display:flex;gap:10px;align-items:center;font:14px system-ui,sans-serif;box-shadow:0 6px 24px rgba(0,0,0,.3)";
    b.innerHTML = '<span style="flex:1">Ada data baru dari perangkat lain.</span><button type="button" style="border:0;border-radius:10px;padding:8px 12px;font-weight:700;background:#06c755;color:#fff">Muat ulang</button>';
    b.querySelector("button").onclick = function () { location.reload(); };
    document.body.appendChild(b);
  }

  async function sync(first) {
    if (busy || !doc) return; busy = true;
    try {
      var r = await pull();
      if (r.changed) {
        var done = false; try { done = sessionStorage.getItem(GUARD) === "1"; } catch (e) {}
        if (first && !done) { try { sessionStorage.setItem(GUARD, "1"); } catch (e) {} if (r.needPush) await push(); location.reload(); return; }
        banner();
      } else { try { sessionStorage.removeItem(GUARD); } catch (e) {} }
      if (r.needPush) await push();
    } catch (e) {
      var c = e && e.code; if (c === "not_granted" || c === "capability_disabled" || c === "invalid_argument") doc = null;
    }
    busy = false;
  }

  async function init() {
    try {
      if (!window.claude || !window.claude.use) return;
      var u = await window.claude.use("user"); var id = u ? await u.id() : null; if (!id) return;
      var d = await window.claude.use("db"); if (!d) return;
      doc = d.collection("data/users/" + id).doc("ls_all"); ready = true;
      await sync(true);
      document.addEventListener("visibilitychange", function () { if (document.visibilityState === "visible") sync(false); else if (timer) { clearTimeout(timer); sync(false); } });
      setInterval(function () { if (document.visibilityState === "visible") sync(false); }, 90000);
    } catch (e) {}
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", function () { setTimeout(init, 1200); });
  else setTimeout(init, 1200);
  window.mmSyncNow = function () { return sync(false); };
})();
