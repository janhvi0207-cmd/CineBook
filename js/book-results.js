// CineBook – book results page: connects the book rule engine to the shared results view.

(function () {
  "use strict";

  const CineBook = window.CineBook;
  const engine = CineBook.bookEngine;

  CineBook.bookResults = CineBook.createResultsView({
    type: "book",
    noun: "book",
    nouns: "books",
    icon: "📚",
    buttonClass: "btn-book",
    relaxHint: "reading level",
    dataset: CineBook.books,
    engine: { rules: engine.rules, rank: engine.rankBooks, explain: engine.explainBookRecommendation },
    describe: (b) => ({
      id: b.id,
      image: b.cover,
      title: b.title,
      sub: "by " + b.author + " · " + b.year,
      genres: b.genres,
      description: b.description,
    }),
  });
})();
