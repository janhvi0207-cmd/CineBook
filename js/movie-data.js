// CineBook – Movie knowledge base loader.
// Loads data/movies.json, checks every record, and adds the "derived" fields
// (duration band, release period, language group) that the Stage 4 rule engine will match on.

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});

  const NAMED_LANGUAGES = ["English", "Hindi", "Marathi", "Korean", "Japanese"];

  // Same bands the questionnaire uses (Step 4 and Step 3).
  function durationBand(minutes) {
    if (minutes < 90) return "short";
    if (minutes <= 120) return "medium";
    return "long";
  }
  function releasePeriod(year) {
    if (year < 2000) return "classic";
    if (year <= 2010) return "2000-2010";
    if (year <= 2020) return "2011-2020";
    return "recent";
  }
  function languageGroup(language) {
    return NAMED_LANGUAGES.includes(language) ? language : "Other";
  }

  function check(movie) {
    const problems = [];
    if (!movie.title) problems.push("missing title");
    if (!Array.isArray(movie.genres) || !movie.genres.length) problems.push("missing genres");
    if (!movie.language) problems.push("missing language");
    if (!Number.isInteger(movie.year)) problems.push("invalid year");
    if (!Number.isFinite(movie.duration) || movie.duration <= 0) problems.push("invalid duration");
    if (!movie.description) problems.push("missing description");
    return problems;
  }

  const movies = CineBook.createDataset({
    url: "data/movies.json",
    key: "movies",
    prepare: (raw) =>
      CineBook.prepareRecords(raw, check, (m) => ({
        durationBand: durationBand(m.duration),
        period: releasePeriod(m.year),
        languageGroup: languageGroup(m.language),
      })),
  });

  movies.durationBand = durationBand;
  movies.releasePeriod = releasePeriod;
  movies.languageGroup = languageGroup;

  CineBook.movies = movies;
  CineBook.movieDataPromise = movies.load().catch(() => null); // other scripts wait on this
})();
