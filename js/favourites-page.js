// CineBook – Stage 5: the Favourites page (search, filters, remove, clear all).
// It only DISPLAYS what js/favourites.js has stored, and redraws whenever the favourites change.

(function () {
  "use strict";

  const CineBook = window.CineBook;
  const store = CineBook.favourites;
  const { el } = CineBook.quizKit;

  const $ = (id) => document.getElementById(id);
  const toolbar = $("favToolbar"), search = $("favSearch"), typeBar = $("favType"), genreSel = $("favGenre"),
    sortSel = $("favSort"), clearBtn = $("favClear"), status = $("favStatus"), empty = $("favEmpty"), note = $("favNote"),
    dialog = $("confirmDialog");

  const PANELS = {
    movie: { panel: $("favMovies"), grid: $("favMoviesGrid"), title: $("favMoviesTitle"), label: "🎬 Movies", none: "No movies saved yet.", icon: "🎬", link: "#movies", linkText: "Find movies" },
    book: { panel: $("favBooks"), grid: $("favBooksGrid"), title: $("favBooksTitle"), label: "📚 Books", none: "No books saved yet.", icon: "📖", link: "#books", linkText: "Find books" },
  };

  // What the visitor has chosen on this page (not saved – only the favourites themselves are saved).
  const view = { q: "", type: "all", genre: "", sort: "recent" };

  // ---------- Filtering and sorting ----------
  const yearOf = (f) => { const m = f.sub.match(/\b(1[0-9]{3}|20[0-9]{2})\b/); return m ? +m[1] : 0; };

  function matches(f) {
    if (view.type !== "all" && f.type !== view.type) return false;
    if (view.genre && !f.genres.includes(view.genre)) return false;
    const q = view.q.trim().toLowerCase();
    if (!q) return true;
    return [f.title, f.sub, f.genres.join(" ")].join(" ").toLowerCase().includes(q);
  }
  function sorted(list) {
    const out = list.slice(); // the store already lists newest first, so "recent" keeps that order
    if (view.sort === "az") out.sort((a, b) => a.title.localeCompare(b.title));
    if (view.sort === "year") out.sort((a, b) => yearOf(b) - yearOf(a) || a.title.localeCompare(b.title));
    return out;
  }

  // ---------- Drawing ----------
  function card(f) {
    const article = el("article", "fav-card fav-" + f.type);
    const poster = CineBook.posterFrame({ id: f.id, title: f.title, image: f.image, icon: PANELS[f.type].icon, alt: "Cover of " + f.title });

    const body = el("div", "fav-body");
    const tags = el("div", "fav-tags");
    f.genres.slice(0, 3).forEach((g) => tags.appendChild(el("span", "fav-tag", g)));
    const remove = el("button", "fav-remove", "✕ Remove");
    remove.type = "button";
    remove.setAttribute("aria-label", "Remove " + f.title + " from favourites");
    remove.addEventListener("click", () => {
      store.remove(f.type, f.id);
      if (CineBook.toast) CineBook.toast("Removed “" + f.title + "” from favourites");
    });
    body.append(el("h4", "", f.title), el("p", "fav-sub", f.sub), tags, el("p", "fav-desc", f.description), remove);

    article.append(poster, body);
    return article;
  }

  function fillGenreMenu(all) {
    const genres = [...new Set(all.flatMap((f) => f.genres))].sort();
    if (view.genre && !genres.includes(view.genre)) view.genre = ""; // that genre is gone
    genreSel.replaceChildren(el("option", "", "All genres"), ...genres.map((g) => el("option", "", g)));
    genreSel.firstChild.value = "";
    genreSel.value = view.genre;
  }

  function showEmpty(title, message, actions) {
    empty.replaceChildren(el("div", "empty-icon", "♡"), el("h3", "", title), el("p", "", message));
    if (actions.length) {
      const row = el("div", "fav-empty-actions");
      actions.forEach((a) => row.appendChild(a));
      empty.appendChild(row);
    }
    empty.hidden = false;
  }
  function linkButton(text, href, cls) {
    const a = el("a", "btn " + cls, text);
    a.href = href;
    return a;
  }

  function render() {
    const all = store.list();
    const st = store.status();

    // notes about Local Storage problems
    const notes = [];
    if (!st.persistent) notes.push("⚠ This browser is blocking Local Storage (for example in a private window), so favourites will only last until you close this tab.");
    if (st.recovered) notes.push("ℹ Some saved favourites were unreadable and were ignored.");
    note.textContent = notes.join(" ");
    note.hidden = notes.length === 0;

    toolbar.hidden = all.length === 0;
    fillGenreMenu(all);

    const shown = sorted(all.filter(matches));
    empty.hidden = true;

    if (all.length === 0) {
      Object.values(PANELS).forEach((p) => (p.panel.hidden = true));
      showEmpty("No favourites yet", "Tap the ♡ on a movie or book card and it will appear here.",
        [linkButton("🎬 Find movies", "#movies", "btn-movie"), linkButton("📚 Find books", "#books", "btn-book")]);
      return;
    }

    ["movie", "book"].forEach((type) => {
      const p = PANELS[type];
      const mine = shown.filter((f) => f.type === type);
      const savedOfType = all.some((f) => f.type === type);
      const allowed = view.type === "all" || view.type === type;

      p.grid.replaceChildren(...mine.map(card));
      p.title.textContent = p.label + " (" + mine.length + ")";
      if (!allowed) p.panel.hidden = true;
      else if (mine.length) p.panel.hidden = false;
      else if (!savedOfType) { // nothing of this type saved at all
        p.grid.replaceChildren(el("p", "fav-none", p.none));
        p.title.textContent = p.label + " (0)";
        p.panel.hidden = false;
      } else p.panel.hidden = true; // saved, but none match the search/filter
    });

    status.textContent = shown.length === all.length
      ? all.length + (all.length === 1 ? " favourite saved" : " favourites saved")
      : "Showing " + shown.length + " of " + all.length + " favourites";

    if (shown.length === 0) {
      const reset = el("button", "btn btn-ghost", "Clear search and filters");
      reset.type = "button";
      reset.addEventListener("click", resetView);
      const what = view.q.trim() ? "“" + view.q.trim() + "”" : "these filters";
      showEmpty("No favourites match " + what, "Nothing you saved fits this search. Try a different word, or remove a filter.", [reset]);
    }
  }

  function resetView() {
    view.q = ""; view.type = "all"; view.genre = ""; view.sort = "recent";
    search.value = ""; sortSel.value = "recent";
    syncTypeBar();
    render();
  }

  function syncTypeBar() {
    typeBar.querySelectorAll("button").forEach((b) => {
      const on = b.dataset.type === view.type;
      b.classList.toggle("active", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  // ---------- Controls ----------
  search.addEventListener("input", () => { view.q = search.value; render(); });
  genreSel.addEventListener("change", () => { view.genre = genreSel.value; render(); });
  sortSel.addEventListener("change", () => { view.sort = sortSel.value; render(); });
  typeBar.addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    view.type = b.dataset.type;
    syncTypeBar();
    render();
  });

  // Clear all: always asks first.
  clearBtn.addEventListener("click", () => {
    const movies = store.list().filter((f) => f.type === "movie").length;
    const books = store.count() - movies;
    const message = "This will remove all " + store.count() + " saved favourites (" + movies + " movie" + (movies === 1 ? "" : "s") + " and " + books + " book" + (books === 1 ? "" : "s") + "). This cannot be undone.";
    $("confirmText").textContent = message;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else if (window.confirm(message)) doClear(); // very old browsers
  });
  dialog.addEventListener("close", () => { if (dialog.returnValue === "ok") doClear(); dialog.returnValue = ""; });
  function doClear() {
    store.clear();
    if (CineBook.toast) CineBook.toast("All favourites cleared");
  }

  document.addEventListener("cinebook:favourites-changed", render);
  render();
})();
