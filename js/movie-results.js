// CineBook – movie results page: connects the movie rule engine to the shared results view.

(function () {
  "use strict";

  const CineBook = window.CineBook;
  const engine = CineBook.movieEngine;

  CineBook.movieResults = CineBook.createResultsView({
    type: "movie",
    noun: "movie",
    nouns: "movies",
    icon: "🎬",
    buttonClass: "btn-movie",
    relaxHint: "language",
    dataset: CineBook.movies,
    engine: { rules: engine.rules, rank: engine.rankMovies, explain: engine.explainMovieRecommendation },
    describe: (m) => ({
      id: m.id,
      image: m.poster,
      title: m.title,
      sub: m.year + " · " + m.duration + " min · " + m.language,
      genres: m.genres,
      description: m.description,
    }),
  });
})();
