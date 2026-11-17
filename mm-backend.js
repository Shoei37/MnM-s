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

  var CSS = ".mmgate{position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:20px;background:linear-gradient(160deg,#efe6ff,#fff3d6);font-family:'Noto Sans JP',system-ui,sans-serif;color:#2a2150}" +
    ".mmgate .card{width:100%;max-width:360px;background:#fff;border-radius:22px;padding:26px 22px;box-shadow:0 10px 40px rgba(60,30,120,.18);display:flex;flex-direction:column;gap:12px}" +
    ".mmgate h1{margin:0;font-size:26px;text-align:center;font-family:Fredoka,system-ui,sans-serif}" +
    ".mmgate p{margin:0;font-size:13px;color:#6b6490;text-align:center}" +
    ".mmgate input{width:100%;box-sizing:border-box;border:1.5px solid #ddd5f5;border-radius:12px;padding:13px 14px;font-size:16px;background:#faf8ff;color:inherit}" +
    ".mmgate button{border:0;border-radius:12px;padding:13px;font-size:15px;font-weight:700;cursor:pointer;font-family:inherit}" +
    ".mmgate .pri{background:#06c755;color:#fff}.mmgate .goo{background:#fff;color:#333;border:1.5px solid #ddd5f5;display:flex;gap:10px;justify-content:center;align-items:center}" +
    ".mmgate .lnk{text-decoration:none;background:none;color:#6b4fd6;font-weight:600;padding:6px;font-size:13px}.mmgate .err{color:#d93a4a;font-size:13px;min-height:16px;text-align:center}" +
    ".mmgate .ok{color:#0a8f43}.mmgate .or{display:flex;align-items:center;gap:10px;color:#9a94b8;font-size:12px}.mmgate .or:before,.mmgate .or:after{content:'';flex:1;height:1px;background:#e6e0f5}" +
    ".mmgate button[disabled]{opacity:.6}.mmgate .ph{display:flex;flex-direction:column;gap:12px}.mmgate [hidden]{display:none!important}.mmgate select{width:100%;box-sizing:border-box;border:1.5px solid #ddd5f5;border-radius:12px;padding:13px 14px;font-size:16px;background:#faf8ff;color:inherit}" +
    "@media(prefers-color-scheme:dark){.mmgate{background:linear-gradient(160deg,#1b1738,#241a33);color:#f0ebff}.mmgate .card{background:#27213f}.mmgate input{background:#1e1934;border-color:#3b3360}.mmgate .goo{background:#1e1934;color:#f0ebff;border-color:#3b3360}.mmgate p{color:#b0a8d8}}";

  var G_SVG = '<svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"/><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z"/><path fill="#FBBC05" d="M10.5 28.7A14.5 14.5 0 019.5 24c0-1.6.3-3.2.8-4.7l-7.9-6.1A24 24 0 000 24c0 3.9.9 7.5 2.6 10.8l7.9-6.1z"/><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"/></svg>';

  function showGate() {
    return new Promise(function (resolve) {
      var st = document.createElement("style"); st.textContent = CSS; document.head.appendChild(st);
      var g = document.createElement("div"); g.className = "mmgate"; g.id = "mmGate";
      g.innerHTML = '<div class="card"><h1>M&amp;M\'s</h1><p id="mmSub">Masuk agar chat dan progresmu tersimpan di semua perangkat.</p>' +
        '<button type="button" class="goo" id="mmGoogle">' + G_SVG + ' Masuk dengan Google</button>' +
        '<button type="button" class="goo" id="mmPhoneBtn">\ud83d\udcf1 Masuk dengan nomor HP</button>' +
        '<div class="or" id="mmOr">atau email</div>' +
        '<div class="ph" id="mmEm">' +
        '<input id="mmEmail" type="email" autocomplete="email" placeholder="Email" inputmode="email">' +
        '<input id="mmPass" type="password" autocomplete="current-password" placeholder="Kata sandi">' +
        '</div>' +
        '<div class="ph" id="mmPh" hidden>' +
        '<div class="row2"><select id="mmCc" aria-label="Kode negara"><option value="62">\ud83c\uddee\ud83c\udde9 +62 Indonesia</option><option value="81">\ud83c\uddef\ud83c\uddf5 +81 Jepang</option></select></div>' +
        '<input id="mmNum" type="tel" inputmode="tel" autocomplete="tel-national" placeholder="Nomor HP, mis. 812 3456 7890">' +
        '<input id="mmOtp" type="text" inputmode="numeric" maxlength="6" autocomplete="one-time-code" placeholder="Kode 6 angka dari SMS" hidden>' +
        '</div>' +
        '<div class="err" id="mmErr" role="alert"></div>' +
        '<button type="button" class="pri" id="mmGo">Masuk</button>' +
        '<button type="button" class="lnk" id="mmSwitch">Belum punya akun? Daftar</button>' +
        '<button type="button" class="lnk" id="mmReset">Lupa kata sandi?</button>' +
        '<button type="button" class="lnk" id="mmPhBack" hidden>Kembali ke email</button>' +
        '<button type="button" class="lnk" id="mmResend" hidden>Kirim ulang kode</button>' +
        '<div id="mmRecap"></div>' +
        '<button type="button" class="lnk" id="mmGuest">Lanjut tanpa masuk (tanpa sinkron)</button></div>';
      document.body.appendChild(g);
      var $ = function (i) { return document.getElementById(i); };
      var reg = false, busy = false;
      function say(t, ok) { $("mmErr").textContent = t || ""; $("mmErr").className = "err" + (ok ? " ok" : ""); }
      function lock(v) { busy = v; ["mmGoogle", "mmGo", "mmReset", "mmPhoneBtn"].forEach(function (i) { $(i).disabled = v; }); }
      function done(u) { try { clearInterval(cdT); } catch (e) {} g.remove(); st.remove(); resolve(u || null); }
      function mode(r) {
        reg = r; $("mmGo").textContent = r ? "Daftar" : "Masuk";
        $("mmSwitch").textContent = r ? "Sudah punya akun? Masuk" : "Belum punya akun? Daftar";
        $("mmPass").autocomplete = r ? "new-password" : "current-password"; say("");
      }
      $("mmSwitch").onclick = function () { mode(!reg); };
      $("mmGuest").onclick = function () { done(null); };
      $("mmGo").onclick = async function () {
        if (busy) return;
        if (phoneMode) { if (conf) verifyCode(); else sendCode(); return; }
        var em = $("mmEmail").value.trim(), pw = $("mmPass").value;
        if (!em) { say("Isi email dulu."); return; }
        lock(true); say("");
        try {
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

      var phoneMode = false, conf = null, verifier = null, cdT = null;
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
        show("mmSwitch", !on); show("mmReset", !on); show("mmPhBack", on); show("mmResend", false); show("mmOtp", false);
        $("mmNum").hidden = false; $("mmCc").disabled = false; $("mmNum").disabled = false;
        $("mmGo").textContent = on ? "Kirim kode" : (reg ? "Daftar" : "Masuk"); say("");
        $("mmSub").textContent = on ? "Kami kirim kode lewat SMS. Mendukung nomor Indonesia (+62) dan Jepang (+81)." : "Masuk agar chat dan progresmu tersimpan di semua perangkat.";
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
    if (!u) u = await showGate();
    curUser = u;
    if (u) { window.mmCtx = { fb: fb, fs: fs, auth: auth, user: u }; try { document.dispatchEvent(new Event("mm-ready")); } catch (e) {} }
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
