// Headless test for cloud.js (fake supabase, fake DOM). Run: node tests/cloud.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

let pass = 0, fail = 0;
function ok(cond, name) { if (cond) pass++; else { fail++; console.log("FAIL:", name); } }
const wait = ms => new Promise(r => setTimeout(r, ms));

function el() {
  const e = { style: {}, className: "", textContent: "", value: "", parentNode: null,
    addEventListener() {}, appendChild() {}, insertBefore() {}, querySelector() { return el(); } };
  return e;
}

function makeEnv({ cloudRow, confirmAnswer }) {
  const store = {};
  const rows = {};
  if (cloudRow) rows.u1 = cloudRow;
  const upserts = [];
  let authCb = null;
  const supabase = { createClient() { return {
    auth: {
      onAuthStateChange(cb) { authCb = cb; },
      signOut() { return Promise.resolve({}); }
    },
    from() { return {
      upsert(row) { upserts.push(row); rows[row.user_id] = row; return Promise.resolve({ error: null }); },
      select() { return { eq(_, id) { return { maybeSingle() { return Promise.resolve({ data: rows[id] || null, error: null }); } }; } }; }
    }; }
  }; } };

  const listeners = {};
  const app = {
    state: { coins: 2500, wins: 0, owned: {}, decks: [{ name: "local" }] },
    saved: 0, loaded: 0,
    saveState() { this.saved++; },
    loadState() {
      this.loaded++;
      Object.assign(this.state, JSON.parse(store.buddyfight_save_v5));
    },
    renderHub() {}, renderShop() {}, renderDeckScreen() {}, updateTopNav() {}, renderCollection() {}
  };
  const document = { getElementById: () => el(), createElement: () => el(), body: el(),
    addEventListener() {}, visibilityState: "visible" };
  const window = { supabase, addEventListener(n, f) { listeners[n] = f; } };
  const sandbox = { window, document, app, supabase, setTimeout, clearTimeout, console,
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } },
    confirm: () => confirmAnswer };
  sandbox.window.window = window;
  vm.createContext(sandbox);
  let src = fs.readFileSync(path.join(__dirname, "..", "cloud.js"), "utf8");
  src = src.replace("YOUR_PROJECT_URL", "https://x.supabase.co").replace("YOUR_ANON_KEY", "k".repeat(40));
  vm.runInContext(src, sandbox);
  listeners.DOMContentLoaded();
  const signIn = () => authCb("SIGNED_IN", { user: { id: "u1", email: "a@b.c" } });
  return { app, window, upserts, store, rows, signIn };
}

(async () => {
  // split / join round trip
  {
    const { window } = makeEnv({});
    const st = { coins: 5, wins: 2, owned: { 1: 4 }, decks: [{ name: "d" }], activeDeckIndex: 0 };
    const parts = window.BF_CLOUD._splitState(st);
    ok(parts.decks.length === 1 && !("decks" in parts.progress) && parts.progress.coins === 5, "split keeps decks apart");
    const back = window.BF_CLOUD._joinState(parts);
    ok(JSON.stringify(back.owned) === '{"1":4}' && back.decks[0].name === "d" && back.wins === 2, "join restores state");
  }

  // first login, no cloud row: uploads the local save
  {
    const t = makeEnv({});
    t.signIn(); await wait(50);
    ok(t.upserts.length === 1 && t.upserts[0].decks[0].name === "local", "first login uploads local save");
    // later save is debounced into one upload
    t.app.saveState(); t.app.saveState(); t.app.saveState();
    ok(t.upserts.length === 1, "no upload before debounce");
    await wait(1700);
    ok(t.upserts.length === 2, "debounced upload after saves");
  }

  // cloud row exists, user chooses cloud: state replaced, no upload
  {
    const row = { user_id: "u1", decks: [{ name: "cloud" }], progress: { coins: 9, wins: 7, owned: { 2: 4 } }, updated_at: "2026-11-01T00:00:00Z" };
    const t = makeEnv({ cloudRow: row, confirmAnswer: true });
    t.signIn(); await wait(50);
    ok(t.app.loaded === 1 && t.app.state.decks[0].name === "cloud" && t.app.state.coins === 9, "cloud save applied");
    ok(t.upserts.length === 0, "choosing cloud does not overwrite it");
    ok(t.store["bf_cloud_ts_u1"] === row.updated_at, "sync marker stored");
  }

  // cloud row exists, user keeps device save: cloud overwritten
  {
    const row = { user_id: "u1", decks: [{ name: "cloud" }], progress: { coins: 9 }, updated_at: "2026-11-01T00:00:00Z" };
    const t = makeEnv({ cloudRow: row, confirmAnswer: false });
    t.signIn(); await wait(50);
    ok(t.app.loaded === 0 && t.upserts.length === 1 && t.upserts[0].decks[0].name === "local", "device save overwrites cloud");
  }

  // already in sync (marker equals cloud timestamp): no prompt, no upload
  {
    const row = { user_id: "u1", decks: [{ name: "cloud" }], progress: {}, updated_at: "2026-11-01T00:00:00Z" };
    const t = makeEnv({ cloudRow: row, confirmAnswer: true });
    t.store["bf_cloud_ts_u1"] = row.updated_at;
    t.signIn(); await wait(50);
    ok(t.app.loaded === 0 && t.upserts.length === 0, "in-sync login does nothing");
  }

  console.log("pass", pass, "fail", fail);
  process.exit(fail ? 1 : 0);
})();
