/* M&M's — teman sungguhan (chat antar pengguna) di atas Firebase Auth + Firestore.
   Hanya aktif di versi website/Play Store setelah masuk (butuh window.mmCtx dari mm-backend.js). */
(function () {
  "use strict";
  var AL = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", STK = ["😊", "😂", "🥰", "😭", "👍", "🙏", "🎉", "❤️", "😴", "🤔", "🔥", "👋"];
  var ctx = null, fs = null, FV = null, me = null, myName = "", myCode = "", started = false;
  var friends = [], reqIn = [], reqOut = [], names = {}, unsubs = [], chatUn = null, chat = null, view = "none", root = null;

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
    ".mfto{position:fixed;left:50%;bottom:90px;transform:translateX(-50%);z-index:9100;background:#2a2150;color:#fff;border-radius:999px;padding:10px 16px;font:14px system-ui,sans-serif;max-width:86vw}";

  function toast(t) { var x = $("div", "mfto", t); document.body.appendChild(x); setTimeout(function () { x.remove(); }, 2600); }
  function color(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360; return "hsl(" + h + ",55%,52%)"; }
  function nameOf(uid) { return names[uid] || "Teman"; }
  function av(uid) { var a = $("div", "mfav", (nameOf(uid) || "?").slice(0, 1).toUpperCase()); a.style.background = color(uid); return a; }

  /* ---------- data ---------- */
  async function ensureProfile() {
    var pr = await fs.collection("profiles").doc(me).get();
    if (pr.exists) { var d = pr.data(); myName = d.name; myCode = d.code; names[me] = myName; return; }
    var u = ctx.user, base = ((u.displayName || (u.email || "").split("@")[0] || (u.phoneNumber ? "Pengguna " + u.phoneNumber.slice(-4) : "Aku")) + "").trim().slice(0, 24) || "Aku";
    var code = "";
    for (var t = 0; t < 8; t++) {
      var c = ""; for (var i = 0; i < 8; i++) c += AL[Math.floor(Math.random() * AL.length)];
      try { await fs.collection("codes").doc(c).set({ uid: me }); code = c; break; } catch (e) { if (t === 7) throw e; }
    }
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
  function unread(f) { var r = (f.read || {})[me] || 0; return f.lastFrom && f.lastFrom !== me && ms(f.lastAt) > r && !(chat && chat.id === f.id && view === "chat"); }
  function badgeCount() { return reqIn.length + friends.filter(unread).length; }

  async function lookup(raw) {
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
  function closeAll() { if (chatUn) { chatUn(); chatUn = null; } chat = null; view = "none"; if (root) { root.remove(); root = null; } syncEntry(); }
  function refresh() { syncEntry(); if (view === "list") renderList(); else if (view === "chat" && chat) renderChatHead(); }

  /* ---------- list ---------- */
  function openList(prefill) { addNote = null; view = "list"; if (chatUn) { chatUn(); chatUn = null; } chat = null; renderList(prefill); }
  var addDraft = "", addNote = null;
  function renderList(prefill) {
    if (typeof prefill === "string") addDraft = prefill;
    var keep = root && root.querySelector("#mfCode") ? root.querySelector("#mfCode").value : null;
    if (keep != null) addDraft = keep;
    var hadFocus = !!(root && document.activeElement && document.activeElement.id === "mfCode");
    var p = mount("Teman sungguhan", closeAll), body = $("div", "mfbody"); p.appendChild(body);
    var me1 = $("div", "mfc"); me1.appendChild($("div", "mfs", "Kodemu"));
    var cd = $("div", "mfcode", dispCode(myCode)); cd.id = "mfMyCode"; me1.appendChild(cd);
    me1.appendChild($("div", "mfsub", "Nama tampil: " + myName));
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
    br.appendChild(sh); br.appendChild(rn); me1.appendChild(br); body.appendChild(me1);

    var ad = $("div", "mfc"); ad.appendChild($("div", "mfs", "Tambah teman"));
    var inp = $("input", "mfin"); inp.id = "mfCode"; inp.placeholder = "Kode teman, mis. MM-4K9Q2XAB"; inp.autocapitalize = "characters"; inp.autocomplete = "off"; inp.value = addDraft; ad.appendChild(inp);
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
    if (hadFocus) { var ci = root.querySelector("#mfCode"); if (ci) { ci.focus(); try { ci.setSelectionRange(ci.value.length, ci.value.length); } catch (e) {} } }
  }

  /* ---------- chat ---------- */
  function openChat(pid) {
    var f = friends.filter(function (x) { return x.id === pid; })[0]; if (!f) { toast("Teman tidak ditemukan."); return; }
    chat = { id: pid, f: f, o: other(f), msgs: [], stk: false }; view = "chat"; renderChatShell();
    var q = fs.collection("friends").doc(pid).collection("msgs").orderBy("at").limitToLast(150);
    chatUn = q.onSnapshot(function (s) { chat.msgs = []; s.forEach(function (d) { var x = d.data(); x.id = d.id; chat.msgs.push(x); }); renderMsgs(); markRead(); }, function () { toast("Tidak bisa memuat pesan."); });
  }
  function markRead() { if (!chat) return; var f0 = curFriend(); if (f0 && f0.lastFrom !== me && ms(f0.lastAt) <= ((f0.read || {})[me] || 0)) return; if (f0 && !f0.lastFrom) return; try { fs.collection("friends").doc(chat.id).update("read." + me, Date.now()).catch(function () {}); } catch (e) {} }
  function curFriend() { return chat ? (friends.filter(function (x) { return x.id === chat.id; })[0] || null) : null; }
  function renderChatHead() { if (!root) return; var f = curFriend(); if (!f) { toast("Pertemanan sudah berakhir."); openList(); return; } chat.f = f; var t = root.querySelector("#mfTitle"); if (t) t.textContent = nameOf(chat.o);
    var key = String(f.blocked || ""); if (chat.ck !== key) { chat.ck = key; renderCompose(); }
    renderMsgs(); }
  function renderChatShell() {
    var mb = $("button", "mfb", "⋮"); mb.type = "button"; mb.id = "mfMenu"; mb.setAttribute("aria-label", "Menu"); mb.onclick = chatMenu;
    var p = mount(nameOf(chat.o), function () { openList(); }, mb);
    var ml = $("div", "mfmsgs"); ml.id = "mfMsgs"; p.appendChild(ml);
    var cz = $("div"); cz.id = "mfComp"; p.appendChild(cz); chat.ck = String((curFriend() || chat.f).blocked || ""); renderCompose(); renderMsgs();
  }
  function renderCompose() {
    var cz = root && root.querySelector("#mfComp"); if (!cz) return; var f = curFriend() || chat.f; cz.textContent = "";
    if (f.blocked) { var n = $("div", "mfnote", f.blocked === me ? "Kamu memblokir teman ini. Buka blokir lewat menu ⋮ untuk melanjutkan." : "Tidak bisa mengirim pesan ke teman ini."); n.id = "mfBlocked"; cz.appendChild(n); return; }
    if (chat.stk) { var s = $("div", "mfstk"); STK.forEach(function (e) { var b = $("button", null, e); b.type = "button"; b.onclick = function () { chat.stk = false; send(e, "sticker"); renderCompose(); }; s.appendChild(b); }); cz.appendChild(s); }
    var c = $("div", "mfcmp"), sb = $("button", "mfb", "😊"); sb.type = "button"; sb.id = "mfStk"; sb.onclick = function () { chat.stk = !chat.stk; renderCompose(); };
    var i = $("input"); i.id = "mfText"; i.maxLength = 1000; i.placeholder = "Ketik pesan"; i.enterKeyHint = "send";
    var go = $("button", "mfpill mfpri", "Kirim"); go.type = "button"; go.id = "mfGo";
    function fire() { var v = i.value.trim(); if (!v) return; i.value = ""; send(v, "text"); }
    go.onclick = fire; i.addEventListener("keydown", function (e) { if (e.key === "Enter") fire(); });
    c.appendChild(sb); c.appendChild(i); c.appendChild(go); cz.appendChild(c);
  }
  async function send(text, kind) {
    if (!chat) return;
    var pid = chat.id, now = Date.now(), ref = fs.collection("friends").doc(pid), mr = ref.collection("msgs").doc();
    try {
      var b = fs.batch();
      b.set(mr, { from: me, text: String(text).slice(0, 1000), kind: kind, at: FV.serverTimestamp() });
      b.update(ref, { lastText: kind === "sticker" ? text : String(text).slice(0, 80), lastAt: FV.serverTimestamp(), lastFrom: me, ["read." + me]: now });
      await b.commit();
    } catch (e) { toast("Pesan gagal terkirim."); }
  }
  function renderMsgs() {
    var ml = root && root.querySelector("#mfMsgs"); if (!ml || !chat) return;
    var near = ml.scrollHeight - ml.scrollTop - ml.clientHeight < 120 || !ml.childNodes.length; ml.textContent = ""; var last = "";
    var f = curFriend() || chat.f, rd = (f.read || {})[chat.o] || 0;
    chat.msgs.forEach(function (m) {
      var dk = dayKey(m.at); if (dk !== last) { last = dk; ml.appendChild($("div", "mfday", dayLabel(m.at))); }
      var mine = m.from === me, row = $("div", "mfm " + (mine ? "me" : "them")), bb = $("div", "mfbb" + (m.kind === "sticker" ? " stk" : ""), m.text); bb.dataset.id = m.id;
      var t = $("div", "mft", (mine && ms(m.at) <= rd ? "Dibaca\n" : "") + hhmm(m.at)); t.style.whiteSpace = "pre-line";
      if (mine) { row.appendChild(t); row.appendChild(bb); bb.style.cursor = "pointer"; bb.onclick = function () { if (window.confirm("Tarik pesan ini?")) fs.collection("friends").doc(chat.id).collection("msgs").doc(m.id).delete().catch(function () { toast("Gagal menarik pesan."); }); }; } else { row.appendChild(bb); row.appendChild(t); }
      ml.appendChild(row);
    });
    if (near) ml.scrollTop = ml.scrollHeight;
  }
  function chatMenu() {
    var f = curFriend(); if (!f || !root) return; var sh = $("div", "mfsheet"); sh.id = "mfSheet";
    function item(label, cls, fn) { var b = $("button", "mfpill " + (cls || ""), label); b.type = "button"; b.onclick = function () { sh.remove(); fn(); }; sh.appendChild(b); return b; }
    if (f.blocked === me) item("Buka blokir", "mfunblock", function () { fs.collection("friends").doc(f.id).update("blocked", null).then(function () { toast("Blokir dibuka."); }).catch(function () { toast("Gagal."); }); });
    else if (!f.blocked) item("Blokir", "mfblock mfwarn", function () { if (window.confirm("Blokir " + nameOf(chat.o) + "? Kalian tidak bisa saling kirim pesan.")) fs.collection("friends").doc(f.id).update("blocked", me).then(function () { toast("Diblokir."); }).catch(function () { toast("Gagal."); }); });
    item("Laporkan", "mfreport", reportFlow);
    item("Hapus teman", "mfremove mfwarn", function () { if (window.confirm("Hapus " + nameOf(chat.o) + " dari teman? Riwayat chat tidak bisa dibuka lagi.")) { var id = f.id; fs.collection("friends").doc(id).delete().then(function () { toast("Teman dihapus."); openList(); }).catch(function () { toast("Gagal menghapus."); }); } });
    item("Tutup", "", function () { });
    root.appendChild(sh);
  }
  async function reportFlow() {
    var why = window.prompt("Alasan laporan (spam / pelecehan / lainnya):", "spam"); if (why == null) return;
    var note = (window.prompt("Catatan singkat (opsional):", "") || "").slice(0, 300);
    var sample = chat.msgs.slice(-10).map(function (m) { return { from: m.from, text: String(m.text).slice(0, 200), at: ms(m.at) }; });
    try { await fs.collection("reports").add({ by: me, target: chat.o, pair: chat.id, reason: String(why).slice(0, 40), note: note, sample: sample, at: Date.now() }); toast("Laporan terkirim. Terima kasih."); } catch (e) { toast("Gagal mengirim laporan."); }
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
      var pl = $("span", "plus", "👥"); b.appendChild(pl); b.appendChild($("div", "fn", "Teman sungguhan")); b.style.cssText += ";";
      b.onclick = function () { openList(); }; p.insertBefore(b, a);
      var n = badgeCount(); if (n) { var bd = $("span", "mfbadge", String(n)); b.appendChild(bd); }
    });
  }
  async function start() {
    if (started) return; ctx = window.mmCtx; if (!ctx || !ctx.user) return;
    fs = ctx.fs; FV = ctx.fb.firestore.FieldValue; me = ctx.user.uid;
    try { await ensureProfile(); } catch (e) { return; }
    started = true; listen(); ensureEntries();
    new MutationObserver(function () { ensureEntries(); }).observe(document.body, { childList: true, subtree: true });
    var m = /[?&]add=([A-Za-z0-9-]+)/.exec(location.search);
    if (m) { openList("MM-" + normCode(m[1])); try { history.replaceState(null, "", location.pathname); } catch (e) {} }
  }
  window.mmFriends = {
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
      jobs.push(fs.collection("profiles").doc(me).delete());
      await Promise.all(jobs);
    }
  };
  if (window.mmCtx) start(); else document.addEventListener("mm-ready", start, { once: true });
})();
