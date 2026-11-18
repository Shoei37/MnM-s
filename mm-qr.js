/* M&M's: pembuat QR Code (tanpa library luar) + pemindai kamera.
   Pembuat: mode byte, koreksi error M, versi 1-10 (cukup untuk tautan ajakan teman). */
(function () {
  "use strict";
  var ECC_PER_BLOCK = [0, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26];
  var NUM_BLOCKS = [0, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5];

  function mul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 255; }
  function rsDiv(deg) {
    var r = []; for (var i = 0; i < deg; i++) r.push(0); r[deg - 1] = 1; var root = 1;
    for (var k = 0; k < deg; k++) { for (var j = 0; j < deg; j++) { r[j] = mul(r[j], root); if (j + 1 < deg) r[j] ^= r[j + 1]; } root = mul(root, 2); }
    return r;
  }
  function rsRem(data, div) {
    var res = div.map(function () { return 0; });
    data.forEach(function (b) { var f = b ^ res.shift(); res.push(0); div.forEach(function (c, i) { res[i] ^= mul(c, f); }); });
    return res;
  }
  function rawModules(v) {
    var r = (16 * v + 128) * v + 64;
    if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; }
    return r;
  }
  function utf8(s) { return Array.prototype.slice.call(new TextEncoder().encode(s)); }
  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function matrix(text) {
    var data = utf8(text), ver = 0, dataCW = 0;
    for (var v = 1; v <= 10; v++) {
      var dcw = Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[v] * NUM_BLOCKS[v], cc = v < 10 ? 8 : 16;
      if (data.length * 8 + 4 + cc <= dcw * 8) { ver = v; dataCW = dcw; break; }
    }
    if (!ver) throw new Error("Teks terlalu panjang untuk QR");
    var bits = [];
    function put(val, len) { for (var i = len - 1; i >= 0; i--) bits.push((val >>> i) & 1); }
    put(4, 4); put(data.length, ver < 10 ? 8 : 16); data.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, dataCW * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    var cw = []; for (var i = 0; i < bits.length; i += 8) { var b = 0; for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j]; cw.push(b); }
    for (var pad = 0xEC; cw.length < dataCW; pad ^= 0xEC ^ 0x11) cw.push(pad);

    var nb = NUM_BLOCKS[ver], ecl = ECC_PER_BLOCK[ver], raw = Math.floor(rawModules(ver) / 8);
    var shortLen = Math.floor(raw / nb), nShort = nb - raw % nb, div = rsDiv(ecl), blocks = [], k = 0;
    for (var bI = 0; bI < nb; bI++) {
      var len = shortLen - ecl + (bI < nShort ? 0 : 1), d = cw.slice(k, k + len); k += len;
      var e = rsRem(d, div); if (bI < nShort) d.push(0); blocks.push(d.concat(e));
    }
    var all = [];
    for (var c = 0; c < blocks[0].length; c++) blocks.forEach(function (bl, bi) { if (c !== shortLen - ecl || bi >= nShort) all.push(bl[c]); });

    var size = ver * 4 + 17, m = [], fn = [];
    for (var y = 0; y < size; y++) { m.push(new Array(size).fill(false)); fn.push(new Array(size).fill(false)); }
    function setF(x, y, dark) { if (x < 0 || y < 0 || x >= size || y >= size) return; m[y][x] = dark; fn[y][x] = true; }
    for (var t = 0; t < size; t++) { setF(6, t, t % 2 === 0); setF(t, 6, t % 2 === 0); }
    function finder(x, y) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var dist = Math.max(Math.abs(dx), Math.abs(dy)); setF(x + dx, y + dy, dist !== 2 && dist !== 4); } }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    var na = ver === 1 ? 0 : Math.floor(ver / 7) + 2, pos = [];
    if (na) { var step = Math.ceil((ver * 4 + 4) / (na * 2 - 2)) * 2; pos = [6]; for (var p = size - 7; pos.length < na; p -= step) pos.splice(1, 0, p); }
    for (var a = 0; a < pos.length; a++) for (var b2 = 0; b2 < pos.length; b2++) {
      if ((a === 0 && b2 === 0) || (a === 0 && b2 === pos.length - 1) || (a === pos.length - 1 && b2 === 0)) continue;
      for (var dy2 = -2; dy2 <= 2; dy2++) for (var dx2 = -2; dx2 <= 2; dx2++) setF(pos[a] + dx2, pos[b2] + dy2, Math.max(Math.abs(dx2), Math.abs(dy2)) !== 1);
    }
    function formatBits(mask) {
      var dd = (0 << 3) | mask, rem = dd; for (var i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >>> 9) * 0x537);
      return ((dd << 10) | rem) ^ 0x5412;
    }
    function drawFormat(mask) {
      var f = formatBits(mask), i;
      for (i = 0; i <= 5; i++) setF(8, i, bit(f, i));
      setF(8, 7, bit(f, 6)); setF(8, 8, bit(f, 7)); setF(7, 8, bit(f, 8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(f, i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(f, i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(f, i));
      setF(8, size - 8, true);
    }
    drawFormat(0);
    if (ver >= 7) {
      var rem2 = ver; for (var q = 0; q < 12; q++) rem2 = (rem2 << 1) ^ ((rem2 >>> 11) * 0x1F25);
      var vb = (ver << 12) | rem2;
      for (var q2 = 0; q2 < 18; q2++) { var col = bit(vb, q2), aa = size - 11 + q2 % 3, bb = Math.floor(q2 / 3); setF(aa, bb, col); setF(bb, aa, col); }
    }
    var idx = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (var jj = 0; jj < 2; jj++) {
        var x = right - jj, up = ((right + 1) & 2) === 0, yy = up ? size - 1 - vert : vert;
        if (!fn[yy][x] && idx < all.length * 8) { m[yy][x] = bit(all[idx >>> 3], 7 - (idx & 7)); idx++; }
      }
    }
    function maskFn(mk, x, y) {
      switch (mk) {
        case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0; case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0; default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(mk) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!fn[y][x] && maskFn(mk, x, y)) m[y][x] = !m[y][x]; }
    function penalty() {
      var s = 0, y, x, run, i;
      for (var pass = 0; pass < 2; pass++) for (y = 0; y < size; y++) {
        run = 1;
        for (x = 1; x < size; x++) {
          var cur = pass ? m[x][y] : m[y][x], prev = pass ? m[x - 1][y] : m[y][x - 1];
          if (cur === prev) { run++; if (run === 5) s += 3; else if (run > 5) s++; } else run = 1;
        }
      }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var c0 = m[y][x]; if (c0 === m[y][x + 1] && c0 === m[y + 1][x] && c0 === m[y + 1][x + 1]) s += 3; }
      var dark = 0; for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (m[y][x]) dark++;
      var kk = Math.ceil(Math.abs(dark * 20 - size * size * 10) / (size * size)) - 1; s += Math.max(0, kk) * 10;
      return s;
    }
    var best = 0, bestP = Infinity;
    for (var mk = 0; mk < 8; mk++) { applyMask(mk); drawFormat(mk); var pn = penalty(); if (pn < bestP) { bestP = pn; best = mk; } applyMask(mk); }
    applyMask(best); drawFormat(best);
    return m;
  }

  function svg(text, px) {
    var m = matrix(text), n = m.length, q = 4, d = "";
    for (var y = 0; y < n; y++) for (var x = 0; x < n; x++) if (m[y][x]) d += "M" + (x + q) + " " + (y + q) + "h1v1h-1z";
    var s = n + q * 2, el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    el.setAttribute("viewBox", "0 0 " + s + " " + s); el.setAttribute("width", px || 200); el.setAttribute("height", px || 200);
    el.setAttribute("shape-rendering", "crispEdges"); el.setAttribute("role", "img"); el.setAttribute("aria-label", "QR Code");
    var bg = document.createElementNS("http://www.w3.org/2000/svg", "rect"); bg.setAttribute("width", s); bg.setAttribute("height", s); bg.setAttribute("fill", "#fff"); el.appendChild(bg);
    var p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); p.setAttribute("fill", "#000"); el.appendChild(p);
    return el;
  }

  /* ---- Pemindai: BarcodeDetector bila ada, jika tidak jsQR (dimuat saat dibutuhkan) ---- */
  function loadJsQR() {
    return new Promise(function (ok, no) {
      if (window.jsQR) return ok(window.jsQR);
      var s = document.createElement("script"); s.src = "https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js";
      s.onload = function () { window.jsQR ? ok(window.jsQR) : no(new Error("jsQR")); }; s.onerror = function () { no(new Error("jsQR")); };
      document.head.appendChild(s);
    });
  }
  /* scan(videoEl, onText) -> {stop()} ; melempar error bila kamera tidak bisa dibuka */
  async function scan(video, onText) {
    var stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
    video.srcObject = stream; video.setAttribute("playsinline", ""); video.muted = true; await video.play();
    var stopped = false, det = null, jsqr = null, cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
    try { if ("BarcodeDetector" in window) det = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) { det = null; }
    if (!det) { try { jsqr = await loadJsQR(); } catch (e) { stream.getTracks().forEach(function (t) { t.stop(); }); throw new Error("Pemindai tidak tersedia di browser ini."); } }
    function stop() { stopped = true; try { stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {} video.srcObject = null; }
    (async function loop() {
      while (!stopped) {
        await new Promise(function (r) { setTimeout(r, 160); });
        if (stopped || video.readyState < 2) continue;
        try {
          var txt = "";
          if (det) { var r = await det.detect(video); if (r && r[0]) txt = r[0].rawValue; }
          else {
            var w = video.videoWidth, h = video.videoHeight, sc = Math.min(1, 640 / Math.max(w, h)); cv.width = Math.round(w * sc); cv.height = Math.round(h * sc);
            cx.drawImage(video, 0, 0, cv.width, cv.height); var id = cx.getImageData(0, 0, cv.width, cv.height), res = jsqr(id.data, id.width, id.height);
            if (res) txt = res.data;
          }
          if (txt && !stopped) { stop(); onText(txt); return; }
        } catch (e) {}
      }
    })();
    return { stop: stop };
  }
  window.mmQR = { matrix: matrix, svg: svg, scan: scan };
})();
