// CineBook – movie knowledge base preview (poster shelf).

(function () {
  "use strict";

  const CineBook = window.CineBook;

  CineBook.createShelf({
    shelf: document.getElementById("movieShelf"),
    track: document.getElementById("shelfTrack"),
    sub: document.getElementById("shelfSub"),
    promise: CineBook.movieDataPromise,
    type: "movie",
    icon: "🎬",
    subText: (n) => n + " real films loaded from data/movies.json — ready for the rule engine.",
    describe: (m) => ({
      id: m.id,
      image: m.poster,
      title: m.title,
      meta: m.year + " · " + m.duration + " min · " + m.language,
      tooltip: m.genres.join(", ") + " — " + m.description,
    }),
  });
})();
