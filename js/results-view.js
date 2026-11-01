// CineBook – recommendation results page (shared by movies and books).
// It runs the ranking function it is given, then draws the cards, the explanations
// and the "how was this scored?" panels. All numbers shown come straight from the inference engine.

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});
  const { el } = CineBook.quizKit;

  const TOP_COUNT = 5; // how many recommendations are shown first
  const fmt = (n) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

  /*
   cfg = {
     type, noun, nouns, icon,            // "movie", "movie", "movies", "🎬"
     buttonClass,                        // "btn-movie" / "btn-book"
     relaxHint,                          // e.g. "language", shown when nothing matches
     dataset,                            // CineBook.movies / CineBook.books
     engine: { rules, rank(items, prefs), explain(entry, prefs) },
     describe(item): { id, image, title, sub, genres, description },
   }
  */
  CineBook.createResultsView = function (cfg) {
    // ---------- one recommendation card ----------
    function buildTrace(entry) {
      const details = el("details", "rc-trace");
      details.appendChild(el("summary", "", "How the expert system scored this"));

      const totals = el("ul", "rc-totals");
      [
        ["Rules evaluated", entry.rulesEvaluated],
        ["Rules triggered", entry.rulesFired],
        ["Final score", fmt(entry.score) + " / " + fmt(entry.maxScore)],
        ["Match percentage", entry.percent + "%"],
      ].forEach(([k, v]) => {
        const li = el("li");
        li.append(el("span", "", k), el("strong", "", String(v)));
        totals.appendChild(li);
      });
      details.appendChild(totals);

      const table = el("table", "rc-table");
      const head = el("tr");
      ["Rule", "IF condition", "Result", "Points"].forEach((h) => head.appendChild(el("th", "", h)));
      table.appendChild(head);
      entry.trace.forEach((t) => {
        const row = el("tr", t.fired ? "fired" : "");
        const state = !t.applicable ? "not used" : t.fired ? "✔ fired" : "✘ no";
        const pts = !t.applicable ? "–" : fmt(t.points) + " / " + t.rule.weight;
        row.append(el("td", "", t.rule.id + " · " + t.rule.name), el("td", "", t.rule.ifText), el("td", "", state), el("td", "", pts));
        if (!t.applicable) row.title = "You chose “Any”, so this rule is skipped and does not count against the " + cfg.noun + ".";
        table.appendChild(row);
      });
      const wrap = el("div", "rc-table-wrap");
      wrap.appendChild(table);
      details.appendChild(wrap);

      if (entry.facts.genreStrength > 0 && entry.facts.genreStrength < 1)
        details.appendChild(el("p", "rc-fine", "Genre rules gave 60% credit because this " + cfg.noun + " matches only one of the genres you chose."));
      return details;
    }

    function buildCard(entry, rank, prefs) {
      const info = cfg.describe(entry.item);
      const why = cfg.engine.explain(entry, prefs);
      const card = el("article", "rc rc-" + entry.category.key);

      const poster = el("div", "rc-poster");
      poster.appendChild(CineBook.posterFrame({ id: info.id, title: info.title, image: info.image, icon: cfg.icon, alt: "Cover of " + info.title }));
      poster.appendChild(el("span", "rc-rank", "#" + rank));
      poster.appendChild(CineBook.favourites.button(cfg.type, entry.item));

      const body = el("div", "rc-body");

      const head = el("header", "rc-head");
      const titles = el("div", "rc-titles");
      titles.append(el("h4", "", info.title), el("p", "rc-byline", info.sub));
      const ring = el("div", "rc-ring");
      ring.style.setProperty("--p", entry.percent);
      ring.setAttribute("role", "img");
      ring.setAttribute("aria-label", entry.percent + " percent match");
      ring.appendChild(el("span", "", entry.percent + "%"));
      head.append(titles, ring);

      const badge = el("span", "rc-badge", entry.category.label);
      const tags = el("div", "rc-tags");
      info.genres.forEach((g) => tags.appendChild(el("span", "tag" + (entry.facts.matchedGenres.includes(g) ? " hit" : ""), g)));

      const box = el("div", "rc-why");
      box.appendChild(el("strong", "", "Why was this recommended?"));
      const ul = el("ul");
      why.reasons.forEach((r) => {
        const li = el("li");
        li.append(el("span", "rc-rule", r.ruleId), document.createTextNode(" " + r.text));
        ul.appendChild(li);
      });
      if (why.combos.length) {
        const li = el("li", "rc-combo");
        li.append(el("span", "rc-rule", why.combos.map((c) => c.id).join(" + ")), document.createTextNode(" Bonus points: " + why.combos.map((c) => c.name.toLowerCase()).join(" and ") + " both match."));
        ul.appendChild(li);
      }
      box.appendChild(ul);

      if (why.mismatches.length) {
        const miss = el("div", "rc-miss");
        miss.appendChild(el("strong", "", entry.category.key === "partial" ? "Partial match — what did not match:" : "What did not match:"));
        const mu = el("ul");
        why.mismatches.forEach((m) => mu.appendChild(el("li", "", m)));
        miss.appendChild(mu);
        box.appendChild(miss);
      }

      body.append(head, badge, tags, el("p", "rc-desc", info.description), box, buildTrace(entry));
      card.append(poster, body);
      return card;
    }

    // ---------- explanation of the whole run ----------
    function buildNotice(result, count) {
      const { rejected, totalItems, minPercent } = result;
      const n = cfg.nouns;
      if (count === 0) {
        const box = el("div", "rc-notice empty");
        box.append(
          el("strong", "", "No suitable " + n + " found"),
          el("p", "", "None of the " + totalItems + " " + n + " in the knowledge base matches at least one of your chosen genres with a score of " + minPercent + "% or more. " +
            rejected.noGenreMatch + " had none of your genres, and " + rejected.belowMinimum + " matched a genre but scored too low. " +
            "CineBook does not show unrelated " + n + " just to fill the list."),
          el("p", "", "Try adding more genres, or choose a different mood or " + cfg.relaxHint + ".")
        );
        return box;
      }
      const notes = [];
      if (count < TOP_COUNT)
        notes.push("Only " + count + " " + (count === 1 ? cfg.noun : n) + " met the minimum requirements (a chosen genre plus a score of at least " + minPercent + "%). " +
          "Showing fewer than " + TOP_COUNT + " instead of adding unrelated " + n + ".");
      if (result.ranked[0].percent < 80)
        notes.push("No " + cfg.noun + " matches everything you asked for, so these are partial matches. Your genre is always kept; the less important preferences were relaxed.");
      if (!notes.length) return null;
      const box = el("div", "rc-notice");
      notes.forEach((t) => box.appendChild(el("p", "", t)));
      return box;
    }

    function buildRuleBase() {
      const details = el("details", "rc-method");
      details.appendChild(el("summary", "", "View the " + cfg.noun + " rule base (" + cfg.engine.rules.length + " IF–THEN rules)"));
      const table = el("table", "rc-table");
      const head = el("tr");
      ["Rule", "IF … THEN add points", "Priority", "Weight"].forEach((h) => head.appendChild(el("th", "", h)));
      table.appendChild(head);
      cfg.engine.rules.forEach((r) => {
        const row = el("tr");
        row.append(el("td", "", r.id + " · " + r.name), el("td", "", r.ifText + " THEN add points."), el("td", "", r.priority), el("td", "", String(r.weight)));
        table.appendChild(row);
      });
      const wrap = el("div", "rc-table-wrap");
      wrap.appendChild(table);
      details.append(wrap, el("p", "rc-fine", "Weights add up to 100. Match % = points earned ÷ the maximum possible for your answers. Rules for “Any” answers are skipped, so nothing is penalised."));
      return details;
    }

    // ---------- the whole page ----------
    return function build(data, hooks) {
      const page = el("div", "rc-page");

      const items = cfg.dataset.list;
      if (!cfg.dataset.ready) {
        const box = el("div", "rc-notice empty");
        box.append(
          el("strong", "", "The " + cfg.noun + " data could not be loaded"),
          el("p", "", "Open the site with VS Code's Live Server (not by double-clicking the file) so the browser may read the JSON data, then try again.")
        );
        page.append(box, buildActions(hooks));
        return page;
      }

      const result = cfg.engine.rank(items, data); // <- the inference engine does the work here
      const top = result.ranked.slice(0, TOP_COUNT);
      const rest = result.ranked.slice(TOP_COUNT);

      const header = el("div", "rc-top");
      header.append(
        el("h3", "", cfg.icon + " " + (top.length === 0 ? "Recommendations" : top.length === 1 ? "Your top " + cfg.noun + " pick" : "Your top " + top.length + " " + cfg.noun + " picks")),
        el("p", "rc-sub", "Found by applying " + result.rulesInBase + " IF–THEN rules to " + result.totalItems + " " + cfg.nouns + " in the knowledge base. " + result.ranked.length + " valid match" + (result.ranked.length === 1 ? "" : "es") + ".")
      );
      const chips = el("div", "rc-chips");
      hooks.summaryRows.forEach(([k, v]) => chips.appendChild(el("span", "tag alt", k + ": " + v)));
      header.appendChild(chips);
      page.appendChild(header);

      const notice = buildNotice(result, result.ranked.length);
      if (notice) page.appendChild(notice);

      const listEl = el("div", "rc-list");
      top.forEach((entry, i) => listEl.appendChild(buildCard(entry, i + 1, data)));
      page.appendChild(listEl);

      if (rest.length) {
        const more = el("div", "rc-extra");
        more.hidden = true;
        rest.forEach((entry, i) => more.appendChild(buildCard(entry, TOP_COUNT + i + 1, data)));
        const moreBtn = el("button", "btn btn-ghost rc-more-btn", "View " + rest.length + " more matching " + (rest.length === 1 ? cfg.noun : cfg.nouns));
        moreBtn.type = "button";
        moreBtn.setAttribute("aria-expanded", "false");
        moreBtn.addEventListener("click", () => {
          more.hidden = !more.hidden;
          moreBtn.setAttribute("aria-expanded", String(!more.hidden));
          moreBtn.textContent = more.hidden
            ? "View " + rest.length + " more matching " + (rest.length === 1 ? cfg.noun : cfg.nouns)
            : "Show fewer results";
        });
        const moreWrap = el("div", "rc-more");
        moreWrap.appendChild(moreBtn);
        page.append(moreWrap, more); // button sits right under the first five cards
      }

      page.append(buildRuleBase(), buildActions(hooks));
      return page;
    };

    function buildActions(hooks) {
      const actions = el("div", "mq-nav rc-actions");
      const back = el("button", "btn btn-ghost", "← Back to preferences");
      const change = el("button", "btn btn-ghost", "✎ Change preferences");
      const again = el("button", "btn " + cfg.buttonClass, "↺ Start over");
      [back, change, again].forEach((b) => (b.type = "button"));
      back.addEventListener("click", hooks.backToPreferences);
      change.addEventListener("click", hooks.changePreferences);
      again.addEventListener("click", hooks.startOver);
      actions.append(back, change, again);
      return actions;
    }
  };
})();
