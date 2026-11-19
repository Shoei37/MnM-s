/* M&M's — teman sungguhan (chat antar pengguna) di atas Firebase Auth + Firestore.
   Hanya aktif di versi website/Play Store setelah masuk (butuh window.mmCtx dari mm-backend.js). */
(function () {
  "use strict";
  var AL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", STK = ["😊", "😂", "🥰", "😭", "👍", "🙏", "🎉", "❤️", "😴", "🤔", "🔥", "👋"],
    PACKS = [
      { i: "😊", l: STK.concat(["😎", "🥳", "😍", "😅", "🤣", "😇", "🙌", "💪"]) },
      { i: "❤️", l: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🤍", "💖", "💕", "😘", "😻", "💌", "🌹", "🥺", "🫶", "💞"] },
      { i: "🐱", l: ["🐱", "🐶", "🐰", "🐻", "🐼", "🐨", "🦊", "🐸", "🐧", "🐥", "🦄", "🐷", "🐵", "🐙", "🦋", "🐢"] },
      { i: "🍜", l: ["🍜", "🍣", "🍙", "🍛", "🍱", "🍰", "🍩", "🍓", "🍺", "☕", "🧋", "🍕", "🍔", "🍟", "🥟", "🍡"] }
    ];
  var ctx = null, fs = null, FV = null, me = null, myName = "", myCode = "", started = false;
  var groups = [], friends = [], reqIn = [], reqOut = [], names = {}, unsubs = [], chatUn = null, chat = null, view = "none", root = null;

  function $(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; }
  function ms(t) { return !t ? Date.now() : (typeof t === "number" ? t : (t.toMillis ? t.toMillis() : Date.now())); }
  function pairId(a, b) { return a < b ? a + "_" + b : b + "_" + a; }
  function other(f) { return f.members[0] === me ? f.members[1] : f.members[0]; }
  function hhmm(t) { var d = new Date(ms(t)); return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2); }
  function dayKey(t) { var d = new Date(ms(t)); return d.getFullYear() + "-" + d.getMonth() + "-" + d.getDate(); }
  function dayLabel(t) { var d = new Date(ms(t)); return d.getDate() + "/" + (d.getMonth() + 1) + "/" + d.getFullYear(); }
  function dispCode(c) { return "MM-" + c; }
  function normCode(s) { return String(s || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^MM/, "").replace(/[01OI]/g, function (x) { return ({ "0": "O", "1": "I" })[x] || x; }).slice(0, 8); }

  var CSS = ".mfr{position:fixed;inset:0;z-index:9000;display:flex;justify-content:center;background:rgba(0,0,0,.45)}" +
    ".mfr .mfp{width:100%;max-width:440px;height:100%;display:flex;flex-direction:column;background:var(--shell-bg,#eef0f7);color:var(--fg,#1d2530);font-family:var(--font,system-ui,sans-serif)}" +
    ".mfr .mfh{display:flex;align-items:center;gap:8px;padding:10px 12px;background:var(--bar,#f7f8fa);border-bottom:1px solid var(--bar-line,#dde1e7);min-height:52px}" +
    ".mfr .mfh h2{flex:1;margin:0;font-size:17px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".mfr button{font-family:inherit;color:inherit}" +
    ".mfr .mfb{border:0;background:none;font-size:20px;min-width:40px;min-height:40px;cursor:pointer;border-radius:10px}" +
    ".mfr .mfbody{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:10px}" +
    ".mfr .mfc{background:var(--card,#fff);border:1px solid var(--card-line,#dfe3ef);border-radius:16px;padding:12px 14px}" +
    ".mfr .mfs{margin:6px 2px 0;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted,#6b7480)}" +
    ".mfr .mfcode{font-size:24px;font-weight:800;letter-spacing:.08em;font-variant-numeric:tabular-nums}" +
    ".mfr .mfrow{display:flex;align-items:center;gap:10px;width:100%;text-align:left;padding:10px 12px;border:1px solid var(--card-line,#dfe3ef);background:var(--card,#fff);border-radius:14px;cursor:pointer;min-height:56px}" +
    ".mfr .mfav{width:42px;height:42px;border-radius:50%;display:grid;place-items:center;font-weight:800;color:#fff;flex:none}" +
    ".mfr .mfn{font-weight:700;font-size:15px}.mfr .mfsub{font-size:12px;color:var(--muted,#6b7480);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}" +
    ".mfr .mfmid{flex:1;min-width:0}.mfr .mfdot{width:10px;height:10px;border-radius:50%;background:var(--badge,#f0456a);flex:none}" +
    ".mfr .mfpill{border:1px solid var(--bar-line,#dde1e7);background:transparent;border-radius:999px;padding:8px 14px;font-size:13px;cursor:pointer;min-height:40px}" +
    ".mfr .mfpri{background:var(--me,#7fdb5a);color:var(--me-fg,#10230a);border:0;font-weight:700}" +
    ".mfr .mfin{width:100%;box-sizing:border-box;border-radius:12px;border:1px solid var(--bar-line,#dde1e7);padding:11px 12px;font-size:16px;background:var(--page,#fff);color:inherit;font-family:inherit}" +
    ".mfr .mfmsgs{flex:1;min-height:0;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:6px;background:var(--chat-bg,#8fa9cf)}" +
    ".mfr .mfm{display:flex;align-items:flex-end;gap:6px}.mfr .mfm.me{justify-content:flex-end}" +
    ".mfr .mfbb{max-width:72%;padding:8px 12px;border-radius:18px;line-height:1.5;overflow-wrap:anywhere;background:var(--them,#fff);color:var(--them-fg,#1d2530);border-top-left-radius:4px;white-space:pre-wrap}" +
    ".mfr .mfm.me .mfbb{background:var(--me,#7fdb5a);color:var(--me-fg,#10230a);border-radius:18px;border-top-right-radius:4px}" +
    ".mfr .mfbb.stk{background:transparent!important;font-size:56px;line-height:1.1;padding:0}" +
    ".mfr .mft{font-size:10px;color:var(--stamp,#33425a);text-align:right;flex:none}" +
    ".mfr .mfday{align-self:center;background:var(--chip,rgba(40,56,84,.32));color:#fff;font-size:11px;padding:3px 12px;border-radius:999px}" +
    ".mfr .mfcmp{display:flex;gap:8px;padding:8px 12px calc(8px + env(safe-area-inset-bottom,0px));background:var(--bar,#f7f8fa);border-top:1px solid var(--bar-line,#dde1e7)}" +
    ".mfr .mfcmp input{flex:1;min-width:0;height:40px;border-radius:20px;border:0;background:var(--page,#fff);color:inherit;font-size:16px;padding:0 14px;font-family:inherit}" +
    ".mfr .mfstk{display:flex;gap:4px;flex-wrap:wrap;padding:8px 12px;background:var(--bar,#f7f8fa);border-top:1px solid var(--bar-line,#dde1e7)}" +
    ".mfr .mfstk button{border:0;background:none;font-size:28px;min-width:44px;min-height:44px;cursor:pointer}" +
    ".mfr .mfnote{padding:10px 12px;font-size:13px;text-align:center;background:var(--bar,#f7f8fa);color:var(--muted,#6b7480)}" +
    ".mfr .mfsheet{position:absolute;left:0;right:0;bottom:0;max-width:440px;margin:0 auto;background:var(--bar,#f7f8fa);border-radius:18px 18px 0 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom,0px));display:flex;flex-direction:column;gap:8px;box-shadow:0 -8px 30px rgba(0,0,0,.3)}" +
    ".mfr .mfsheet .mfpill{text-align:center}.mfr .mfwarn{color:#d93a4a}" +
    ".mfr .mfok{color:#0a8f43}.mfr .mfmsg{font-size:13px;min-height:16px}" +
    ".mfrow.mfent{} .mfent .mfbadge{min-width:20px;height:20px;border-radius:10px;background:var(--badge,#f0456a);color:#fff;font-size:11px;font-weight:700;display:grid;place-items:center;padding:0 6px}" +
    ".mfr .mftabs{display:flex;gap:4px;background:var(--tint,#eef0f7);border-radius:12px;padding:3px;margin-top:6px}" +
    ".mfr .mftabs button{flex:1;border:0;background:none;border-radius:10px;padding:9px 6px;font-size:14px;font-weight:700;cursor:pointer;color:var(--muted,#6b7480)}" +
    ".mfr .mftabs button[aria-selected=true]{background:var(--card,#fff);color:var(--fg,#1d2530);box-shadow:0 1px 3px rgba(0,0,0,.12)}" +
    ".mfr .mfqr{display:grid;place-items:center;padding:10px 0 2px}.mfr .mfqr svg{border-radius:10px;border:1px solid var(--card-line,#dfe3ef)}" +
    ".mfr .mfcam{position:relative;border-radius:14px;overflow:hidden;background:#000;aspect-ratio:1/1;margin-top:8px}.mfr .mfcam video{width:100%;height:100%;object-fit:cover}" +
    ".mfr .mfcam i{position:absolute;inset:18%;border:3px solid rgba(255,255,255,.9);border-radius:16px;box-shadow:0 0 0 999px rgba(0,0,0,.35);pointer-events:none}" +
    ".mfr .mfbb.img{padding:3px;background:transparent!important}.mfr .mfbb.img img{display:block;max-width:100%;max-height:260px;border-radius:14px;cursor:zoom-in}" +
    ".mfr .mfview{position:fixed;inset:0;z-index:9200;background:rgba(0,0,0,.92);display:grid;place-items:center}.mfr .mfview img{max-width:96vw;max-height:92vh}" +
    ".mfr .mfpk{position:absolute;left:0;right:0;bottom:0;max-width:440px;margin:0 auto;z-index:5;background:var(--bar,#f7f8fa);border-radius:18px 18px 0 0;box-shadow:0 -6px 24px rgba(0,0,0,.18);padding:8px 10px calc(10px + env(safe-area-inset-bottom,0px))}" +
    ".mfr .mfpk .mfpt{display:flex;gap:4px;border-bottom:1px solid var(--bar-line,#dde1e7);padding-bottom:6px}.mfr .mfpk .mfpt button{border:0;background:none;font-size:22px;min-width:44px;min-height:40px;border-radius:10px;cursor:pointer}.mfr .mfpk .mfpt button[aria-selected=true]{background:var(--tint,#eef0f7)}" +
    ".mfr .mfpk .mfstk{border:0;max-height:34vh;overflow-y:auto;padding:8px 2px 0;background:none}.mfr .mfpk .mfstk button{font-size:36px;min-width:56px;min-height:56px}" +
    ".mfto{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:9100;background:#2a2150;color:#fff;border-radius:999px;padding:10px 16px;font:14px system-ui,sans-serif;max-width:86vw}";

  function toast(t) { var x = $("div", "mfto", t); document.body.appendChild(x); setTimeout(function () { x.remove(); }, 2600); }
  function color(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return "hsl(" + h + ",55%,52%)"; }
  function mmT(a, b, c) { try { return window.mmT ? window.mmT(a, b, c) : b; } catch (e) { return b; } }
  function nameOf(uid) { return names[uid] || "Teman"; }
  function av(uid) { var a = $("div", "mfav", (nameOf(uid) || "?").slice(0, 1).toUpperCase()); a.style.background = color(uid); return a; }


CSS += ".mfr{height:100vh;height:100dvh;bottom:auto;align-items:stretch}" +
  ".mfr .mfcmp .mfb{min-width:38px}.mfr .mfrec{align-items:center}.mfr .mfrecdot{color:#e5384d;animation:mfblink 1s infinite}.mfr .mfrect{font-variant-numeric:tabular-nums;font-weight:700}" +
  "@keyframes mfblink{50%{opacity:.25}}" +
  ".mfr .mfvn{display:flex;align-items:center;gap:8px;border:0;background:none;color:inherit;font:inherit;padding:2px 2px;min-width:150px;cursor:pointer}" +
  ".mfr .mfvbar{display:flex;align-items:center;gap:2px;flex:1;height:22px}.mfr .mfvbar i{display:block;width:3px;border-radius:2px;background:currentColor;opacity:.55}" +
  ".mfr .mfcol{display:flex;flex-direction:column;gap:2px;max-width:76%}.mfr .mfcol .mfbb{max-width:100%}.mfr .mfwho{font-size:11px;font-weight:700;color:var(--stamp,#33425a);padding-left:4px}.mfr .mfwho.ai{color:#6b4fd6}" +
  ".mfr .mfcallmsg{background:var(--chip,rgba(40,56,84,.32))}" +
  "@media (min-width:820px){.mfr{align-items:center;background:rgba(10,12,24,.55)}.mfr .mfp{max-width:620px;height:min(100%,920px);max-height:calc(100dvh - 24px);border-radius:20px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.5)}.mfr .mfsheet,.mfr .mfpk{max-width:620px}.mfr .mfbb{max-width:62%}}" +
  ".mfcall{position:fixed;inset:0;height:100vh;height:100dvh;z-index:9500;background:linear-gradient(160deg,#2a1760,#4a2aae 60%,#7a58e6);color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:var(--font,system-ui,sans-serif);overflow:hidden}" +
  ".mfcall #mfRV{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#000;display:none}.mfcall.hasv #mfRV{display:block}" +
  ".mfcall #mfLV{position:absolute;right:14px;top:14px;width:28vw;max-width:140px;min-width:84px;aspect-ratio:3/4;object-fit:cover;border-radius:14px;background:#111;z-index:3;box-shadow:0 4px 18px rgba(0,0,0,.45);transform:scaleX(-1)}" +
  ".mfcall .mfcinfo{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:10px;text-shadow:0 2px 10px rgba(0,0,0,.45);margin-bottom:12vh}.mfcall.hasv .mfcav{display:none}" +
  ".mfcall .mfcav{width:112px;height:112px;border-radius:50%;display:grid;place-items:center;font-size:48px;font-weight:800;box-shadow:0 0 0 8px rgba(255,255,255,.14);animation:mfpulse 1.8s ease-in-out infinite}" +
  "@keyframes mfpulse{50%{box-shadow:0 0 0 18px rgba(255,255,255,.06)}}" +
  ".mfcall .mfcname{font-size:26px;font-weight:800}.mfcall .mfcstat{font-size:15px;opacity:.9;font-variant-numeric:tabular-nums}" +
  ".mfcall .mfcbar{position:absolute;left:0;right:0;bottom:calc(36px + env(safe-area-inset-bottom,0px));display:flex;justify-content:center;gap:28px;z-index:4}" +
  ".mfcall .mfcb{display:flex;flex-direction:column;align-items:center;gap:6px;font-size:12px;text-shadow:0 1px 6px rgba(0,0,0,.5)}.mfcall .mfcb button{width:64px;height:64px;border-radius:50%;border:0;font-size:26px;cursor:pointer;background:rgba(255,255,255,.22);color:#fff;backdrop-filter:blur(6px)}" +
  ".mfcall .mfcb button.off{background:rgba(255,255,255,.9);color:#222}.mfcall .mfcb button.mfred{background:#e5384d}.mfcall .mfcb button.mfgreen{background:#25b35a}";

  /* ---------- data ---------- */
  var myHandle = "", myBio = "";
  async function genCode() {
    for (var t = 0; t < 8; t++) {
      var c = ""; for (var i = 0; i < 8; i++) c += AL[Math.floor(Math.random() * AL.length)];
      try { await fs.collection("codes").doc(c).set({ uid: me }); return c; } catch (e) { if (t === 7) throw e; }
    }
  }
  async function ensureProfile() {
    var pr = await fs.collection("profiles").doc(me).get();
    if (pr.exists) {
      var d = pr.data(); myName = d.name; myCode = d.code; myHandle = d.handle || ""; myBio = d.bio || ""; names[me] = myName;
      if (!myCode) { myCode = await genCode(); await fs.collection("profiles").doc(me).update({ code: myCode }); }
      return;
    }
    var u = ctx.user, base = ((u.displayName || (u.email || "").split("@")[0] || (u.phoneNumber ? "Pengguna " + u.phoneNumber.slice(-4) : "Aku")) + "").trim().slice(0, 24) || "Aku";
    var code = await genCode();
    await fs.collection("profiles").doc(me).set({ name: base, code: code, at: Date.now() });
    myName = base; myCode = code; names[me] = base;
  }
  async function loadName(uid) {
    if (names[uid]) return;
    try { var p = await fs.collection("profiles").doc(uid).get(); names[uid] = p.exists ? p.data().name : "Teman"; } catch (e) { names[uid] = "Teman"; }
  }
  function listen() {
    unsubs.push(fs.collection("friends").where("members", "array-contains", me).onSnapshot(function (s) {
      friends = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; friends.push(x); });
      Promise.all(friends.map(function (f) { return loadName(other(f)); })).then(refresh);
      refresh();
    }, function () {}));
    unsubs.push(fs.collection("requests").where("to", "==", me).onSnapshot(function (s) {
      reqIn = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; reqIn.push(x); reqIn[reqIn.length - 1].fromName = x.fromName; names[x.from] = names[x.from] || x.fromName; }); refresh();
    }, function () {}));
    unsubs.push(fs.collection("requests").where("from", "==", me).onSnapshot(function (s) {
      reqOut = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; reqOut.push(x); }); refresh();
    }, function () {}));
  }
  function cdoc(id, g) { return fs.collection(g ? "groups" : "friends").doc(id); }
  function unread(f) { var r = (f.read || {})[me] || 0; return f.lastFrom && f.lastFrom !== me && ms(f.lastAt) > r && !(chat && chat.id === f.id && view === "chat"); }
  function badgeCount() { return reqIn.length + friends.filter(unread).length + groups.filter(unread).length; }

  async function lookup(raw) {
    var r0 = String(raw || "").trim();
    if (/^@/.test(r0) || !/^(MM-?)?[A-Za-z0-9]{8}$/.test(r0)) {
      var h = r0.replace(/^@/, "").toLowerCase();
      if (!/^[a-z0-9._-]{4,20}$/.test(h)) throw new Error("Masukkan kode teman (8 karakter) atau ID seperti @contoh.");
      var hd = await fs.collection("handles").doc(h).get();
      if (!hd.exists) throw new Error("ID tidak ditemukan.");
      var hu = hd.data().uid; if (hu === me) throw new Error("Itu ID-mu sendiri.");
      await loadName(hu); return hu;
    }
    var code = normCode(raw);
    if (code.length !== 8) throw new Error("Kode harus 8 huruf/angka.");
    var c = await fs.collection("codes").doc(code).get();
    if (!c.exists) throw new Error("Kode tidak ditemukan.");
    var uid = c.data().uid;
    if (uid === me) throw new Error("Itu kodemu sendiri.");
    await loadName(uid); return uid;
  }
  async function sendRequest(uid) {
    if (friends.some(function (f) { return other(f) === uid; })) { openChat(pairId(me, uid)); return "Kalian sudah berteman."; }
    var inc = reqIn.filter(function (r) { return r.from === uid; })[0];
    if (inc) { await accept(inc); return "Permintaan diterima, kalian sekarang berteman."; }
    if (reqOut.some(function (r) { return r.to === uid; })) return "Permintaan sudah terkirim, tunggu dia menerima.";
    await fs.collection("requests").doc(uid + "_" + me).set({ from: me, to: uid, fromName: myName, at: Date.now() });
    return "Permintaan terkirim ke " + nameOf(uid) + ".";
  }
  async function accept(r) {
    var b = fs.batch(), pid = pairId(me, r.from), m = [me, r.from].sort();
    b.set(fs.collection("friends").doc(pid), { members: m, at: Date.now(), blocked: null, lastText: "", lastAt: Date.now(), lastFrom: null, read: {} });
    b.delete(fs.collection("requests").doc(r.id));
    await b.commit();
  }
  async function decline(r) { await fs.collection("requests").doc(r.id).delete(); }

  /* ---------- UI shell ---------- */
  function ensureRoot() {
    if (root) return;
    var st = $("style"); st.textContent = CSS; document.head.appendChild(st);
  }
  function mount(title, onBack, headRight) {
    ensureRoot();
    if (root) root.remove();
    root = $("div", "mfr"); root.id = "mmFr";
    var p = $("div", "mfp"), h = $("div", "mfh"), back = $("button", "mfb", "‹"); back.type = "button"; back.setAttribute("aria-label", "Kembali");
    back.onclick = onBack; h.appendChild(back);
    var t = $("h2", null, title); t.id = "mfTitle"; h.appendChild(t);
    if (headRight) h.appendChild(headRight);
    p.appendChild(h); root.appendChild(p); document.body.appendChild(root);
    return p;
  }
  function closeAll() { stopCam(); stopRec(true); if (chatUn) { chatUn(); chatUn = null; } chat = null; view = "none"; if (root) { root.remove(); root = null; } syncEntry(); }
  function refresh() { syncEntry(); try { document.dispatchEvent(new Event("mm-friends-changed")); } catch (e) {} if (view === "list" && !(addTab === "qr" && (cam || scanBusy))) renderList(); else if (view === "chat" && chat) renderChatHead(); }

  /* ---------- list ---------- */
  function openList(prefill) { stopCam(); addNote = null; view = "list"; if (chatUn) { chatUn(); chatUn = null; } chat = null; renderList(prefill); }
  var addDraft = "", addNote = null, addTab = "id", cam = null, scanNote = null, scanBusy = false;
  function renderList(prefill) {
    if (typeof prefill === "string") addDraft = prefill;
    var keep = root && root.querySelector("#mfCode") ? root.querySelector("#mfCode").value : null;
    if (keep != null) addDraft = keep;
    var hadFocus = !!(root && document.activeElement && document.activeElement.id === "mfCode");
    var p = mount("Teman sungguhan", closeAll), body = $("div", "mfbody"); p.appendChild(body);
    var me1 = $("div", "mfc"); me1.appendChild($("div", "mfs", "Kodemu"));
    var cd = $("div", "mfcode", dispCode(myCode)); cd.id = "mfMyCode"; me1.appendChild(cd);
    me1.appendChild($("div", "mfsub", "Nama tampil: " + myName + (myHandle ? "  ·  ID: @" + myHandle : "")));
    var br = $("div"); br.style.cssText = "display:flex;gap:8px;flex-wrap:wrap;margin-top:8px";
    var sh = $("button", "mfpill mfpri", "Bagikan"); sh.type = "button"; sh.id = "mfShare";
    sh.onclick = async function () {
      var url = location.origin + location.pathname + "?add=" + myCode, text = "Tambahkan aku di M&M's. Kodeku: " + dispCode(myCode);
      try { if (navigator.share) { await navigator.share({ title: "M&M's", text: text, url: url }); return; } } catch (e) { return; }
      try { await navigator.clipboard.writeText(text + " " + url); toast("Tautan disalin."); } catch (e) { toast(dispCode(myCode)); }
    };
    var rn = $("button", "mfpill", "Ubah nama"); rn.type = "button"; rn.id = "mfRename";
    rn.onclick = async function () {
      var n = window.prompt("Nama tampil (maks 24 huruf):", myName); if (n == null) return; n = n.trim().slice(0, 24); if (!n) return;
      try { await fs.collection("profiles").doc(me).set({ name: n, code: myCode, at: Date.now() }); myName = n; names[me] = n; renderList(); toast("Nama diperbarui."); } catch (e) { toast("Gagal mengubah nama."); }
    };
    br.appendChild(sh); br.appendChild(rn);
    if ((window.MM_FIREBASE || {}).vapidKey && "Notification" in window && "serviceWorker" in navigator) {
      var nb = $("button", "mfpill", Notification.permission === "granted" ? "🔔 Notifikasi aktif" : "🔔 Aktifkan notifikasi"); nb.type = "button"; nb.id = "mfPush"; nb.onclick = enablePush; br.appendChild(nb);
    }
    me1.appendChild(br);
    try { if (window.mmQR) { var qb = $("div", "mfqr"); qb.id = "mfMyQr"; qb.appendChild(window.mmQR.svg(location.origin + location.pathname + "?add=" + myCode, 168)); me1.appendChild(qb); } } catch (e) {}
    body.appendChild(me1);

    var ad = $("div", "mfc"); ad.appendChild($("div", "mfs", "Tambah teman"));
    var tb = $("div", "mftabs"); tb.setAttribute("role", "tablist");
    [["id", "Cari ID"], ["qr", "Pindai QR"]].forEach(function (x) {
      var b = $("button", null, x[1]); b.type = "button"; b.id = "mfTab" + x[0]; b.setAttribute("role", "tab"); b.setAttribute("aria-selected", addTab === x[0] ? "true" : "false");
      b.onclick = function () { stopCam(); scanBusy = false; scanNote = null; addTab = x[0]; renderList(); }; tb.appendChild(b);
    });
    ad.appendChild(tb);
    if (addTab === "qr") { renderScanTab(ad); body.appendChild(ad); renderRest(body); return; }
    var inp = $("input", "mfin"); inp.id = "mfCode"; inp.placeholder = "Kode teman (MM-4K9Q2XAB) atau @ID"; inp.autocapitalize = "none"; inp.autocomplete = "off"; inp.value = addDraft; ad.appendChild(inp);
    var msg = $("div", "mfmsg"); msg.id = "mfMsg"; ad.appendChild(msg);
    if (addNote) { msg.className = "mfmsg " + addNote.c; msg.textContent = addNote.t; }
    var go = $("button", "mfpill mfpri", "Kirim permintaan"); go.type = "button"; go.id = "mfSend"; go.style.marginTop = "6px";
    go.onclick = async function () {
      go.disabled = true; msg.className = "mfmsg"; msg.textContent = ""; addNote = null;
      try { var uid = await lookup(inp.value); if (!window.confirm("Kirim permintaan teman ke " + nameOf(uid) + "?")) { go.disabled = false; return; } var r = await sendRequest(uid); addDraft = ""; addNote = { c: "mfok", t: r }; if (view === "list") renderList(); return; }
      catch (e) { var tx = (e && e.message && e.message.indexOf("Missing or insufficient") < 0) ? e.message : "Gagal. Periksa koneksi lalu coba lagi."; addNote = { c: "mfwarn", t: tx }; if (view === "list") { renderList(); return; } }
      go.disabled = false;
    };
    ad.appendChild(go); body.appendChild(ad);
    renderRest(body);
    if (hadFocus) { var ci = root.querySelector("#mfCode"); if (ci) { ci.focus(); try { ci.setSelectionRange(ci.value.length, ci.value.length); } catch (e) {} } }
  }
  function loadScript(src) { return new Promise(function (ok, no) { var s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = function () { no(new Error("Gagal memuat " + src)); }; document.head.appendChild(s); }); }
  /* Notifikasi push (FCM web). Aktif hanya jika vapidKey diisi di firebase-config.js dan Cloud Function sudah dipasang. */
  async function enablePush() {
    try {
      var cfg = window.MM_FIREBASE || {};
      var perm = await Notification.requestPermission(); if (perm !== "granted") { toast("Izin notifikasi ditolak."); return; }
      if (!(ctx.fb.messaging)) await loadScript("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");
      var reg = await navigator.serviceWorker.ready;
      var tok = await ctx.fb.messaging().getToken({ vapidKey: cfg.vapidKey, serviceWorkerRegistration: reg });
      if (!tok) throw new Error("Token kosong");
      await fs.collection("fcmTokens").doc(me).set({ tokens: FV.arrayUnion(tok), at: Date.now() }, { merge: true });
      toast("Notifikasi aktif."); if (view === "list") renderList();
    } catch (e) { toast("Notifikasi gagal diaktifkan."); }
  }
  function stopCam() { if (cam) { try { cam.stop(); } catch (e) {} cam = null; } }
  function codeFromText(s) {
    s = String(s || "").trim(); var m = /[?&]add=([A-Za-z0-9-]+)/.exec(s), raw = m ? m[1] : s;
    if (!/^(MM-?)?[A-Za-z0-9]{8}$/i.test(raw)) return "";
    var c = normCode(raw); return c.length === 8 ? c : "";
  }
  async function addByCode(raw, msg) {
    try {
      var uid = await lookup(raw);
      if (!window.confirm("Kirim permintaan teman ke " + nameOf(uid) + "?")) return;
      var r = await sendRequest(uid); addNote = { c: "mfok", t: r };
    } catch (e) { addNote = { c: "mfwarn", t: (e && e.message && e.message.indexOf("Missing or insufficient") < 0) ? e.message : "Gagal. Periksa koneksi lalu coba lagi." }; }
    addTab = "id"; scanBusy = false; scanNote = null; if (view === "list") renderList();
  }
  function renderScanTab(ad) {
    var msg = $("div", "mfmsg"); msg.id = "mfScanMsg"; if (scanNote) { msg.className = "mfmsg mfwarn"; msg.textContent = scanNote; } var info = $("div", "mfsub", "Arahkan kamera ke QR teman. Permintaan terkirim otomatis setelah kamu konfirmasi."); info.style.marginTop = "8px";
    ad.appendChild(info);
    var box = $("div"); ad.appendChild(box); ad.appendChild(msg);
    var start = $("button", "mfpill mfpri", "Buka kamera"); start.type = "button"; start.id = "mfCam"; start.style.marginTop = "8px"; box.appendChild(start);
    start.onclick = async function () {
      function warn(x) { scanNote = x; msg.className = "mfmsg mfwarn"; msg.textContent = x; }
      if (!window.mmQR || !navigator.mediaDevices) { warn("Kamera tidak tersedia di browser ini. Pakai tab Cari ID."); return; }
      start.disabled = true; box.textContent = ""; scanNote = null; msg.textContent = ""; scanBusy = true;
      var cw = $("div", "mfcam"), v = $("video"); cw.appendChild(v); cw.appendChild($("i")); box.appendChild(cw);
      try {
        cam = await window.mmQR.scan(v, function (txt) {
          cam = null; scanBusy = false; var c = codeFromText(txt);
          if (!c) { warn("QR ini bukan kode M&M's."); box.textContent = ""; box.appendChild(start); start.disabled = false; return; }
          addByCode(c);
        });
      } catch (e) {
        scanBusy = false; box.textContent = ""; box.appendChild(start); start.disabled = false;
        warn((e && e.name === "NotAllowedError") ? "Izin kamera ditolak. Aktifkan lewat pengaturan browser." : ((e && e.message) || "Kamera tidak bisa dibuka."));
      }
    };
  }
  function renderRest(body) {
    if (reqIn.length) {
      body.appendChild($("div", "mfs", "Permintaan masuk (" + reqIn.length + ")"));
      reqIn.forEach(function (r) {
        var c = $("div", "mfc"); c.className = "mfc mfreq"; c.appendChild($("div", "mfn", nameOf(r.from) || r.fromName));
        var b = $("div"); b.style.cssText = "display:flex;gap:8px;margin-top:8px";
        var ok = $("button", "mfpill mfpri", "Terima"); ok.type = "button"; ok.className = "mfpill mfpri mfacc"; ok.onclick = async function () { ok.disabled = true; try { await accept(r); toast("Sekarang berteman dengan " + nameOf(r.from) + "."); } catch (e) { toast("Gagal menerima."); ok.disabled = false; } };
        var no = $("button", "mfpill", "Tolak"); no.type = "button"; no.className = "mfpill mfdec"; no.onclick = async function () { try { await decline(r); } catch (e) { toast("Gagal menolak."); } };
        b.appendChild(ok); b.appendChild(no); c.appendChild(b); body.appendChild(c);
      });
    }
    if (groups.length) {
      body.appendChild($("div", "mfs", "Grup (" + groups.length + ")"));
      groups.slice().sort(function (a, b) { return ms(b.lastAt) - ms(a.lastAt); }).forEach(function (g) {
        var r = $("button", "mfrow mfgr"); r.type = "button"; r.dataset.gid = g.id; var a = $("div", "mfav", "👥"); a.style.background = color(g.id); r.appendChild(a);
        var m = $("div", "mfmid"); m.appendChild($("div", "mfn", g.name)); m.appendChild($("div", "mfsub", g.lastText ? (g.lastFrom === me ? "Kamu: " : "") + g.lastText : g.members.length + " anggota")); r.appendChild(m);
        if (unread(g)) r.appendChild($("span", "mfdot")); r.onclick = function () { openChat(g.id, true); }; body.appendChild(r);
      });
    }
    body.appendChild($("div", "mfs", "Teman (" + friends.length + ")"));
    if (!friends.length) { var e0 = $("div", "mfsub", "Belum ada teman. Bagikan kodemu atau masukkan kode temanmu."); e0.style.padding = "4px 2px"; body.appendChild(e0); }
    friends.slice().sort(function (a, b) { return ms(b.lastAt) - ms(a.lastAt); }).forEach(function (f) {
      var o = other(f), r = $("button", "mfrow mffr"); r.type = "button"; r.dataset.pair = f.id; r.appendChild(av(o));
      var m = $("div", "mfmid"); m.appendChild($("div", "mfn", nameOf(o)));
      m.appendChild($("div", "mfsub", f.blocked ? "Diblokir" : (f.lastText ? (f.lastFrom === me ? "Kamu: " : "") + f.lastText : "Belum ada pesan"))); r.appendChild(m);
      if (unread(f)) r.appendChild($("span", "mfdot"));
      r.onclick = function () { openChat(f.id); }; body.appendChild(r);
    });
    if (reqOut.length) {
      body.appendChild($("div", "mfs", "Menunggu diterima"));
      reqOut.forEach(function (r) { var c = $("div", "mfrow"); c.style.cursor = "default"; c.appendChild(av(r.to)); var m = $("div", "mfmid"); m.appendChild($("div", "mfn", nameOf(r.to))); m.appendChild($("div", "mfsub", "Permintaan terkirim")); c.appendChild(m);
        var x = $("button", "mfpill", "Batal"); x.type = "button"; x.onclick = async function () { try { await fs.collection("requests").doc(r.id).delete(); } catch (e) {} }; c.appendChild(x); body.appendChild(c); });
      reqOut.forEach(function (r) { loadName(r.to).then(function () { }); });
    }
  }

  /* ---------- chat ---------- */
  function chatTitle() { return chat.g ? (curFriend() || chat.f).name : nameOf(chat.o); }
  function openChat(pid, isG, ext) {
    var f = (isG ? groups : friends).filter(function (x) { return x.id === pid; })[0]; if (!f) { toast(isG ? "Grup tidak ditemukan." : "Teman tidak ditemukan."); return; }
    stopRec(true);
    chat = { id: pid, g: !!isG, ext: !!ext, f: f, o: isG ? null : other(f), msgs: [], stk: false }; view = "chat"; renderChatShell();
    var q = cdoc(pid, isG).collection("msgs").orderBy("at").limitToLast(150);
    chatUn = q.onSnapshot(function (s) { chat.msgs = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; chat.msgs.push(x); }); renderMsgs(); markRead(); }, function () { toast("Tidak bisa memuat pesan."); });
  }
  function markRead() { if (!chat) return; var f0 = curFriend(); if (f0 && f0.lastFrom !== me && ms(f0.lastAt) <= ((f0.read || {})[me] || 0)) return; if (f0 && !f0.lastFrom) return; try { cdoc(chat.id, chat.g).update("read." + me, Date.now()).catch(function () {}); } catch (e) {} }
  function curFriend() { return chat ? ((chat.g ? groups : friends).filter(function (x) { return x.id === chat.id; })[0] || null) : null; }
  function backFromChat() { stopRec(true); if (chat && chat.ext) closeAll(); else openList(); }
  function renderChatHead() { if (!root) return; var f = curFriend(); if (!f) { toast(chat.g ? "Grup sudah tidak ada." : "Pertemanan sudah berakhir."); if (chat.ext) closeAll(); else openList(); return; } chat.f = f; var t = root.querySelector("#mfTitle"); if (t) t.textContent = chatTitle() + (chat.g ? " (" + f.members.length + ")" : "");
    var key = String(f.blocked || ""); if (chat.ck !== key) { chat.ck = key; renderCompose(); }
    renderMsgs(); }
  function renderChatShell() {
    var hr = $("div"); hr.style.cssText = "display:flex;align-items:center";
    if (!chat.g) {
      [["📞", "audio", "mfCallA", "Telepon suara"], ["📹", "video", "mfCallV", "Video call"]].forEach(function (x) { var cb = $("button", "mfb", x[0]); cb.type = "button"; cb.id = x[2]; cb.setAttribute("aria-label", x[3]); cb.onclick = function () { startCall(x[1]); }; hr.appendChild(cb); });
    }
    var mb = $("button", "mfb", "⋮"); mb.type = "button"; mb.id = "mfMenu"; mb.setAttribute("aria-label", "Menu"); mb.onclick = chatMenu; hr.appendChild(mb);
    var p = mount(chatTitle(), backFromChat, hr);
    var ml = $("div", "mfmsgs"); ml.id = "mfMsgs"; p.appendChild(ml);
    ml.addEventListener("click", function () { if (chat && chat.stk) { chat.stk = false; renderCompose(); } });
    var cz = $("div"); cz.id = "mfComp"; p.appendChild(cz); chat.ck = String((curFriend() || chat.f).blocked || ""); renderCompose(); renderMsgs();
    if (chat.g) renderChatHead();
  }
  function renderCompose() {
    var cz = root && root.querySelector("#mfComp"); if (!cz) return; var f = curFriend() || chat.f; cz.textContent = "";
    if (f.blocked) { var n = $("div", "mfnote", f.blocked === me ? "Kamu memblokir teman ini. Buka blokir lewat menu ⋮ untuk melanjutkan." : "Tidak bisa mengirim pesan ke teman ini."); n.id = "mfBlocked"; cz.appendChild(n); return; }
    if (chat.rec) { renderRecBar(cz); return; }
    if (chat.stk) {
      var pk = $("div", "mfpk"); pk.id = "mfPack"; var pt = $("div", "mfpt"), gs = $("div", "mfstk"); pt.setAttribute("role", "tablist");
      function fill() { gs.textContent = ""; PACKS[chat.pk || 0].l.forEach(function (e) { var b = $("button", null, e); b.type = "button"; b.onclick = function () { chat.stk = false; send(e, "sticker"); renderCompose(); }; gs.appendChild(b); }); pt.querySelectorAll("button").forEach(function (x, n) { x.setAttribute("aria-selected", n === (chat.pk || 0) ? "true" : "false"); }); }
      PACKS.forEach(function (pc, n) { var b = $("button", null, pc.i); b.type = "button"; b.setAttribute("role", "tab"); b.onclick = function () { chat.pk = n; fill(); }; pt.appendChild(b); });
      pk.appendChild(pt); pk.appendChild(gs); fill(); cz.appendChild(pk);
    }
    var c = $("div", "mfcmp"), pb = $("button", "mfb", "📷"); pb.type = "button"; pb.id = "mfPhoto"; pb.setAttribute("aria-label", "Kirim foto");
    var fi = $("input"); fi.type = "file"; fi.accept = "image/*"; fi.id = "mfFile"; fi.hidden = true; fi.style.display = "none";
    fi.onchange = function () { var f = fi.files && fi.files[0]; fi.value = ""; if (f) sendImage(f); };
    pb.onclick = function () { fi.click(); };
    var sb = $("button", "mfb", "😊"); sb.type = "button"; sb.id = "mfStk"; sb.onclick = function () { chat.stk = !chat.stk; renderCompose(); };
    var i = $("input"); i.id = "mfText"; i.maxLength = 1000; i.placeholder = "Ketik pesan"; i.enterKeyHint = "send";
    var go = $("button", "mfpill mfpri", "Kirim"); go.type = "button"; go.id = "mfGo";
    var mic = $("button", "mfb", "🎤"); mic.type = "button"; mic.id = "mfMic"; mic.setAttribute("aria-label", "Pesan suara"); mic.onclick = startRec;
    function fire() { var v = i.value.trim(); if (!v) return; i.value = ""; send(v, "text"); }
    go.onclick = fire; i.addEventListener("keydown", function (e) { if (e.key === "Enter") fire(); });
    c.appendChild(pb); c.appendChild(fi); c.appendChild(sb); c.appendChild(i); c.appendChild(mic); c.appendChild(go); cz.appendChild(c);
  }
  var LASTTXT = { sticker: null, image: "📷 Foto", voice: "🎤 Pesan suara" };
  async function send(text, kind, extra) {
    if (!chat) return;
    var pid = chat.id, g = chat.g, now = Date.now(), ref = cdoc(pid, g), mr = ref.collection("msgs").doc();
    try {
      var b = fs.batch(), big = kind === "image" || kind === "voice", doc = { from: me, text: big ? String(text) : String(text).slice(0, 1000), kind: kind, at: FV.serverTimestamp() };
      if (extra && extra.dur) doc.dur = Math.max(1, Math.min(120, Math.round(extra.dur)));
      b.set(mr, doc);
      b.update(ref, { lastText: kind === "sticker" ? text : (LASTTXT[kind] || String(text).slice(0, 80)), lastAt: FV.serverTimestamp(), lastFrom: me, ["read." + me]: now });
      await b.commit();
    } catch (e) { toast("Pesan gagal terkirim."); }
  }
  /* ---------- voice note ---------- */
  function stopRec(discard) {
    var r = chat && chat.rec; if (!r) return; chat.rec = null; r.discard = !!discard; clearInterval(r.tick);
    try { if (r.mr && r.mr.state !== "inactive") r.mr.stop(); } catch (e) {}
    try { r.stream.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {}
  }
  async function startRec() {
    if (!chat || chat.rec) return;
    if (!window.MediaRecorder || !navigator.mediaDevices) { toast("Perangkat ini belum mendukung pesan suara."); return; }
    var stream; try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); } catch (e) { toast("Izin mikrofon ditolak."); return; }
    var mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg;codecs=opus", "audio/webm"].filter(function (m) { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } })[0] || "";
    var mr; try { mr = new MediaRecorder(stream, mime ? { mimeType: mime, audioBitsPerSecond: 24000 } : { audioBitsPerSecond: 24000 }); } catch (e) { stream.getTracks().forEach(function (x) { x.stop(); }); toast("Gagal memulai rekaman."); return; }
    var r = { mr: mr, stream: stream, t0: Date.now(), chunks: [], discard: false, tick: null, mime: mr.mimeType || mime || "audio/webm" }; chat.rec = r;
    mr.ondataavailable = function (e) { if (e.data && e.data.size) r.chunks.push(e.data); };
    mr.onstop = function () {
      var dur = (Date.now() - r.t0) / 1000; if (r.discard || !r.chunks.length) return; if (dur < 0.8) { toast("Terlalu pendek."); return; }
      var blob = new Blob(r.chunks, { type: r.mime.split(";")[0] }), fr = new FileReader();
      fr.onload = function () { var d = String(fr.result).replace(/^data:[^;,]*/, "data:" + r.mime.split(";")[0]); if (d.length > 560000) { toast("Pesan suara terlalu panjang."); return; } send(d, "voice", { dur: dur }); };
      fr.readAsDataURL(blob);
    };
    mr.start(); r.tick = setInterval(function () { var el = root && root.querySelector("#mfRecT"); var s = Math.floor((Date.now() - r.t0) / 1000); if (el) el.textContent = Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); if (s >= 60) finishRec(); }, 250);
    renderCompose();
  }
  function finishRec() { if (!chat || !chat.rec) return; var r = chat.rec; chat.rec = null; clearInterval(r.tick); try { r.mr.stop(); } catch (e) {} try { r.stream.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {} renderCompose(); }
  function renderRecBar(cz) {
    var c = $("div", "mfcmp mfrec"), x = $("button", "mfpill", "✕ Batal"); x.type = "button"; x.id = "mfRecX"; x.onclick = function () { stopRec(true); renderCompose(); };
    var d = $("span", "mfrecdot", "●"), tm = $("span", "mfrect", "0:00"); tm.id = "mfRecT"; var lb = $("span", "mfsub", "Merekam…"); lb.style.flex = "1";
    var ok = $("button", "mfpill mfpri", "Kirim ➤"); ok.type = "button"; ok.id = "mfRecGo"; ok.onclick = finishRec;
    c.appendChild(x); c.appendChild(d); c.appendChild(tm); c.appendChild(lb); c.appendChild(ok); cz.appendChild(c);
  }
  /* Kompres foto di HP sebelum dikirim: sisi terpanjang <= 1024 px, JPEG, <= ~420 KB */
  function compressImage(file) {
    return new Promise(function (ok, no) {
      var url = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        try {
          var side = 1024, q = 0.72, out = "";
          for (var n = 0; n < 6; n++) {
            var sc = Math.min(1, side / Math.max(im.naturalWidth, im.naturalHeight)), cv = document.createElement("canvas");
            cv.width = Math.max(1, Math.round(im.naturalWidth * sc)); cv.height = Math.max(1, Math.round(im.naturalHeight * sc));
            var cx = cv.getContext("2d"); cx.fillStyle = "#fff"; cx.fillRect(0, 0, cv.width, cv.height); cx.drawImage(im, 0, 0, cv.width, cv.height);
            out = cv.toDataURL("image/jpeg", q);
            if (out.length <= 420000) break;
            if (q > 0.5) q -= 0.1; else side = Math.round(side * 0.78);
          }
          URL.revokeObjectURL(url); out.length <= 560000 ? ok(out) : no(new Error("Foto terlalu besar."));
        } catch (e) { no(e); }
      };
      im.onerror = function () { URL.revokeObjectURL(url); no(new Error("File bukan gambar.")); };
      im.src = url;
    });
  }
  async function sendImage(file) {
    if (!chat) return;
    if (!/^image\//.test(file.type || "")) { toast("Pilih file gambar."); return; }
    toast("Mengompres foto…");
    try { var d = await compressImage(file); await send(d, "image"); }
    catch (e) { toast((e && e.message) || "Foto gagal dikirim."); }
  }
  function viewImage(src) {
    var v = $("div", "mfview"); v.setAttribute("role", "dialog"); var im = $("img"); im.src = src; im.alt = "Foto"; v.appendChild(im);
    v.onclick = function () { v.remove(); }; root.appendChild(v);
  }
  function whoName(m) {
    if (m.from && m.from.indexOf("ai:") === 0) { var g = curFriend(), id = m.from.slice(3), hit = ((g && g.ai) || []).filter(function (s) { return s.split("|")[0] === id; })[0]; return hit ? hit.split("|")[1] || id : id; }
    return nameOf(m.from);
  }
  var playing = null;
  function voiceBubble(bb, m) {
    var b = $("button", "mfvn"), ic = $("span", null, "▶"), bar = $("span", "mfvbar"), du = $("span", "mfsub", Math.floor((m.dur || 0) / 60) + ":" + ("0" + ((m.dur || 0) % 60)).slice(-2)); b.type = "button"; b.setAttribute("aria-label", "Putar pesan suara");
    for (var k = 0; k < 14; k++) { var s = $("i"); s.style.height = (6 + ((k * 7 + (m.dur || 3)) % 11)) + "px"; bar.appendChild(s); }
    b.appendChild(ic); b.appendChild(bar); b.appendChild(du);
    b.onclick = function (e) {
      e.stopPropagation();
      if (playing && playing.a) { try { playing.a.pause(); } catch (x) {} var same = playing.b === b; playing.i.textContent = "▶"; playing = null; if (same) return; }
      var a = new Audio(m.text); playing = { a: a, b: b, i: ic }; ic.textContent = "⏸";
      a.onended = function () { ic.textContent = "▶"; if (playing && playing.a === a) playing = null; };
      a.onerror = function () { ic.textContent = "▶"; toast("Tidak bisa memutar pesan suara."); };
      a.play().catch(function () { ic.textContent = "▶"; });
    };
    bb.appendChild(b);
  }
  function renderMsgs() {
    var ml = root && root.querySelector("#mfMsgs"); if (!ml || !chat) return;
    var near = ml.scrollHeight - ml.scrollTop - ml.clientHeight < 120 || !ml.childNodes.length; ml.textContent = ""; var last = "";
    var f = curFriend() || chat.f, rd = chat.g ? 0 : ((f.read || {})[chat.o] || 0);
    chat.msgs.forEach(function (m) {
      var dk = dayKey(m.at); if (dk !== last) { last = dk; ml.appendChild($("div", "mfday", dayLabel(m.at))); }
      if (m.kind === "call") { var cl = $("div", "mfday mfcallmsg", String(m.text)); ml.appendChild(cl); return; }
      var mine = m.from === me, row = $("div", "mfm " + (mine ? "me" : "them")), bb = $("div", "mfbb" + (m.kind === "sticker" ? " stk" : "") + (m.kind === "image" ? " img" : "") + (m.kind === "voice" ? " vn" : ""), (m.kind === "image" || m.kind === "voice") ? "" : m.text); bb.dataset.id = m.id;
      if (m.kind === "image" && /^(data:image\/jpeg;base64,|https:\/\/firebasestorage\.googleapis\.com\/)/.test(m.text || "")) { var pic = $("img"); pic.src = m.text; pic.alt = "Foto"; pic.loading = "lazy"; pic.onload = function () { if (near) ml.scrollTop = ml.scrollHeight; }; pic.onclick = function (e) { e.stopPropagation(); viewImage(m.text); }; bb.appendChild(pic); }
      if (m.kind === "voice" && /^data:audio\//.test(m.text || "")) voiceBubble(bb, m);
      var t = $("div", "mft", (mine && !chat.g && ms(m.at) <= rd ? "Dibaca\n" : "") + hhmm(m.at)); t.style.whiteSpace = "pre-line";
      var holder = bb;
      if (chat.g && !mine) { holder = $("div", "mfcol"); var lb = $("div", "mfwho" + (m.from.indexOf("ai:") === 0 ? " ai" : ""), whoName(m) + (m.from.indexOf("ai:") === 0 ? " 🤖" : "")); holder.appendChild(lb); holder.appendChild(bb); }
      if (mine || (chat.g && f.owner === me)) { bb.style.cursor = "pointer"; bb.onclick = function () { if (window.confirm("Tarik pesan ini?")) cdoc(chat.id, chat.g).collection("msgs").doc(m.id).delete().catch(function () { toast("Gagal menarik pesan."); }); }; }
      if (mine) { row.appendChild(t); row.appendChild(holder); } else { row.appendChild(holder); row.appendChild(t); }
      ml.appendChild(row);
    });
    if (near) ml.scrollTop = ml.scrollHeight;
  }
  function chatMenu() {
    var f = curFriend(); if (!f || !root) return; var sh = $("div", "mfsheet"); sh.id = "mfSheet";
    function item(label, cls, fn) { var b = $("button", "mfpill " + (cls || ""), label); b.type = "button"; b.onclick = function () { sh.remove(); fn(); }; sh.appendChild(b); return b; }
    if (chat.g) {
      if (f.owner === me) item("Hapus grup", "mfremove mfwarn", function () { if (window.confirm("Hapus grup ini untuk semua anggota?")) { var id = f.id; cdoc(id, true).delete().then(function () { toast("Grup dihapus."); if (chat && chat.ext) closeAll(); else openList(); }).catch(function () { toast("Gagal menghapus."); }); } });
      else item("Keluar grup", "mfremove mfwarn", function () { if (window.confirm("Keluar dari grup ini?")) { var id = f.id; cdoc(id, true).update({ members: f.members.filter(function (u) { return u !== me; }) }).then(function () { toast("Kamu keluar dari grup."); if (chat && chat.ext) closeAll(); else openList(); }).catch(function () { toast("Gagal keluar."); }); } });
      item("Tutup", "", function () { }); root.appendChild(sh); return;
    }
    if (f.blocked === me) item("Buka blokir", "mfunblock", function () { fs.collection("friends").doc(f.id).update("blocked", null).then(function () { toast("Blokir dibuka."); }).catch(function () { toast("Gagal."); }); });
    else if (!f.blocked) item("Blokir", "mfblock mfwarn", function () { if (window.confirm("Blokir " + nameOf(chat.o) + "? Kalian tidak bisa saling kirim pesan.")) fs.collection("friends").doc(f.id).update("blocked", me).then(function () { toast("Diblokir."); }).catch(function () { toast("Gagal."); }); });
    item("Laporkan", "mfreport", reportFlow);
    item("Hapus teman", "mfremove mfwarn", function () { if (window.confirm("Hapus " + nameOf(chat.o) + " dari teman? Riwayat chat tidak bisa dibuka lagi.")) { var id = f.id; fs.collection("friends").doc(id).delete().then(function () { toast("Teman dihapus."); if (chat && chat.ext) closeAll(); else openList(); }).catch(function () { toast("Gagal menghapus."); }); } });
    item("Tutup", "", function () { });
    root.appendChild(sh);
  }
  async function reportFlow() {
    var why = window.prompt("Alasan laporan (spam / pelecehan / lainnya):", "spam"); if (why == null) return;
    var note = (window.prompt("Catatan singkat (opsional):", "") || "").slice(0, 300);
    var sample = chat.msgs.slice(-10).map(function (m) { return { from: m.from, text: m.kind === "image" ? "[foto]" : String(m.text).slice(0, 200), at: ms(m.at) }; });
    try { await fs.collection("reports").add({ by: me, target: chat.o, pair: chat.id, reason: String(why).slice(0, 40), note: note, sample: sample, at: Date.now() }); toast("Laporan terkirim. Terima kasih."); } catch (e) { toast("Gagal mengirim laporan."); }
  }


  /* ---------- grup asli (+ tamu AI) ---------- */
  async function createGroup(name, uids, ais) {
    var ref = fs.collection("groups").doc(), members = [me].concat((uids || []).filter(function (u) { return u && u !== me; })).slice(0, 9);
    await ref.set({ name: String(name || "Grup").trim().slice(0, 24) || "Grup", owner: me, members: members, ai: (ais || []).slice(0, 4).map(function (s) { return String(s).slice(0, 40); }), at: Date.now(), lastText: "", lastAt: Date.now(), lastFrom: null, read: {} });
    return ref.id;
  }
  var aiW = {}, aiDone = {}, aiBusy = {};
  function watchAi() {
    var want = {}; groups.forEach(function (g) { if (g.owner === me && g.ai && g.ai.length) want[g.id] = g; });
    Object.keys(aiW).forEach(function (id) { if (!want[id]) { try { aiW[id].un(); } catch (e) {} delete aiW[id]; } });
    Object.keys(want).forEach(function (id) {
      if (aiW[id]) { aiW[id].g = want[id]; return; }
      var w = { g: want[id], first: true, un: null };
      w.un = fs.collection("groups").doc(id).collection("msgs").orderBy("at", "desc").limit(10).onSnapshot(function (s) {
        var arr = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; arr.push(x); });
        if (w.first) { w.first = false; arr.forEach(function (x) { aiDone[x.id] = 1; }); return; }
        var nw = arr[0]; if (!nw || aiDone[nw.id] || nw.at == null) return; aiDone[nw.id] = 1;
        if (String(nw.from).indexOf("ai:") === 0 || nw.kind === "call") return;
        aiRespond(w.g, arr.slice().reverse(), nw);
      }, function () {});
      aiW[id] = w;
    });
  }
  function nameIn(g, m) {
    if (String(m.from).indexOf("ai:") === 0) { var id = m.from.slice(3), hit = (g.ai || []).filter(function (s) { return s.split("|")[0] === id; })[0]; return hit ? (hit.split("|")[1] || id) : id; }
    return m.from === me ? myName : nameOf(m.from);
  }
  async function aiRespond(g, msgs, nw) {
    if (!window.mmAI || !window.mmAI.ok() || aiBusy[g.id]) return;
    var text = nw.kind === "text" ? String(nw.text) : "", cand = (g.ai || []).map(function (s) { return s.split("|"); });
    var pick = cand.filter(function (c) { return c[1] && text.toLowerCase().indexOf(String(c[1]).toLowerCase()) >= 0; })[0];
    if (!pick) { if (Math.random() > 0.8) return; pick = cand[Math.floor(Math.random() * cand.length)]; }
    aiBusy[g.id] = 1;
    try {
      await new Promise(function (r) { setTimeout(r, 1500 + Math.random() * 2500); });
      var lines = msgs.filter(function (x) { return x.kind !== "call"; }).map(function (x) { return { who: nameIn(g, x), text: (x.kind === "text" || x.kind === "sticker") ? String(x.text).slice(0, 200) : "[" + x.kind + "]" }; });
      var out = await window.mmAI.reply(pick[0], g.name, lines, pick[1] || pick[0]);
      if (out) {
        var ref = fs.collection("groups").doc(g.id), mr = ref.collection("msgs").doc(), b = fs.batch(), tx = String(out).slice(0, 300);
        b.set(mr, { from: "ai:" + pick[0], text: tx, kind: "text", at: FV.serverTimestamp() });
        b.update(ref, { lastText: tx.slice(0, 80), lastAt: FV.serverTimestamp(), lastFrom: "ai:" + pick[0] });
        await b.commit();
      }
    } catch (e) {}
    aiBusy[g.id] = 0;
  }
  function listenExtra() {
    unsubs.push(fs.collection("groups").where("members", "array-contains", me).onSnapshot(function (s) {
      groups = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; groups.push(x); });
      var ids = {}; groups.forEach(function (g) { g.members.forEach(function (u) { ids[u] = 1; }); });
      Promise.all(Object.keys(ids).map(loadName)).then(refresh); refresh(); watchAi();
      if (chat && chat.g && view === "chat") renderChatHead();
    }, function () {}));
    unsubs.push(fs.collection("calls").where("to", "==", me).where("status", "==", "ringing").onSnapshot(function (s) {
      s.docChanges().forEach(function (c) { if (c.type === "added") incoming(c.doc); });
    }, function () {}));
  }

  /* ---------- telepon & video call (WebRTC, sinyal lewat Firestore) ---------- */
  var RTC = { iceServers: [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }, { urls: ["turn:openrelay.metered.ca:80", "turn:openrelay.metered.ca:443", "turn:openrelay.metered.ca:443?transport=tcp"], username: "openrelayproject", credential: "openrelayproject" }] };
  var call = null, ringCtx = null, ringT = null;
  function startRing(low) {
    stopRing();
    try {
      var A = window.AudioContext || window.webkitAudioContext; if (!A) return; ringCtx = ringCtx || new A(); if (ringCtx.state === "suspended") ringCtx.resume();
      var beep = function () { [0, 0.25].forEach(function (d) { var o = ringCtx.createOscillator(), g = ringCtx.createGain(); o.type = "sine"; o.frequency.value = low ? 420 : (d ? 660 : 520); g.gain.value = low ? 0.04 : 0.09; o.connect(g); g.connect(ringCtx.destination); o.start(ringCtx.currentTime + d); o.stop(ringCtx.currentTime + d + 0.2); }); };
      beep(); ringT = setInterval(beep, 1800);
    } catch (e) {}
    if (!low) { try { if (navigator.vibrate) navigator.vibrate([400, 250, 400, 1200, 400, 250, 400]); } catch (e) {} }
  }
  function stopRing() { if (ringT) { clearInterval(ringT); ringT = null; } try { if (navigator.vibrate) navigator.vibrate(0); } catch (e) {} }
  function getMedia(kind) { return navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: kind === "video" ? { facingMode: "user" } : false }); }
  function callName() { var f = friends.filter(function (x) { return x.id === call.pair; })[0]; return f ? nameOf(other(f)) : "Teman"; }
  function fmtDur(s) { return Math.floor(s / 60) + ":" + ("0" + (s % 60)).slice(-2); }
  function buildPC() {
    var pc = new RTCPeerConnection(RTC); call.pc = pc; call.remote = new MediaStream(); call.pend = []; call.cq = []; call.docReady = false;
    call.local.getTracks().forEach(function (tr) { pc.addTrack(tr, call.local); });
    pc.ontrack = function (e) { call.remote.addTrack(e.track); attachRemote(); };
    pc.onicecandidate = function (e) { if (!e.candidate || !call) return; var c = JSON.stringify(e.candidate); if (call.docReady) pushCand(c); else call.cq.push(c); };
    pc.onconnectionstatechange = function () {
      if (!call) return; var s = pc.connectionState;
      if (s === "connected" && !call.t0) { call.t0 = Date.now(); call.state = "live"; stopRing(); clearTimeout(call.ring); call.tm = setInterval(updateCallUI, 1000); updateCallUI(); }
      if (s === "failed") { toast("Koneksi panggilan gagal."); hangup(); }
    };
  }
  function pushCand(c) { if (!call) return; fs.collection("calls").doc(call.id).collection("cand").add({ from: me, c: c }).catch(function () {}); }
  function flushOut() { call.docReady = true; call.cq.splice(0).forEach(pushCand); }
  function handleCand(s) {
    if (!call) return;
    s.docChanges().forEach(function (ch) { if (ch.type !== "added") return; var c; try { c = JSON.parse(ch.doc.data().c); } catch (e) { return; } if (call.pc.remoteDescription) call.pc.addIceCandidate(c).catch(function () {}); else call.pend.push(c); });
  }
  function flushIn() { if (!call) return; call.pend.splice(0).forEach(function (c) { call.pc.addIceCandidate(c).catch(function () {}); }); }
  function watchCallDoc(ref) {
    call.un.push(ref.onSnapshot(function (s) {
      if (!call) return; var y = s.data(); if (!y) { endCallLocal("ended"); return; }
      if (call.role === "caller" && y.status === "accepted" && y.answer && !call.gotAns) { call.gotAns = true; clearTimeout(call.ring); stopRing(); call.state = "connecting"; call.pc.setRemoteDescription(y.answer).then(flushIn).catch(function () {}); updateCallUI(); }
      if (y.status === "ended" || y.status === "declined" || y.status === "missed") endCallLocal(y.status);
    }, function () {}));
  }
  async function startCall(kind) {
    if (!chat || chat.g) return; var f = curFriend(); if (!f || f.blocked) { toast("Tidak bisa menelepon teman ini."); return; }
    if (call) { toast("Sedang dalam panggilan."); return; }
    if (!window.RTCPeerConnection || !navigator.mediaDevices) { toast("Perangkat ini belum mendukung panggilan."); return; }
    var stream; try { stream = await getMedia(kind); } catch (e) { toast("Izin mikrofon/kamera ditolak."); return; }
    var ref = fs.collection("calls").doc();
    call = { id: ref.id, kind: kind, role: "caller", to: chat.o, pair: chat.id, local: stream, un: [], state: "ringing", logged: false };
    buildPC(); showCallUI(); startRing(true);
    try {
      var offer = await call.pc.createOffer(); await call.pc.setLocalDescription(offer);
      await ref.set({ from: me, to: call.to, pair: call.pair, kind: kind, status: "ringing", offer: { type: offer.type, sdp: offer.sdp }, at: Date.now() });
    } catch (e) { toast("Gagal memulai panggilan."); endCallLocal("ended", true); return; }
    flushOut(); watchCallDoc(ref);
    call.un.push(ref.collection("cand").where("from", "==", call.to).onSnapshot(handleCand, function () {}));
    call.ring = setTimeout(function () { if (call && call.state === "ringing") { call.noAnswer = true; hangup(); } }, 45000);
  }
  function incoming(d) {
    var x = d.data(); if (!x || Date.now() - (x.at || 0) > 50000) return;
    var f = friends.filter(function (a) { return a.id === x.pair; })[0];
    if (call || !f || f.blocked) { d.ref.update({ status: "declined" }).catch(function () {}); return; }
    call = { id: d.id, kind: x.kind, role: "callee", to: x.from, pair: x.pair, offer: x.offer, un: [], state: "incoming" };
    showCallUI(); startRing(false); watchCallDoc(d.ref);
    call.ring = setTimeout(function () { if (call && call.state === "incoming") declineIncoming(); }, 45000);
  }
  async function acceptIncoming() {
    if (!call || call.state !== "incoming") return; stopRing(); clearTimeout(call.ring);
    var stream; try { stream = await getMedia(call.kind); } catch (e) { toast("Izin mikrofon/kamera ditolak."); declineIncoming(); return; }
    call.local = stream; call.state = "connecting"; buildPC(); updateCallUI();
    try {
      await call.pc.setRemoteDescription(call.offer); flushIn();
      var ans = await call.pc.createAnswer(); await call.pc.setLocalDescription(ans);
      var ref = fs.collection("calls").doc(call.id);
      await ref.update({ status: "accepted", answer: { type: ans.type, sdp: ans.sdp } });
      flushOut(); call.un.push(ref.collection("cand").where("from", "==", call.to).onSnapshot(handleCand, function () {}));
    } catch (e) { toast("Gagal menerima panggilan."); hangup(); }
  }
  function declineIncoming() { if (!call) return; var id = call.id; fs.collection("calls").doc(id).update({ status: "declined" }).catch(function () {}); endCallLocal("declined", true); }
  function hangup() {
    if (!call) return;
    if (call.state === "incoming") { declineIncoming(); return; }
    var id = call.id, st = call.noAnswer ? "missed" : "ended"; fs.collection("calls").doc(id).update({ status: st }).catch(function () {});
    endCallLocal(st);
  }
  async function logCall(status) {
    var c = call; if (!c || c.role !== "caller" || c.logged) return; c.logged = true;
    var base = c.kind === "video" ? "📹 Video call" : "📞 Panggilan suara", txt;
    if (c.t0) txt = base + " · " + fmtDur(Math.round((Date.now() - c.t0) / 1000)); else if (status === "declined") txt = base + " · Ditolak"; else if (status === "missed") txt = base + " · Tidak terjawab"; else txt = base + " · Dibatalkan";
    try { var ref = fs.collection("friends").doc(c.pair), b = fs.batch(); b.set(ref.collection("msgs").doc(), { from: me, text: txt, kind: "call", at: FV.serverTimestamp() }); b.update(ref, { lastText: txt, lastAt: FV.serverTimestamp(), lastFrom: me, ["read." + me]: Date.now() }); await b.commit(); } catch (e) {}
  }
  function endCallLocal(status, silent) {
    var c = call; if (!c) return; if (!silent) logCall(status);
    call = null; clearTimeout(c.ring); clearInterval(c.tm); stopRing();
    (c.un || []).forEach(function (u) { try { u(); } catch (e) {} });
    try { c.local && c.local.getTracks().forEach(function (x) { x.stop(); }); } catch (e) {}
    try { c.pc && c.pc.close(); } catch (e) {}
    var ui = document.getElementById("mfCall"); if (ui) ui.remove();
    if (c.role === "caller") setTimeout(function () { var ref = fs.collection("calls").doc(c.id); ref.collection("cand").get().then(function (s) { var b = fs.batch(); s.forEach(function (d) { b.delete(d.ref); }); return b.commit(); }).catch(function () {}).then(function () { return ref.delete(); }).catch(function () {}); }, 3000);
  }
  function showCallUI() {
    ensureRoot(); var ui = document.getElementById("mfCall"); if (ui) ui.remove();
    ui = $("div", "mfcall"); ui.id = "mfCall"; ui.setAttribute("role", "dialog");
    var rv = $(call.kind === "video" ? "video" : "audio"); rv.id = "mfRV"; rv.autoplay = true; rv.setAttribute("playsinline", ""); ui.appendChild(rv);
    if (call.kind === "video") { var lv = $("video"); lv.id = "mfLV"; lv.autoplay = true; lv.muted = true; lv.setAttribute("playsinline", ""); ui.appendChild(lv); }
    var info = $("div", "mfcinfo"); var av0 = $("div", "mfcav", callName().slice(0, 1).toUpperCase()); av0.style.background = color(call.pair); info.appendChild(av0);
    var nm = $("div", "mfcname", callName()); info.appendChild(nm); var stt = $("div", "mfcstat", ""); stt.id = "mfCallS"; info.appendChild(stt); ui.appendChild(info);
    var bar = $("div", "mfcbar"); bar.id = "mfCallBar"; ui.appendChild(bar); document.body.appendChild(ui); updateCallUI(); attachLocal();
  }
  function attachLocal() { var lv = document.getElementById("mfLV"); if (lv && call && call.local) { lv.srcObject = call.local; lv.play && lv.play().catch(function () {}); } }
  function attachRemote() { var rv = document.getElementById("mfRV"); if (rv && call) { rv.srcObject = call.remote; rv.play && rv.play().catch(function () {}); var ui = document.getElementById("mfCall"); if (ui && call.kind === "video") ui.classList.add("hasv"); } }
  function updateCallUI() {
    var ui = document.getElementById("mfCall"); if (!ui || !call) return; var st = document.getElementById("mfCallS"), bar = document.getElementById("mfCallBar");
    var txt = call.state === "incoming" ? (call.kind === "video" ? "Video call masuk…" : "Panggilan suara masuk…") : call.state === "ringing" ? "Memanggil…" : call.state === "connecting" ? "Menyambungkan…" : fmtDur(Math.round((Date.now() - (call.t0 || Date.now())) / 1000));
    if (st) st.textContent = txt; attachLocal(); attachRemote();
    if (bar.dataset.st === call.state) return; bar.dataset.st = call.state; bar.textContent = "";
    function btn(ic, lb, cls, fn, id) { var w = $("div", "mfcb"), b = $("button", cls || "", ic); b.type = "button"; b.setAttribute("aria-label", lb); if (id) b.id = id; b.onclick = fn; w.appendChild(b); w.appendChild($("span", null, lb)); bar.appendChild(w); return b; }
    if (call.state === "incoming") { btn("✕", "Tolak", "mfred", declineIncoming, "mfCallNo"); btn("✓", "Terima", "mfgreen", acceptIncoming, "mfCallYes"); return; }
    var mu = btn("🎤", "Mic", "", function () { var a = call.local && call.local.getAudioTracks()[0]; if (!a) return; a.enabled = !a.enabled; mu.classList.toggle("off", !a.enabled); mu.textContent = a.enabled ? "🎤" : "🔇"; }, "mfCallMic");
    if (call.kind === "video") btn("📷", "Kamera", "", function (e) { var v = call.local && call.local.getVideoTracks()[0]; if (!v) return; v.enabled = !v.enabled; e.currentTarget.classList.toggle("off", !v.enabled); }, "mfCallCam");
    btn("📵", "Akhiri", "mfred", hangup, "mfCallEnd");
  }

  /* ---------- entry points ---------- */
  function syncEntry() {
    var n = badgeCount();
    document.querySelectorAll(".mfent").forEach(function (r) { var b = r.querySelector(".mfbadge"); if (n) { if (!b) { b = $("span", "mfbadge"); r.appendChild(b); } b.textContent = String(n); } else if (b) b.remove(); });
    ensureEntries();
  }
  function ensureEntries() {
    if (!started) return;
    document.querySelectorAll(".frow.addf").forEach(function (a) {
      var p = a.parentNode; if (!p || p.querySelector(":scope > .mfent")) return;
      var b = $("button", "frow mfent"); b.type = "button";
      var pl = $("span", "plus", "＋"); b.appendChild(pl); b.appendChild($("div", "fn", mmT("友だちを追加(リアル)", "Tambah teman (asli)", "Add a friend (real)"))); b.style.cssText += ";";
      b.onclick = function () { openList(); }; p.insertBefore(b, a);
      var n = badgeCount(); if (n) { var bd = $("span", "mfbadge", String(n)); b.appendChild(bd); }
    });
  }
  async function start() {
    if (started) return; ctx = window.mmCtx; if (!ctx || !ctx.user) return;
    fs = ctx.fs; FV = ctx.fb.firestore.FieldValue; me = ctx.user.uid;
    try { await ensureProfile(); } catch (e) { return; }
    started = true; listen(); listenExtra(); ensureEntries();
    new MutationObserver(function () { ensureEntries(); }).observe(document.body, { childList: true, subtree: true });
    var m = /[?&]add=([A-Za-z0-9-]+)/.exec(location.search);
    if (m) { openList("MM-" + normCode(m[1])); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  }
  window.mmFriends = {
    ready: function () { return started; },
    list: function () { return friends.map(function (f) { return { id: f.id, uid: other(f), name: nameOf(other(f)), last: f.lastText || "", at: ms(f.lastAt), unread: unread(f), blocked: !!f.blocked }; }); },
    glist: function () { return groups.map(function (g) { return { id: g.id, name: g.name, n: g.members.length, ai: g.ai || [], last: g.lastText || "", at: ms(g.lastAt), unread: unread(g) }; }); },
    openChat: function (pid) { if (started) openChat(pid, false, true); },
    openGroup: function (gid) { if (started) openChat(gid, true, true); },
    createGroup: function (name, uids, ais) { return createGroup(name, uids, ais); },
    openList: function () { if (started) openList(); },
    open: function () { if (!started) { alert("Masuk dulu dengan akun untuk memakai teman sungguhan."); return; } openList(); },
    purge: async function () {
      if (!started) return;
      var fl = await fs.collection("friends").where("members", "array-contains", me).get(), jobs = [];
      for (var i = 0; i < fl.docs.length; i++) {
        var d = fl.docs[i], ms2 = await d.ref.collection("msgs").where("from", "==", me).get(); ms2.forEach(function (x) { jobs.push(x.ref.delete()); }); await Promise.all(jobs.splice(0)); await d.ref.delete();
      }
      var r1 = await fs.collection("requests").where("from", "==", me).get(), r2 = await fs.collection("requests").where("to", "==", me).get();
      r1.forEach(function (x) { jobs.push(x.ref.delete()); }); r2.forEach(function (x) { jobs.push(x.ref.delete()); });
      if (myCode) jobs.push(fs.collection("codes").doc(myCode).delete());
      if (myHandle) jobs.push(fs.collection("handles").doc(myHandle).delete());
      jobs.push(fs.collection("profiles").doc(me).delete());
      await Promise.all(jobs);
    }
  };
  if (window.mmCtx) start(); else document.addEventListener("mm-ready", start, { once: true });
})();
