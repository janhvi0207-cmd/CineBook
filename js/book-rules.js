// CineBook – Book RULE BASE (Stage 4).
//
// Every rule below is a real JavaScript object with an IF part (test) and a THEN part (weight = points to add).
// The inference engine (inference-engine.js) tests each rule against each book and adds up the points.
//
// SCORING METHOD
//   • "base" rules   – each checks ONE user preference (genre, reading mood, reading level, book type).
//   • "combo" rules  – check TWO preferences together. They add a bonus for important combinations.
//     So genre can earn points from B3 plus the two combination bonuses (B1, B2); every other preference
//     earns points from exactly one rule. The weights add up to exactly 100:
//         B3 30 + B1 20 + B2 15 + B4 15 + B5 10 + B6 10 = 100
//   • Rules about genre are scaled by "genre strength": full points if the book matches as many of the
//     user's genres as possible (up to two), otherwise 60% of the points.
//   • If the user chose "Any Type", rule B6 does not apply and its weight is removed from the maximum,
//     so no book is penalised.
//   • match % = points earned ÷ maximum possible points for THIS user's answers × 100.
//   • A book is only recommended if it matches at least one chosen genre AND scores at least 35%.

(function () {
  "use strict";

  const CineBook = window.CineBook;

  // Words used in explanations (the same vocabulary as data/books.json and the questionnaire).
  const MOOD_NAMES = {
    relaxing: "Relaxing and Peaceful", motivational: "Motivational and Inspirational", emotional: "Emotional and Heartwarming",
    adventurous: "Adventurous and Exciting", suspenseful: "Mysterious and Suspenseful", thoughtful: "Thought-provoking", romantic: "Romantic",
  };
  const LEVEL_NAMES = { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };
  const list = (arr) => arr.join(", ").replace(/, ([^,]*)$/, " and $1");

  // ---------- FACTS: what we know about one book + the user's answers ----------
  function deriveBookFacts(book, prefs) {
    const matchedGenres = book.genres.filter((g) => prefs.genres.includes(g));
    return {
      matchedGenres,
      genreMatch: matchedGenres.length > 0,
      genreStrength: CineBook.inference.genreStrengthFor(matchedGenres.length, prefs.genres.length),
      moodMatch: book.moods.includes(prefs.mood),
      levelMatch: book.level === prefs.level,
      typeMatch: prefs.type !== "any" && book.type === prefs.type,
    };
  }

  // ---------- RULES ----------
  const always = () => true;

  const BOOK_RULES = [
    {
      id: "B1", name: "Genre + reading mood", kind: "combo", priority: "High", weight: 20, usesGenre: true,
      ifText: "IF the book's genre matches a selected genre AND its mood matches the selected reading mood",
      appliesTo: always,
      test: (f) => f.genreMatch && f.moodMatch,
      because: () => "Combination bonus: it matches both your genre and your reading mood.",
    },
    {
      id: "B2", name: "Genre + reading level", kind: "combo", priority: "Medium-high", weight: 15, usesGenre: true,
      ifText: "IF the book's genre matches a selected genre AND its reading level matches the selected level",
      appliesTo: always,
      test: (f) => f.genreMatch && f.levelMatch,
      because: () => "Combination bonus: it matches both your genre and your reading level.",
    },
    {
      id: "B3", name: "Genre", kind: "base", priority: "Medium", weight: 30, usesGenre: true,
      ifText: "IF the book's genre matches a selected genre",
      appliesTo: always,
      test: (f) => f.genreMatch,
      because: (b, p, f) => "Your selected genre matches: " + list(f.matchedGenres) + ".",
    },
    {
      id: "B4", name: "Reading mood", kind: "base", priority: "Additional", weight: 15, usesGenre: false,
      ifText: "IF the book's mood matches the selected reading mood",
      appliesTo: always,
      test: (f) => f.moodMatch,
      because: (b, p) => "Its mood matches what you want to read (" + MOOD_NAMES[p.mood] + ").",
    },
    {
      id: "B5", name: "Reading level", kind: "base", priority: "Additional", weight: 10, usesGenre: false,
      ifText: "IF the book's reading level matches the selected reading level",
      appliesTo: always,
      test: (f) => f.levelMatch,
      because: (b, p) => "Its reading level matches your experience (" + LEVEL_NAMES[p.level] + ").",
    },
    {
      id: "B6", name: "Book type", kind: "base", priority: "Additional", weight: 10, usesGenre: false,
      ifText: "IF the book's type matches the selected type (skipped for “Any Type”)",
      appliesTo: (p) => p.type !== "any",
      test: (f) => f.typeMatch,
      because: (b) => "It is a " + b.type.toLowerCase() + " book, the type you asked for.",
    },
  ];

  // What did NOT match? Used to explain partial matches honestly.
  function bookMismatches(book, prefs, f) {
    const notes = [];
    if (!f.moodMatch)
      notes.push("Reading mood: you chose “" + MOOD_NAMES[prefs.mood] + "”; this book is tagged " + list(book.moods.map((m) => MOOD_NAMES[m])) + ".");
    if (!f.levelMatch) notes.push("Reading level: you chose " + LEVEL_NAMES[prefs.level] + "; this book is " + LEVEL_NAMES[book.level] + ".");
    if (prefs.type !== "any" && !f.typeMatch) notes.push("Book type: you chose " + prefs.type + "; this book is " + book.type + ".");
    return notes;
  }

  const BOOK_DOMAIN = { name: "book", rules: BOOK_RULES, deriveFacts: deriveBookFacts, mismatches: bookMismatches, minPercent: 35 };

  // ---------- Public functions (book inference) ----------
  // Test one book against every rule. Returns the facts, the rule-by-rule trace, score and percentage.
  const evaluateBookRules = (book, prefs) => CineBook.inference.evaluateItem(BOOK_DOMAIN, book, prefs);
  // Add up the points of the rules that fired.
  const calculateBookScore = (evaluation) => CineBook.inference.calculateScore(evaluation.trace);
  // Evaluate all books, drop invalid ones, and sort from best to worst.
  const rankBooks = (books, prefs) => CineBook.inference.rankItems(BOOK_DOMAIN, books, prefs);
  // Build the "Why was this recommended?" content from the rules that fired.
  const explainBookRecommendation = (entry, prefs) => CineBook.inference.explain(entry, prefs);

  CineBook.bookEngine = {
    domain: BOOK_DOMAIN,
    rules: BOOK_RULES,
    evaluateBookRules,
    calculateBookScore,
    rankBooks,
    explainBookRecommendation,
  };
})();
