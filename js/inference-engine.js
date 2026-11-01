// CineBook – Inference Engine (Stage 4).
//
// This file is the "brain" that is shared by the movie and the book recommenders.
// It knows nothing about movies or books. It only knows how to:
//   1. build FACTS about an item and the user's answers          (deriveFacts)
//   2. test every IF–THEN RULE against those facts               (evaluateItem)
//   3. add up the weights of the rules that fired                (calculateScore)
//   4. turn the score into a 0–100 match percentage             (percent)
//   5. throw away items that are not valid matches, then rank    (rankItems)
//
// The rules themselves live in movie-rules.js and book-rules.js (the "rule base"),
// and the movies / books live in data/*.json (the "knowledge base").
//
// There is NO randomness and NO learning here: the same answers always give the same ranking.
//
// A "domain" object (supplied by movie-rules.js / book-rules.js) looks like this:
//   {
//     rules:       [ { id, name, priority, kind, weight, usesGenre, ifText, appliesTo(prefs), test(facts), because(item, prefs, facts) } ],
//     deriveFacts: (item, prefs) => facts,   // must include facts.matchedGenres, facts.genreMatch, facts.genreStrength
//     mismatches:  (item, prefs, facts) => [ "text about each preference that did NOT match" ],
//     minPercent:  35,                       // items scoring below this are not valid recommendations
//   }

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});

  // ---------- Match categories (checked from the top down) ----------
  const CATEGORIES = [
    { key: "excellent", label: "Excellent Match", min: 80 },
    { key: "good", label: "Good Match", min: 60 },
    { key: "partial", label: "Partial Match", min: 0 },
  ];
  function categorize(percent) {
    return CATEGORIES.find((c) => percent >= c.min);
  }

  const round2 = (n) => Math.round(n * 100) / 100;

  // How strongly does an item's genre match count?
  // Full credit (1) when it matches as many of the user's genres as possible, up to two;
  // otherwise 60% credit. This rewards items that fit several chosen genres,
  // without letting one preference be counted again and again.
  function genreStrengthFor(matchedCount, selectedCount) {
    if (matchedCount === 0) return 0;
    return matchedCount >= Math.min(2, selectedCount) ? 1 : 0.6;
  }

  // ---------- Step 3 & 4: score and percentage ----------
  // A rule only counts towards the MAXIMUM when it applies to the user's answers.
  // Example: if the user chose "Any Duration", the duration rule does not apply,
  // so it is removed from the maximum and nobody is penalised for it.
  function calculateScore(trace) {
    let score = 0;
    let maxScore = 0;
    trace.forEach((t) => {
      if (t.applicable) maxScore += t.rule.weight;
      score += t.points;
    });
    score = round2(score);
    const percent = maxScore ? Math.round((score / maxScore) * 100) : 0;
    return { score, maxScore, percent };
  }

  // ---------- Step 1 & 2: evaluate ONE item against ALL rules ----------
  function evaluateItem(domain, item, prefs) {
    const facts = domain.deriveFacts(item, prefs);

    const trace = domain.rules.map((rule) => {
      const applicable = rule.appliesTo(prefs); // does this rule matter for these answers?
      const fired = applicable && rule.test(facts); // is the IF part true?
      const points = fired ? round2(rule.weight * (rule.usesGenre ? facts.genreStrength : 1)) : 0; // THEN add points
      return { rule, applicable, fired, points };
    });

    const totals = calculateScore(trace);
    return {
      item,
      facts,
      trace,
      score: totals.score,
      maxScore: totals.maxScore,
      percent: totals.percent,
      category: categorize(totals.percent),
      rulesEvaluated: trace.filter((t) => t.applicable).length,
      rulesFired: trace.filter((t) => t.fired).length,
      mismatches: domain.mismatches(item, prefs, facts),
    };
  }

  // ---------- Step 5: filter and rank ----------
  // A recommendation is VALID only if:
  //   (a) the item matches at least one genre the user chose  (genre is the most important preference), and
  //   (b) its match percentage is at least domain.minPercent.
  // Everything else is rejected, so unrelated items are never used to "fill up" the list.
  // Less important preferences (language, duration, period, level, type) are never required:
  // when they do not match the item simply scores lower and is shown as a partial match.
  function rankItems(domain, items, prefs) {
    const evaluated = items.map((item) => evaluateItem(domain, item, prefs));

    const rejected = { noGenreMatch: 0, belowMinimum: 0 };
    const valid = [];
    evaluated.forEach((e) => {
      if (!e.facts.genreMatch) rejected.noGenreMatch++;
      else if (e.percent < domain.minPercent) rejected.belowMinimum++;
      else valid.push(e);
    });

    // Highest score first. Ties are broken the same way every time:
    // more matched genres first, then alphabetical by title.
    valid.sort(
      (a, b) =>
        b.score - a.score ||
        b.facts.matchedGenres.length - a.facts.matchedGenres.length ||
        a.item.title.localeCompare(b.item.title)
    );

    return {
      ranked: valid,
      rejected,
      totalItems: items.length,
      rulesInBase: domain.rules.length,
      minPercent: domain.minPercent,
    };
  }

  // ---------- Explanation Facility ----------
  // Builds the "Why was this recommended?" content from the rules that REALLY fired.
  // Each "base" rule that fired contributes one sentence written by the rule itself.
  // "combo" rules (genre + mood, genre + language, ...) are reported as a bonus line.
  function explain(entry, prefs) {
    const reasons = entry.trace
      .filter((t) => t.fired && t.rule.kind === "base")
      .map((t) => ({ ruleId: t.rule.id, text: t.rule.because(entry.item, prefs, entry.facts) }));

    const combos = entry.trace.filter((t) => t.fired && t.rule.kind === "combo").map((t) => t.rule);

    return {
      reasons,
      combos, // rules that gave a combination bonus
      mismatches: entry.mismatches, // what did NOT match (empty for a perfect match)
      isPartial: entry.category.key === "partial" || entry.mismatches.length > 0,
    };
  }

  CineBook.inference = { CATEGORIES, categorize, genreStrengthFor, calculateScore, evaluateItem, rankItems, explain };
})();
