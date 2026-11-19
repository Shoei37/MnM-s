/* M&M's — lapisan backend untuk hosting mandiri.
   Menyediakan window.claude.use("user" | "db" | "downloads") dengan API yang sama
   seperti di claude.ai, tetapi memakai Firebase Auth + Firestore. */
(function () {
  "use strict";
  var SDK = "https://www.gstatic.com/firebasejs/10.12.2/";
  var cfg = window.MM_FIREBASE || {};
  var configured = !!(cfg.apiKey && cfg.projectId && String(cfg.apiKey).indexOf("ISI_") !== 0 && String(cfg.projectId).indexOf("ISI_") !== 0);
  var fb = null, auth = null, fs = null, userP = null, curUser = null;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement("script"); s.src = src; s.async = true;
      s.onload = res; s.onerror = function () { rej(new Error("sdk")); };
      document.head.appendChild(s);
    });
  }
  async function loadSdk() {
    if (!window.firebase) {
      await loadScript(SDK + "firebase-app-compat.js");
      await Promise.all([loadScript(SDK + "firebase-auth-compat.js"), loadScript(SDK + "firebase-firestore-compat.js")]);
    }
    fb = window.firebase;
    if (!fb.apps.length) fb.initializeApp(cfg);
    auth = fb.auth(); fs = fb.firestore();
    try { await fs.enablePersistence({ synchronizeTabs: true }); } catch (e) {}
  }

  var MSG = {
    "auth/invalid-credential": "Email atau kata sandi salah.",
    "auth/wrong-password": "Kata sandi salah.",
    "auth/user-not-found": "Akun dengan email itu belum ada.",
    "auth/email-already-in-use": "Email itu sudah terdaftar. Coba masuk.",
    "auth/weak-password": "Kata sandi minimal 6 karakter.",
    "auth/invalid-email": "Format email tidak valid.",
    "auth/missing-password": "Isi kata sandi dulu.",
    "auth/too-many-requests": "Terlalu banyak percobaan. Tunggu sebentar.",
    "auth/network-request-failed": "Tidak ada koneksi internet.",
    "auth/popup-closed-by-user": "Masuk dengan Google dibatalkan.",
    "auth/cancelled-popup-request": "Masuk dengan Google dibatalkan.",
    "auth/invalid-phone-number": "Nomor HP tidak valid.", "auth/missing-phone-number": "Isi nomor HP dulu.", "auth/invalid-verification-code": "Kode salah. Periksa lagi.", "auth/code-expired": "Kode kedaluwarsa. Kirim ulang.", "auth/captcha-check-failed": "Verifikasi keamanan gagal. Muat ulang halaman.", "auth/quota-exceeded": "Kuota SMS hari ini habis. Coba lagi nanti atau pakai Google/email.", "auth/operation-not-allowed": "Login nomor HP belum diaktifkan di Firebase.", "auth/billing-not-enabled": "Login SMS butuh paket Blaze di Firebase.", "auth/unauthorized-domain": "Domain ini belum didaftarkan di Firebase (Authorized domains)."
  };
  function mask4(n) { return n ? n.slice(0, 3) + "\u2022\u2022\u2022" + n.slice(-3) : ""; }
  function msg(e) { return MSG[e && e.code] || ("Gagal: " + ((e && e.message) || "coba lagi")); }

  var LOGO = "data:image/png;base64,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";
  var CSS = ".mmgate{position:fixed;inset:0;z-index:99999;overflow-y:auto;display:flex;justify-content:center;align-items:flex-start;padding:0;background:#f3eefc;font-family:'Noto Sans JP',system-ui,sans-serif;color:#2a2150}" +
    ".mmgate .card{width:100%;max-width:420px;min-height:100%;box-sizing:border-box;background:#fff;padding:clamp(28px,8vh,64px) 26px 28px;display:flex;flex-direction:column;gap:12px}" +
    "@media(min-width:700px){.mmgate{align-items:center;padding:24px}.mmgate .card{min-height:0;border-radius:18px;box-shadow:0 12px 50px rgba(70,40,140,.18);padding:36px 30px}}" +
    ".mmgate .logo{width:84px;height:84px;border-radius:22px;align-self:center;box-shadow:0 8px 22px rgba(120,80,220,.32)}" +
    ".mmgate .brand{font-family:Fredoka,system-ui,sans-serif;font-size:34px;font-weight:700;text-align:center;color:#7a4fe0;letter-spacing:.01em;margin-top:2px}" +
    ".mmgate h1{margin:0;font-size:21px;text-align:center}" +
    ".mmgate p{margin:0;font-size:13px;color:#6b6490;text-align:center;line-height:1.5}" +
    ".mmgate .tabs{display:flex;border-bottom:2px solid #ece6fa;margin:6px 0 4px}.mmgate .tabs button{flex:1;background:none;border:0;border-bottom:3px solid transparent;margin-bottom:-2px;padding:12px 6px;font-size:15px;font-weight:700;color:#9a94b8;cursor:pointer;border-radius:0}.mmgate .tabs button[aria-selected=true]{color:#7a4fe0;border-bottom-color:#7a4fe0}" +
    ".mmgate input[type=text],.mmgate input[type=email],.mmgate input[type=password],.mmgate input[type=tel],.mmgate textarea{width:100%;box-sizing:border-box;border:1px solid #d8d0ee;border-radius:6px;padding:14px 14px;font-size:16px;background:#fff;color:inherit;font-family:inherit}" +
    ".mmgate input:focus,.mmgate textarea:focus{outline:0;border-color:#7a4fe0;box-shadow:0 0 0 3px rgba(122,79,224,.16)}" +
    ".mmgate .pw{position:relative}.mmgate .pw input{padding-right:48px}.mmgate .eye{position:absolute;right:4px;top:50%;transform:translateY(-50%);width:42px;height:42px;background:none;border:0;font-size:18px;cursor:pointer;color:#8a82ad}" +
    ".mmgate button{border:0;border-radius:6px;padding:14px;font-size:16px;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".mmgate .pri{background:#7a4fe0;color:#fff}.mmgate .pri[disabled]{background:#d9d4e6;color:#fff;opacity:1;cursor:default}" +
    ".mmgate .goo{background:#fff;color:#333;border:1px solid #d8d0ee;display:flex;gap:10px;justify-content:center;align-items:center;font-weight:600;font-size:15px}" +
    ".mmgate .chk{display:flex;align-items:center;gap:8px;font-size:13px;color:#5c557f;cursor:pointer}.mmgate .chk input{width:18px;height:18px;accent-color:#7a4fe0}" +
    ".mmgate .lnk{background:none;color:#7a4fe0;font-weight:600;padding:8px;font-size:13px}.mmgate .err{color:#d93a4a;font-size:13px;min-height:18px;text-align:center}" +
    ".mmgate .ok{color:#0a8f43}.mmgate .or{display:flex;align-items:center;gap:10px;color:#9a94b8;font-size:12px;margin:2px 0}.mmgate .or:before,.mmgate .or:after{content:'';flex:1;height:1px;background:#e6e0f5}" +
    ".mmgate .ph{display:flex;flex-direction:column;gap:12px}.mmgate [hidden]{display:none!important}.mmgate select{width:100%;box-sizing:border-box;border:1px solid #d8d0ee;border-radius:6px;padding:14px;font-size:16px;background:#fff;color:inherit}" +
    ".mmgate .foot{display:flex;justify-content:space-between;align-items:center}.mmgate .sw{margin-top:auto;text-align:center;font-size:14px;color:#5c557f}.mmgate .sw button{background:none;color:#7a4fe0;padding:4px 4px;font-size:14px}" +
    ".mmgate .pav{width:84px;height:84px;border-radius:50%;align-self:center;display:grid;place-items:center;color:#fff;font-size:36px;font-weight:800;background:#7a4fe0}" +
    ".mmgate label.fl{font-size:12px;font-weight:700;color:#6b6490;margin-bottom:-6px}.mmgate .idw{position:relative}.mmgate .idw span{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:#8a82ad;font-weight:700}.mmgate .idw input{padding-left:30px}" +
    ".mmgate textarea{resize:none;min-height:76px}.mmgate .hint{font-size:12px;min-height:16px;color:#8a82ad;margin-top:-6px}.mmgate .hint.good{color:#0a8f43}.mmgate .hint.bad{color:#d93a4a}" +
    "@media(prefers-color-scheme:dark){.mmgate{background:#17122b;color:#f0ebff}.mmgate .card{background:#211a3b}.mmgate input[type=text],.mmgate input[type=email],.mmgate input[type=password],.mmgate input[type=tel],.mmgate textarea,.mmgate select{background:#1a1430;border-color:#3b3360;color:#f0ebff}.mmgate .goo{background:#1a1430;color:#f0ebff;border-color:#3b3360}.mmgate p,.mmgate .chk,.mmgate .sw{color:#b0a8d8}.mmgate .pri[disabled]{background:#3b3360}.mmgate .tabs{border-color:#3b3360}.mmgate .brand{color:#b79cff}}";

  var G_SVG = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

  /* ---------- profil: nama, ID unik, bio ---------- */
  function validHandle(h) { return /^[a-z0-9._-]{4,20}$/.test(h); }
  async function hasHandle(u) { try { var s = await fs.collection("profiles").doc(u.uid).get(); return s.exists && !!s.data().handle; } catch (e) { return true; } }
  async function showSetupIn(card, u, first) {
    var prof = {}; try { var s0 = await fs.collection("profiles").doc(u.uid).get(); if (s0.exists) prof = s0.data() || {}; } catch (e) {}
    var base = String(prof.name || u.displayName || (u.email || "").split("@")[0] || "").trim().slice(0, 24);
    card.innerHTML = '<h1>' + (first ? 'Lengkapi profilmu' : (prof.handle ? 'Edit profil' : 'Buat ID M&amp;M\'s-mu')) + '</h1><p>Nama dan ID ini dilihat temanmu. Teman bisa mencarimu lewat ID.</p>' +
      '<div class="pav" id="spAv">?</div>' +
      '<label class="fl" for="spName">Nama tampil</label><input id="spName" type="text" maxlength="24" autocomplete="nickname" placeholder="Namamu">' +
      '<label class="fl" for="spId">ID M&amp;M\'s</label><div class="idw"><span>@</span><input id="spId" type="text" maxlength="20" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="idunikmu"></div>' +
      '<div class="hint" id="spHint">4-20 karakter: huruf kecil, angka, titik, garis bawah, atau strip.</div>' +
      '<label class="fl" for="spBio">Bio (opsional)</label><textarea id="spBio" maxlength="80" placeholder="Ceritakan sedikit tentang dirimu"></textarea>' +
      '<label class="fl" for="spBd">Ulang tahun (opsional, tahun tidak disimpan)</label><input id="spBd" type="date">' +
      '<div class="err" id="spErr" role="alert"></div>' +
      '<button type="button" class="pri" id="spSave">' + (first || !prof.handle ? 'Simpan &amp; mulai' : 'Simpan') + '</button>' +
      '<button type="button" class="lnk" id="spSkip" ' + (first ? 'hidden' : '') + '>' + (prof.handle ? 'Batal' : 'Nanti saja') + '</button>';
    var $ = function (i) { return card.querySelector("#" + i); };
    $("spName").value = base; $("spBio").value = String(prof.bio || "");
    if (/^\d\d-\d\d$/.test(prof.bd || "")) $("spBd").value = "2000-" + prof.bd;
    var slug = base.toLowerCase().replace(/[^a-z0-9._-]+/g, "").slice(0, 14);
    $("spId").value = prof.handle || (slug.length >= 3 ? slug + Math.floor(100 + Math.random() * 900) : "");
    function ini() { var n = $("spName").value.trim(); $("spAv").textContent = (n ? n.charAt(0) : "?").toUpperCase(); }
    ini(); $("spName").addEventListener("input", ini);
    var timer = null, state = "unknown";
    function hint(txt, cls) { $("spHint").textContent = txt; $("spHint").className = "hint " + (cls || ""); }
    function check() {
      var h = $("spId").value.trim().toLowerCase().replace(/^@/, ""); $("spId").value = h; state = "unknown";
      if (!h) { hint("4-20 karakter: huruf kecil, angka, titik, garis bawah, atau strip."); return; }
      if (!validHandle(h)) { hint("Pakai 4-20 karakter: a-z, 0-9, titik, garis bawah, strip.", "bad"); state = "bad"; return; }
      if (h === prof.handle) { hint("ID kamu saat ini.", "good"); state = "ok"; return; }
      hint("Memeriksa…"); clearTimeout(timer);
      timer = setTimeout(async function () {
        try { var d = await fs.collection("handles").doc(h).get(); if ($("spId").value.trim().toLowerCase() !== h) return; if (d.exists && d.data().uid !== u.uid) { hint("ID itu sudah dipakai. Coba yang lain.", "bad"); state = "bad"; } else { hint("ID tersedia ✓", "good"); state = "ok"; } }
        catch (e) { hint("Belum bisa memeriksa sekarang. Tetap bisa disimpan.", ""); }
      }, 450);
    }
    $("spId").addEventListener("input", check); check();
    return new Promise(function (resolve) {
      $("spSkip").onclick = function () { try { localStorage.setItem("mm-setup-skip", String(Date.now())); } catch (e) {} resolve(false); };
      $("spSave").onclick = async function () {
        var name = $("spName").value.trim().slice(0, 24), h = $("spId").value.trim().toLowerCase().replace(/^@/, ""), bio = $("spBio").value.trim().slice(0, 80), bdv = $("spBd").value, err = $("spErr");
        err.textContent = "";
        if (!name) { err.textContent = "Isi nama tampil dulu."; return; }
        if (!validHandle(h)) { err.textContent = "ID belum valid (4-20 karakter: a-z, 0-9, . _ -)."; return; }
        if (state === "bad") { err.textContent = "ID itu sudah dipakai."; return; }
        $("spSave").disabled = true;
        try {
          var b = fs.batch(), pr = { name: name, handle: h, bio: bio, bd: /^\d{4}-\d\d-\d\d$/.test(bdv) ? bdv.slice(5) : "", at: prof.at || Date.now() };
          if (h !== prof.handle) b.set(fs.collection("handles").doc(h), { uid: u.uid });
          if (prof.handle && prof.handle !== h) b.delete(fs.collection("handles").doc(prof.handle));
          b.set(fs.collection("profiles").doc(u.uid), pr, { merge: true });
          await b.commit();
          try { await u.updateProfile({ displayName: name }); } catch (e) {}
          try { if (window.mmSetMyName) window.mmSetMyName(name, true); } catch (e) {}
          resolve(true);
        } catch (e) {
          var taken = e && e.code === "permission-denied";
          err.textContent = taken ? "Gagal menyimpan. ID mungkin sudah dipakai, atau database belum siap." : msg(e);
          $("spSave").disabled = false; $("spSkip").hidden = false;
        }
      };
    });
  }
  async function showSetupOverlay(u) {
    var g = document.createElement("div"); g.className = "mmgate"; g.id = "mmSetup";
    var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
    var c = document.createElement("div"); c.className = "card"; g.appendChild(c); document.body.appendChild(g);
    var okS = await showSetupIn(c, u, false); g.remove(); st.remove(); if (okS) { try { document.dispatchEvent(new Event("mm-profile-changed")); } catch (e) {} }
  }

  function showGate() {
    return new Promise(function (resolve) {
      var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
      var g = document.createElement("div"); g.className = "mmgate"; g.id = "mmGate";
      g.innerHTML = '<div class="card"><img class="logo" src="' + LOGO + '" alt=""><div class="brand">M&amp;M\'s</div>' +
        '<div class="tabs" id="mmTabs" role="tablist"><button type="button" id="mmTabIn" role="tab" aria-selected="true">Log in</button><button type="button" id="mmTabUp" role="tab" aria-selected="false">Sign up</button></div>' +
        '<p id="mmSub">Masuk agar chat dan progresmu tersimpan di semua perangkat.</p>' +
        '<div class="ph" id="mmEm">' +
        '<input id="mmEmail" type="email" autocomplete="email" placeholder="Email" inputmode="email">' +
        '<div class="pw"><input id="mmPass" type="password" autocomplete="current-password" placeholder="Kata sandi"><button type="button" class="eye" id="mmEye" aria-label="Tampilkan kata sandi">👁</button></div>' +
        '<div class="pw" id="mmPass2w" hidden><input id="mmPass2" type="password" autocomplete="new-password" placeholder="Ulangi kata sandi"></div>' +
        '<div class="foot"><label class="chk" id="mmRemW"><input type="checkbox" id="mmRemember" checked> Tetap masuk otomatis</label><button type="button" class="lnk" id="mmReset">Lupa kata sandi?</button></div>' +
        '</div>' +
        '<div class="ph" id="mmPh" hidden>' +
        '<div class="row2"><select id="mmCc" aria-label="Kode negara"><option value="62">🇮🇩 +62 Indonesia</option><option value="81">🇯🇵 +81 Jepang</option></select></div>' +
        '<input id="mmNum" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="Nomor HP, mis. 812 3456 7890">' +
        '<input id="mmOtp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Kode 6 angka dari SMS" hidden></div>' +
        '<div class="err" id="mmErr" role="alert"></div>' +
        '<button type="button" class="pri" id="mmGo" disabled>Log in</button>' +
        '<div class="or" id="mmOr">atau</div>' +
        '<button type="button" class="goo" id="mmGoogle">' + G_SVG + ' Masuk dengan Google</button>' +
        '<button type="button" class="goo" id="mmPhoneBtn">📱 Masuk dengan nomor HP</button>' +
        '<button type="button" class="lnk" id="mmPhBack" hidden>Kembali ke email</button>' +
        '<button type="button" class="lnk" id="mmResend" hidden>Kirim ulang kode</button>' +
        '<div id="mmRecap"></div>' +
        '<div class="sw" id="mmSwW"><span id="mmSwT">Belum punya akun?</span> <button type="button" id="mmSwitch">Sign up</button></div>' +
        '<button type="button" class="lnk" id="mmGuest">Lanjut tanpa masuk (tanpa sinkron)</button></div>';
      document.body.appendChild(g);
      var $ = function (i) { return document.getElementById(i); };
      var reg = false, busy = false;
      function say(t, ok) { $("mmErr").textContent = t || ""; $("mmErr").className = "err" + (ok ? " ok" : ""); }
      function lock(v) { busy = v; ["mmGoogle", "mmReset", "mmPhoneBtn"].forEach(function (i) { $(i).disabled = v; }); refreshGo(); }
      function finalize(u) { try { clearInterval(cdT); } catch (e) {} g.remove(); st.remove(); resolve(u || null); }
      async function done(u) {
        try { clearInterval(cdT); } catch (e) {}
        try { if (u && fs && !(await hasHandle(u))) { g.querySelector(".card").innerHTML = ""; await showSetupIn(g.querySelector(".card"), u, true); } } catch (e) {}
        finalize(u);
      }
      function refreshGo() {
        var ok = true;
        if (!phoneMode) { var em = $("mmEmail").value.trim(), pw = $("mmPass").value; ok = /.+@.+\..+/.test(em) && pw.length >= 6 && (!reg || $("mmPass2").value.length >= 6); }
        $("mmGo").disabled = busy || !ok;
      }
      function mode(r) {
        reg = r; $("mmGo").textContent = r ? "Sign up" : "Log in";
        $("mmTabIn").setAttribute("aria-selected", r ? "false" : "true"); $("mmTabUp").setAttribute("aria-selected", r ? "true" : "false");
        $("mmSwT").textContent = r ? "Sudah punya akun?" : "Belum punya akun?"; $("mmSwitch").textContent = r ? "Log in" : "Sign up";
        $("mmPass").autocomplete = r ? "new-password" : "current-password"; $("mmPass2w").hidden = !r; $("mmReset").hidden = r; $("mmRemW").hidden = r;
        $("mmSub").textContent = r ? "Buat akun baru. Setelah itu kamu bisa memilih nama, ID, dan bio." : "Masuk agar chat dan progresmu tersimpan di semua perangkat."; say(""); refreshGo();
      }
      ["mmEmail", "mmPass", "mmPass2"].forEach(function (i) { $(i).addEventListener("input", refreshGo); });
      $("mmEye").onclick = function () { var s = $("mmPass").type === "password"; $("mmPass").type = s ? "text" : "password"; $("mmPass2").type = s ? "text" : "password"; $("mmEye").style.opacity = s ? ".5" : "1"; };
      $("mmTabIn").onclick = function () { mode(false); }; $("mmTabUp").onclick = function () { mode(true); };
      $("mmSwitch").onclick = function () { mode(!reg); };
      $("mmGuest").onclick = function () { done(null); };
      $("mmGo").onclick = async function () {
        if (busy) return;
        if (phoneMode) { if (conf) verifyCode(); else sendCode(); return; }
        var em = $("mmEmail").value.trim(), pw = $("mmPass").value;
        if (!em) { say("Isi email dulu."); return; }
        if (reg && pw !== $("mmPass2").value) { say("Kata sandi tidak sama."); return; }
        lock(true); say("");
        try {
          try { await auth.setPersistence(reg || $("mmRemember").checked ? fb.auth.Auth.Persistence.LOCAL : fb.auth.Auth.Persistence.SESSION); } catch (e0) {}
          var cred = reg ? await auth.createUserWithEmailAndPassword(em, pw) : await auth.signInWithEmailAndPassword(em, pw);
          if (reg && cred.user && cred.user.sendEmailVerification) { try { await cred.user.sendEmailVerification(); } catch (e) {} }
          done(cred.user);
        } catch (e) { say(msg(e)); lock(false); }
      };
      $("mmPass").addEventListener("keydown", function (e) { if (e.key === "Enter") $("mmGo").click(); });
      $("mmReset").onclick = async function () {
        var em = $("mmEmail").value.trim();
        if (!em) { say("Isi email dulu, lalu tekan Lupa kata sandi."); return; }
        lock(true);
        try { await auth.sendPasswordResetEmail(em); say("Tautan reset dikirim ke email kamu.", true); } catch (e) { say(msg(e)); }
        lock(false);
      };

      var phoneMode = false, conf = null, verifier = null, cdT = null; refreshGo();
      function e164(cc, raw) {
        var d = String(raw || "").replace(/[^\d]/g, "");
        if (d.indexOf("00" + cc) === 0) d = d.slice(2 + cc.length); else if (d.indexOf(cc) === 0) d = d.slice(cc.length);
        d = d.replace(/^0+/, "");
        var okLen = cc === "62" ? (d.length >= 8 && d.length <= 12) : (d.length >= 9 && d.length <= 10);
        return okLen ? "+" + cc + d : null;
      }
      function maskNum(n) { return n.length > 8 ? n.slice(0, n.length - 8) + " " + n.slice(n.length - 8, n.length - 6) + "\u2022\u2022\u2022\u2022" + n.slice(-2) : n; }
      function show(id, v) { $(id).hidden = !v; }
      function setPhone(on) {
        phoneMode = on; conf = null; clearInterval(cdT);
        show("mmPh", on); show("mmEm", !on); show("mmGoogle", !on); show("mmPhoneBtn", !on); show("mmOr", !on);
        show("mmSwW", !on); show("mmTabs", !on); show("mmPhBack", on); show("mmResend", false); show("mmOtp", false);
        $("mmNum").hidden = false; $("mmCc").disabled = false; $("mmNum").disabled = false;
        $("mmGo").textContent = on ? "Kirim kode" : (reg ? "Sign up" : "Log in"); say(""); refreshGo();
        $("mmSub").textContent = on ? "Kami kirim kode lewat SMS. Mendukung nomor Indonesia (+62) dan Jepang (+81)." : (reg ? "Buat akun baru. Setelah itu kamu bisa memilih nama, ID, dan bio." : "Masuk agar chat dan progresmu tersimpan di semua perangkat.");
      }
      function newVerifier() {
        try { if (verifier) verifier.clear(); } catch (e) {}
        $("mmRecap").textContent = "";
        verifier = new fb.auth.RecaptchaVerifier("mmRecap", { size: "invisible" });
        return verifier;
      }
      function countdown() {
        var n = 45; show("mmResend", true); $("mmResend").disabled = true; $("mmResend").textContent = "Kirim ulang kode (" + n + ")";
        clearInterval(cdT);
        cdT = setInterval(function () { n--; if (n <= 0) { clearInterval(cdT); $("mmResend").disabled = false; $("mmResend").textContent = "Kirim ulang kode"; } else $("mmResend").textContent = "Kirim ulang kode (" + n + ")"; }, 1000);
      }
      async function sendCode() {
        var num = e164($("mmCc").value, $("mmNum").value);
        if (!num) { say($("mmCc").value === "62" ? "Nomor tidak valid. Contoh: 812 3456 7890 atau 0812 3456 7890." : "Nomor tidak valid. Contoh: 90 1234 5678 atau 090 1234 5678."); return; }
        lock(true); say("");
        try {
          try { auth.languageCode = "id"; } catch (e) {}
          conf = await auth.signInWithPhoneNumber(num, newVerifier());
          show("mmOtp", true); $("mmOtp").value = ""; $("mmOtp").focus(); $("mmNum").disabled = true; $("mmCc").disabled = true;
          $("mmGo").textContent = "Verifikasi"; say("Kode dikirim ke " + maskNum(num) + ".", true); countdown();
        } catch (e) { conf = null; say(msg(e)); try { if (verifier) verifier.clear(); } catch (e2) {} }
        lock(false);
      }
      async function verifyCode() {
        var c = $("mmOtp").value.replace(/\D/g, "");
        if (c.length !== 6) { say("Isi 6 angka kode SMS."); return; }
        lock(true); say("");
        try { var r = await conf.confirm(c); done(r.user); } catch (e) { say(msg(e)); lock(false); }
      }
      $("mmPhoneBtn").onclick = function () { setPhone(true); };
      $("mmPhBack").onclick = function () { setPhone(false); };
      $("mmResend").onclick = function () { if (busy) return; conf = null; $("mmNum").disabled = false; $("mmCc").disabled = false; sendCode(); };
      $("mmOtp").addEventListener("keydown", function (e) { if (e.key === "Enter") $("mmGo").click(); });
      $("mmNum").addEventListener("keydown", function (e) { if (e.key === "Enter") $("mmGo").click(); });
      $("mmGoogle").onclick = async function () {
        if (busy) return;
        lock(true); say("");
        var prov = new fb.auth.GoogleAuthProvider();
        try { var r = await auth.signInWithPopup(prov); done(r.user); }
        catch (e) {
          if (e && (e.code === "auth/popup-blocked" || e.code === "auth/operation-not-supported-in-this-environment")) { try { await auth.signInWithRedirect(prov); return; } catch (e2) { e = e2; } }
          say(msg(e)); lock(false);
        }
      };
    });
  }

  async function boot() {
    if (!configured) return { id: async function () { return null; } };
    try { await loadSdk(); } catch (e) { return { id: async function () { return null; } }; }
    try { var rr = await auth.getRedirectResult(); if (rr && rr.user) curUser = rr.user; } catch (e) {}
    var u = curUser || await new Promise(function (res) { var off = auth.onAuthStateChanged(function (x) { off(); res(x); }); });
    var fromGate = !u;
    if (!u) u = await showGate();
    curUser = u;
    if (u && !fromGate) { var skipAt = 0; try { skipAt = +localStorage.getItem("mm-setup-skip") || 0; } catch (e) {} if (Date.now() - skipAt > 3 * 86400000) hasHandle(u).then(function (ok) { if (!ok) showSetupOverlay(u); }); }
    if (u) { try { var nm = u.displayName || (u.email || "").split("@")[0]; if (nm && window.mmSetMyName) window.mmSetMyName(nm); } catch (e) {} }
    if (u) { window.mmCtx = { fb: fb, fs: fs, auth: auth, user: u }; try { document.dispatchEvent(new Event("mm-ready")); } catch (e) {} }
    window.mmEditProfile = function () { if (curUser) showSetupOverlay(curUser); };
    installLogout();
    return {
      id: async function () { return u ? u.uid : null; },
      email: async function () { return u ? u.email : null; },
      name: async function () { return u ? (u.displayName || u.email) : null; }
    };
  }

  function installLogout() {
    function add() {
      var anchor = document.getElementById("btnBackup");
      if (!anchor || document.getElementById("mmLogout")) return !!document.getElementById("mmLogout");
      var b = document.createElement("button"); b.type = "button"; b.className = "pill"; b.id = "mmLogout";
      b.textContent = curUser ? "Keluar (" + (curUser.email || mask4(curUser.phoneNumber) || "akun") + ")" : "Masuk / daftar";
      b.onclick = async function () {
        if (curUser) { try { await auth.signOut(); } catch (e) {} }
        try { Object.keys(localStorage).filter(function (k) { return k.indexOf("shoeixp-") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
        location.reload();
      };
      if (curUser) { var ep = document.createElement("button"); ep.type = "button"; ep.className = "pill"; ep.id = "mmEditP"; ep.textContent = "Edit profil (nama, ID, bio, ulang tahun)"; ep.onclick = function () { if (window.mmEditProfile) window.mmEditProfile(); }; anchor.parentNode.appendChild(ep); }
      anchor.parentNode.appendChild(b);
      if (curUser) {
        var d = document.createElement("button"); d.type = "button"; d.className = "pill"; d.id = "mmDelete"; d.textContent = "Hapus akun & data";
        d.onclick = function () { deleteAccount(); };
        anchor.parentNode.appendChild(d);
      }
      return true;
    }
    var n = 0, t = setInterval(function () { if (add() || ++n > 40) clearInterval(t); }, 500);
  }

  async function deleteAccount() {
    if (!curUser) return;
    if (!window.confirm("Hapus akun dan SEMUA datamu di server secara permanen? Ini tidak bisa dibatalkan.")) return;
    try {
      if (window.mmFriends && window.mmFriends.purge) { try { await window.mmFriends.purge(); } catch (e) {} }
      var snap = await fs.collection("data/users/" + curUser.uid).get();
      var jobs = []; snap.forEach(function (d) { jobs.push(d.ref.delete()); });
      await Promise.all(jobs);
      await curUser.delete();
    } catch (e) {
      if (e && e.code === "auth/requires-recent-login") {
        window.alert("Demi keamanan, masuk ulang dulu lalu tekan Hapus akun lagi.");
        try { await auth.signOut(); } catch (e2) {}
        location.reload(); return;
      }
      window.alert(msg(e)); return;
    }
    try { Object.keys(localStorage).filter(function (k) { return k.indexOf("shoeixp-") === 0; }).forEach(function (k) { localStorage.removeItem(k); }); } catch (e) {}
    window.alert("Akun dan data sudah dihapus.");
    location.reload();
  }
  window.mmDeleteAccount = deleteAccount;

  function dbCap() {
    function col(path) {
      return {
        doc: function (k) {
          var ref = fs.collection(path).doc(k);
          function wrap(p) { return p.catch(function (e) { var c = e && e.code; if (c === "permission-denied" || c === "unauthenticated") e.code = "not_granted"; else if (c === "resource-exhausted") e.code = "quota_exceeded"; else if (c === "invalid-argument") e.code = "invalid_argument"; throw e; }); }
          return {
            get: function () { return wrap(ref.get().then(function (s) { return { exists: s.exists, data: function () { return s.data(); } }; })); },
            set: function (o) { return wrap(ref.set(o)); },
            delete: function () { return wrap(ref.delete()); }
          };
        }
      };
    }
    return { collection: col };
  }

  var caps = {
    user: function () { if (!userP) userP = boot(); return userP; },
    db: async function () { await caps.user(); if (!fs || !curUser) throw Object.assign(new Error("no db"), { code: "capability_disabled" }); return dbCap(); },
    downloads: async function () {
      return { save: async function (o) {
        var blob = new Blob([o.data], { type: "application/json" }), a = document.createElement("a");
        a.href = URL.createObjectURL(blob); a.download = o.filename || "backup.json"; document.body.appendChild(a); a.click();
        setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      } };
    }
  };
  window.claude = window.claude || {};
  window.claude.use = function (name) {
    if (caps[name]) { try { return Promise.resolve(caps[name]()); } catch (e) { return Promise.reject(e); } }
    return Promise.reject(Object.assign(new Error("capability " + name + " not available"), { code: "capability_disabled" }));
  };
})();
