// CineBook – Book knowledge base loader.
// Loads data/books.json and checks every record, ready for the Stage 4 rule engine.

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});

  const LEVELS = ["beginner", "intermediate", "advanced"];
  const TYPES = ["Fiction", "Non-fiction"];

  function check(book) {
    const problems = [];
    if (!book.title) problems.push("missing title");
    if (!book.author) problems.push("missing author");
    if (!Array.isArray(book.genres) || !book.genres.length) problems.push("missing genres");
    if (!Array.isArray(book.moods) || !book.moods.length) problems.push("missing moods");
    if (!Number.isInteger(book.year)) problems.push("invalid year");
    if (!LEVELS.includes(book.level)) problems.push("invalid reading level");
    if (!TYPES.includes(book.type)) problems.push("invalid book type");
    if (!book.description) problems.push("missing description");
    return problems;
  }

  const books = CineBook.createDataset({
    url: "data/books.json",
    key: "books",
    prepare: (raw) => CineBook.prepareRecords(raw, check, () => ({})),
  });

  CineBook.books = books;
  CineBook.bookDataPromise = books.load().catch(() => null);
})();
