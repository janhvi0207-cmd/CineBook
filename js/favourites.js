// CineBook – Stage 5: favourites store (the ONLY file that reads or writes Local Storage).
//
// What is saved?  A list of small "snapshots" – one per favourite – under the key "cinebookFavourites":
//   { type: "movie" | "book", id, title, sub, image, genres, description, savedAt }
// A snapshot keeps everything needed to show the item, so the Favourites page works even if the JSON data
// has not loaded. A favourite is identified by type + id, so the same item can never be saved twice.
//
// Local Storage can be missing, full, blocked (private mode) or contain damaged text.
// Every read/write below is wrapped in try/catch, and the site keeps working in every case:
//   • storage blocked      → favourites still work for this visit (kept in memory) and a note is shown
//   • damaged / wrong data → it is ignored and cleaned; valid entries are kept; a note is shown

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});
  const { el } = CineBook.quizKit;

  const KEY = "cinebookFavourites";
  const TYPES = ["movie", "book"];

  let items = [];          // the current favourites, newest first
  let persistent = true;   // false when Local Storage cannot be used
  let recovered = false;   // true when damaged data had to be ignored

  const keyOf = (type, id) => type + ":" + id;
  const text = (v) => (typeof v === "string" ? v : "");

  // ---------- Reading: accept only well-formed, unique entries ----------
  function clean(raw) {
    if (!Array.isArray(raw)) { recovered = true; return []; }
    const seen = new Set();
    const good = [];
    raw.forEach((e) => {
      const ok = e && typeof e === "object" && TYPES.includes(e.type) && text(e.id) && text(e.title);
      if (!ok || seen.has(keyOf(e.type, e.id))) { recovered = true; return; }
      seen.add(keyOf(e.type, e.id));
      good.push({
        type: e.type, id: e.id, title: e.title,
        sub: text(e.sub), image: text(e.image), description: text(e.description),
        genres: Array.isArray(e.genres) ? e.genres.filter((g) => typeof g === "string") : [],
        savedAt: Number.isFinite(e.savedAt) ? e.savedAt : 0,
      });
    });
    return good;
  }

  function load() {
    let raw = null;
    try {
      raw = localStorage.getItem(KEY);
    } catch (err) {
      persistent = false; // storage is blocked
      return [];
    }
    if (raw === null) return [];
    try {
      return clean(JSON.parse(raw));
    } catch (err) {
      recovered = true; // the saved text was damaged
      return [];
    }
  }

  // ---------- Writing ----------
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(items));
      persistent = true;
    } catch (err) {
      persistent = false; // blocked or full: keep working in memory
    }
  }

  // ---------- Change notification ----------
  function changed() {
    const n = items.length;
    const badge = document.getElementById("favCount");
    if (badge) badge.textContent = n;
    // refresh every heart button on the page
    document.querySelectorAll(".fav-btn").forEach(refreshButton);
    document.dispatchEvent(new CustomEvent("cinebook:favourites-changed"));
  }

  function say(message) {
    if (CineBook.toast) CineBook.toast(message);
  }

  // ---------- Public actions ----------
  const has = (type, id) => items.some((f) => f.type === type && f.id === id);

  function add(snapshot) {
    if (has(snapshot.type, snapshot.id)) return false; // no duplicates
    items.unshift(Object.assign({}, snapshot, { savedAt: Date.now() }));
    save();
    changed();
    return true;
  }
  function remove(type, id) {
    const before = items.length;
    items = items.filter((f) => !(f.type === type && f.id === id));
    if (items.length === before) return false;
    save();
    changed();
    return true;
  }
  function clear() {
    items = [];
    save();
    changed();
  }

  // Turns a movie / book record from the dataset into a snapshot.
  function snapshotFor(type, item) {
    const isMovie = type === "movie";
    return {
      type,
      id: item.id,
      title: item.title,
      sub: isMovie ? item.year + " · " + item.duration + " min · " + item.language : "by " + item.author + " · " + item.year,
      image: (isMovie ? item.poster : item.cover) || "",
      genres: item.genres.slice(),
      description: item.description,
    };
  }

  // ---------- The ♡ / ♥ button used on recommendation cards and shelf cards ----------
  function refreshButton(btn) {
    const on = has(btn.dataset.type, btn.dataset.id);
    btn.classList.toggle("on", on);
    btn.setAttribute("aria-pressed", String(on));
    btn.firstChild.textContent = on ? "♥" : "♡";
    btn.setAttribute("aria-label", (on ? "Remove “" : "Add “") + btn.dataset.title + (on ? "” from favourites" : "” to favourites"));
    btn.title = on ? "Remove from favourites" : "Add to favourites";
  }

  function button(type, item) {
    const snap = snapshotFor(type, item);
    const btn = el("button", "fav-btn");
    btn.type = "button";
    btn.dataset.type = type;
    btn.dataset.id = snap.id;
    btn.dataset.title = snap.title;
    btn.appendChild(el("span", "fav-heart", "♡"));
    refreshButton(btn);
    btn.addEventListener("click", () => {
      if (has(type, snap.id)) {
        remove(type, snap.id);
        say("Removed “" + snap.title + "” from favourites");
      } else {
        add(snap);
        btn.classList.add("pop");
        setTimeout(() => btn.classList.remove("pop"), 450);
        say("♥ Added “" + snap.title + "” to favourites");
      }
    });
    return btn;
  }

  // ---------- Start-up ----------
  items = load().sort((a, b) => b.savedAt - a.savedAt);
  if (recovered) save(); // write the cleaned list back so the damage is gone
  document.addEventListener("DOMContentLoaded", changed);
  if (document.readyState !== "loading") changed();

  // Another browser tab changed the favourites → follow it.
  window.addEventListener("storage", (e) => {
    if (e.key !== KEY && e.key !== null) return;
    items = load().sort((a, b) => b.savedAt - a.savedAt);
    changed();
  });

  CineBook.favourites = {
    list: () => items.slice(),
    count: () => items.length,
    has, add, remove, clear, snapshotFor, button,
    status: () => ({ persistent, recovered }),
  };
})();
