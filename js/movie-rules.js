// CineBook – Movie RULE BASE (Stage 4).
//
// Every rule below is a real JavaScript object with an IF part (test) and a THEN part (weight = points to add).
// The inference engine (inference-engine.js) tests each rule against each movie and adds up the points.
//
// SCORING METHOD
//   • "base" rules   – each checks ONE user preference (genre, mood, language, duration, period).
//   • "combo" rules  – check TWO preferences together. They add a bonus for important combinations.
//     So genre can earn points from M3 plus the two combination bonuses (M1, M2); every other preference
//     earns points from exactly one rule. The weights add up to exactly 100:
//         M3 25 + M1 20 + M2 15 + M4 15 + M5 10 + M6 8 + M7 7 = 100
//   • Rules about genre are scaled by "genre strength": full points if the movie matches as many of the
//     user's genres as possible (up to two), otherwise 60% of the points.
//   • If the user chose "Any Duration" / "Any Period", that rule does not apply and its weight is removed
//     from the maximum, so the movie is not penalised.
//   • match % = points earned ÷ maximum possible points for THIS user's answers × 100.
//   • A movie is only recommended if it matches at least one chosen genre AND scores at least 35%.

(function () {
  "use strict";

  const CineBook = window.CineBook;

  // Words used in explanations (the same vocabulary as data/movies.json and the questionnaire).
  const MOOD_NAMES = {
    happy: "Happy", exciting: "Exciting", suspenseful: "Suspenseful", emotional: "Emotional",
    romantic: "Romantic", thoughtful: "Thought-provoking", scary: "Scary",
  };
  const DURATION_TEXT = { short: "short (under 90 minutes)", medium: "medium (90–120 minutes)", long: "long (above 120 minutes)" };
  const PERIOD_TEXT = { classic: "classic (before 2000)", "2000-2010": "2000–2010", "2011-2020": "2011–2020", recent: "recent (2021 onwards)" };
  const list = (arr) => arr.join(", ").replace(/, ([^,]*)$/, " and $1");

  // ---------- FACTS: what we know about one movie + the user's answers ----------
  function deriveMovieFacts(movie, prefs) {
    const matchedGenres = movie.genres.filter((g) => prefs.genres.includes(g));
    return {
      matchedGenres,
      genreMatch: matchedGenres.length > 0,
      genreStrength: CineBook.inference.genreStrengthFor(matchedGenres.length, prefs.genres.length),
      moodMatch: movie.moods.includes(prefs.mood),
      languageMatch: movie.languageGroup === prefs.language,
      durationMatch: prefs.duration !== "any" && movie.durationBand === prefs.duration,
      periodMatch: prefs.period !== "any" && movie.period === prefs.period,
    };
  }

  // ---------- RULES ----------
  const always = () => true;

  const MOVIE_RULES = [
    {
      id: "M1", name: "Genre + mood", kind: "combo", priority: "High", weight: 20, usesGenre: true,
      ifText: "IF the movie's genre matches a selected genre AND its mood matches the selected mood",
      appliesTo: always,
      test: (f) => f.genreMatch && f.moodMatch,
      because: () => "Combination bonus: it matches both your genre and your mood.",
    },
    {
      id: "M2", name: "Genre + language", kind: "combo", priority: "Medium-high", weight: 15, usesGenre: true,
      ifText: "IF the movie's genre matches a selected genre AND its language matches the selected language",
      appliesTo: always,
      test: (f) => f.genreMatch && f.languageMatch,
      because: () => "Combination bonus: it matches both your genre and your language.",
    },
    {
      id: "M3", name: "Genre", kind: "base", priority: "Medium", weight: 25, usesGenre: true,
      ifText: "IF the movie's genre matches a selected genre",
      appliesTo: always,
      test: (f) => f.genreMatch,
      because: (m, p, f) => "Your selected genre matches: " + list(f.matchedGenres) + ".",
    },
    {
      id: "M4", name: "Mood", kind: "base", priority: "Additional", weight: 15, usesGenre: false,
      ifText: "IF the movie's mood matches the selected mood",
      appliesTo: always,
      test: (f) => f.moodMatch,
      because: (m, p) => "Its mood matches your preference (" + MOOD_NAMES[p.mood] + ").",
    },
    {
      id: "M5", name: "Language", kind: "base", priority: "Additional", weight: 10, usesGenre: false,
      ifText: "IF the movie's language matches the selected language",
      appliesTo: always,
      test: (f) => f.languageMatch,
      because: (m, p) =>
        p.language === "Other"
          ? "Its language (" + m.language + ") falls under the “Other” languages you selected."
          : "Its language matches your selection (" + m.language + ").",
    },
    {
      id: "M6", name: "Duration", kind: "base", priority: "Additional", weight: 8, usesGenre: false,
      ifText: "IF the movie's duration band matches the selected duration (skipped for “Any Duration”)",
      appliesTo: (p) => p.duration !== "any",
      test: (f) => f.durationMatch,
      because: (m, p) => "Its running time (" + m.duration + " min) is " + DURATION_TEXT[p.duration] + ", as you wanted.",
    },
    {
      id: "M7", name: "Release period", kind: "base", priority: "Additional", weight: 7, usesGenre: false,
      ifText: "IF the movie's release period matches the selected period (skipped for “Any Period”)",
      appliesTo: (p) => p.period !== "any",
      test: (f) => f.periodMatch,
      because: (m, p) => "It was released in " + m.year + ", within your preferred period (" + PERIOD_TEXT[p.period] + ").",
    },
  ];

  // What did NOT match? Used to explain partial matches honestly.
  function movieMismatches(movie, prefs, f) {
    const notes = [];
    if (!f.moodMatch)
      notes.push("Mood: you chose “" + MOOD_NAMES[prefs.mood] + "”; this movie is tagged " + list(movie.moods.map((m) => MOOD_NAMES[m])) + ".");
    if (!f.languageMatch) notes.push("Language: you chose " + prefs.language + "; this movie is in " + movie.language + ".");
    if (prefs.duration !== "any" && !f.durationMatch)
      notes.push("Duration: you chose " + DURATION_TEXT[prefs.duration] + "; this movie runs " + movie.duration + " minutes.");
    if (prefs.period !== "any" && !f.periodMatch)
      notes.push("Release period: you chose " + PERIOD_TEXT[prefs.period] + "; this movie was released in " + movie.year + ".");
    return notes;
  }

  const MOVIE_DOMAIN = { name: "movie", rules: MOVIE_RULES, deriveFacts: deriveMovieFacts, mismatches: movieMismatches, minPercent: 35 };

  // ---------- Public functions (movie inference) ----------
  // Test one movie against every rule. Returns the facts, the rule-by-rule trace, score and percentage.
  const evaluateMovieRules = (movie, prefs) => CineBook.inference.evaluateItem(MOVIE_DOMAIN, movie, prefs);
  // Add up the points of the rules that fired.
  const calculateMovieScore = (evaluation) => CineBook.inference.calculateScore(evaluation.trace);
  // Evaluate all movies, drop invalid ones, and sort from best to worst.
  const rankMovies = (movies, prefs) => CineBook.inference.rankItems(MOVIE_DOMAIN, movies, prefs);
  // Build the "Why was this recommended?" content from the rules that fired.
  const explainMovieRecommendation = (entry, prefs) => CineBook.inference.explain(entry, prefs);

  CineBook.movieEngine = {
    domain: MOVIE_DOMAIN,
    rules: MOVIE_RULES,
    evaluateMovieRules,
    calculateMovieScore,
    rankMovies,
    explainMovieRecommendation,
  };
})();
