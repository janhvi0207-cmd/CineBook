// CineBook – book knowledge base preview (cover shelf).

(function () {
  "use strict";

  const CineBook = window.CineBook;

  CineBook.createShelf({
    shelf: document.getElementById("bookShelf"),
    track: document.getElementById("bookShelfTrack"),
    sub: document.getElementById("bookShelfSub"),
    promise: CineBook.bookDataPromise,
    type: "book",
    icon: "📖",
    subText: (n) => n + " real books loaded from data/books.json — ready for the rule engine.",
    describe: (b) => ({
      id: b.id,
      image: b.cover,
      title: b.title,
      meta: b.author + " · " + b.year,
      tooltip: b.genres.join(", ") + " — " + b.description,
    }),
  });
})();
