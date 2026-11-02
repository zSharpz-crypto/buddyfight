/* Supabase login + cloud save for decks and progress.
 * Wraps app.saveState (game.js is not edited). Guests keep using localStorage.
 * SUPABASE_URL / SUPABASE_KEY below are the project URL and publishable key (public by design);
 * data is protected by the Row Level Security policies in supabase_setup.sql. */
(function () {
  "use strict";

  var SUPABASE_URL = "https://pdlugnzmzgljrjicbmdp.supabase.co";
  var SUPABASE_KEY = "sb_publishable_qG83Yd-7UwcEJHj8BZgtnw_9NefD_w5";
  var TABLE = "user_data";
  var LOCAL_KEY = "buddyfight_save_v5";
  var PUSH_DELAY_MS = 1500;

  var configured = /^https:\/\//.test(SUPABASE_URL) && SUPABASE_KEY.length > 30;
  var sb = null, user = null, ready = false, applying = false, pushTimer = null;
  var els = {};

  // ---- state <-> row ------------------------------------------------------
  function splitState(st) {
    var progress = {};
    Object.keys(st).forEach(function (k) { if (k !== "decks") progress[k] = st[k]; });
    return { decks: st.decks || [], progress: progress };
  }
  function joinState(row) {
    var st = Object.assign({}, row.progress || {});
    st.decks = Array.isArray(row.decks) ? row.decks : [];
    return st;
  }
  function summary(st) {
    return (st.decks ? st.decks.length : 0) + " decks, " + (st.wins || 0) + " wins, " +
      (st.coins || 0) + " BP";
  }
  function tsKey() { return "bf_cloud_ts_" + (user ? user.id : ""); }

  // ---- UI -----------------------------------------------------------------
  function setStatus(msg, isError) {
    if (!els.status) return;
    els.status.textContent = msg || "";
    els.status.className = "bfc-status" + (isError ? " bfc-error" : "");
  }
  function refreshAccountUi() {
    if (!els.btn) return;
    els.btn.textContent = user ? "☁️ " + (user.email || "Account").split("@")[0] : "👤 Log in";
    els.formOut.style.display = user ? "none" : "";
    els.formIn.style.display = user ? "" : "none";
    if (user) els.who.textContent = user.email || "";
  }
  function buildUi() {
    var nav = document.getElementById("top-nav");
    var anchor = document.getElementById("nav-rank-badge");
    els.btn = document.createElement("button");
    els.btn.className = "lang-toggle-btn";
    els.btn.id = "btn-account";
    els.btn.textContent = "👤 Log in";
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(els.btn, anchor);
    else if (nav) nav.appendChild(els.btn);

    els.modal = document.createElement("div");
    els.modal.className = "bfc-modal";
    els.modal.style.display = "none";
    els.modal.innerHTML =
      '<div class="bfc-box">' +
        '<button class="bfc-close" type="button" aria-label="Close">✕</button>' +
        '<h3>Account &amp; cloud save</h3>' +
        '<div id="bfc-out">' +
          '<input id="bfc-email" type="email" placeholder="Email" autocomplete="email">' +
          '<input id="bfc-pass" type="password" placeholder="Password (6+ characters)" autocomplete="current-password">' +
          '<div class="bfc-row"><button id="bfc-login" type="button">Log in</button>' +
          '<button id="bfc-signup" type="button">Sign up</button></div>' +
        '</div>' +
        '<div id="bfc-in" style="display:none">' +
          '<p>Logged in as <b id="bfc-who"></b></p>' +
          '<div class="bfc-row"><button id="bfc-save" type="button">Save now</button>' +
          '<button id="bfc-logout" type="button">Log out</button></div>' +
        '</div>' +
        '<div class="bfc-status" id="bfc-status"></div>' +
      '</div>';
    document.body.appendChild(els.modal);

    els.email = els.modal.querySelector("#bfc-email");
    els.pass = els.modal.querySelector("#bfc-pass");
    els.status = els.modal.querySelector("#bfc-status");
    els.formOut = els.modal.querySelector("#bfc-out");
    els.formIn = els.modal.querySelector("#bfc-in");
    els.who = els.modal.querySelector("#bfc-who");

    els.btn.addEventListener("click", function () { els.modal.style.display = "flex"; setStatus(""); });
    els.modal.querySelector(".bfc-close").addEventListener("click", closeModal);
    els.modal.addEventListener("click", function (e) { if (e.target === els.modal) closeModal(); });
    els.modal.querySelector("#bfc-login").addEventListener("click", logIn);
    els.modal.querySelector("#bfc-signup").addEventListener("click", signUp);
    els.modal.querySelector("#bfc-logout").addEventListener("click", logOut);
    els.modal.querySelector("#bfc-save").addEventListener("click", function () {
      doPush().then(function () { setStatus("Saved to cloud."); });
    });
    els.pass.addEventListener("keydown", function (e) { if (e.key === "Enter") logIn(); });
    refreshAccountUi();
  }
  function closeModal() { els.modal.style.display = "none"; }

  // ---- auth ---------------------------------------------------------------
  function creds() { return { email: els.email.value.trim(), password: els.pass.value }; }
  function logIn() {
    var c = creds();
    if (!c.email || !c.password) return setStatus("Enter email and password.", true);
    setStatus("Logging in...");
    sb.auth.signInWithPassword(c).then(function (r) {
      if (r.error) return setStatus(r.error.message, true);
      setStatus("");
      els.pass.value = "";
    });
  }
  function signUp() {
    var c = creds();
    if (!c.email || !c.password) return setStatus("Enter email and password.", true);
    setStatus("Creating account...");
    sb.auth.signUp(c).then(function (r) {
      if (r.error) return setStatus(r.error.message, true);
      if (!r.data.session) setStatus("Account created. Check your email to confirm, then log in.");
      else els.pass.value = "";
    });
  }
  function logOut() {
    doPush().catch(function () {}).then(function () { return sb.auth.signOut(); })
      .then(function () { setStatus("Logged out."); });
  }

  // ---- sync ---------------------------------------------------------------
  function doPush() {
    if (!sb || !user) return Promise.resolve();
    var parts = splitState(app.state), ts = new Date().toISOString();
    return sb.from(TABLE).upsert({
      user_id: user.id, decks: parts.decks, progress: parts.progress, updated_at: ts
    }).then(function (r) {
      if (r.error) throw r.error;
      try { localStorage.setItem(tsKey(), ts); } catch (e) {}
    }).catch(function (e) {
      setStatus("Cloud save failed: " + (e && e.message ? e.message : e), true);
      throw e;
    });
  }
  function schedulePush() {
    if (!user || !ready || applying) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(function () { pushTimer = null; doPush().catch(function () {}); }, PUSH_DELAY_MS);
  }
  function applyCloud(cloud, ts) {
    applying = true;
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(cloud));
      localStorage.setItem(tsKey(), ts);
      app.state.owned = {};
      app.state.decks = [];
      app.loadState();
      ["renderHub", "renderShop", "renderDeckScreen", "updateTopNav"].forEach(function (fn) {
        try { app[fn](); } catch (e) { console.warn("cloud refresh", fn, e); }
      });
      try { app.renderCollection(1); } catch (e) {}
    } finally { applying = false; }
  }
  function pull() {
    return sb.from(TABLE).select("decks, progress, updated_at").eq("user_id", user.id).maybeSingle()
      .then(function (r) {
        if (r.error) throw r.error;
        if (!r.data) return doPush();                       // first login: upload this device's save
        var seen = null;
        try { seen = localStorage.getItem(tsKey()); } catch (e) {}
        if (seen === r.data.updated_at) return;             // already in sync
        var cloud = joinState(r.data);
        var useCloud = confirm(
          "Cloud save found (" + summary(cloud) + ").\n" +
          "This device has (" + summary(app.state) + ").\n\n" +
          "OK = load the cloud save.\nCancel = keep this device's save and overwrite the cloud.");
        if (useCloud) applyCloud(cloud, r.data.updated_at);
        else return doPush();
      });
  }
  function onSignedIn() {
    ready = false;
    refreshAccountUi();
    setStatus("Syncing...");
    pull().then(function () { setStatus("Cloud save on."); })
      .catch(function (e) { setStatus("Sync failed: " + (e && e.message ? e.message : e), true); })
      .then(function () { ready = true; });
  }

  // ---- start --------------------------------------------------------------
  function start() {
    buildUi();
    if (!configured || !window.supabase) {
      els.formOut.innerHTML = "<p>Cloud save is not set up yet.</p>";
      return;
    }
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    var origSave = app.saveState;
    app.saveState = function () {
      var out = origSave.apply(this, arguments);
      schedulePush();
      return out;
    };
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden" && pushTimer) {
        clearTimeout(pushTimer); pushTimer = null; doPush().catch(function () {});
      }
    });
    sb.auth.onAuthStateChange(function (event, session) {
      // Defer: supabase-js can deadlock if its own calls are made inside this callback.
      setTimeout(function () {
        if (session && (!user || user.id !== session.user.id)) { user = session.user; onSignedIn(); }
        else if (!session && user) { user = null; ready = false; refreshAccountUi(); }
      }, 0);
    });
  }

  window.BF_CLOUD = { _splitState: splitState, _joinState: joinState };
  window.addEventListener("DOMContentLoaded", start);
})();
