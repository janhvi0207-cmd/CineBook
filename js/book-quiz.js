// CineBook – Stage 3: book preference questionnaire (4 steps + review).
// It only COLLECTS preferences. Recommendations are produced by the rule engine in Stage 4.
// The step logic lives in quiz-engine.js; this file describes the book questions.

(function () {
  "use strict";

  const CineBook = window.CineBook;
  const { el, option } = CineBook.quizKit;

  // ---------- Question data ----------
  // Genre keys match the "genres" values in data/books.json.
  const GENRES = [
    { key: "Fiction", icon: "📖" }, { key: "Mystery", icon: "🔍" },
    { key: "Thriller", icon: "🗡️" }, { key: "Romance", icon: "💌" },
    { key: "Fantasy", icon: "🧙" }, { key: "Science Fiction", icon: "🛸" },
    { key: "Horror", icon: "🕯️" }, { key: "Adventure", icon: "🗺️" },
    { key: "Historical Fiction", icon: "🏰" }, { key: "Biography", icon: "🖋️" },
    { key: "Self-help", icon: "🌱" }, { key: "Philosophy", icon: "🦉" },
  ];
  // Mood keys match the "moods" values in data/books.json.
  const MOODS = [
    { key: "relaxing", icon: "☕", label: "Relaxing and Peaceful", desc: "Gentle, cosy reading" },
    { key: "motivational", icon: "💪", label: "Motivational and Inspirational", desc: "Ideas that push you forward" },
    { key: "emotional", icon: "🥹", label: "Emotional and Heartwarming", desc: "Stories that touch the heart" },
    { key: "adventurous", icon: "🧗", label: "Adventurous and Exciting", desc: "Journeys and big escapes" },
    { key: "suspenseful", icon: "🕵️", label: "Mysterious and Suspenseful", desc: "Secrets and page-turning tension" },
    { key: "thoughtful", icon: "🧠", label: "Thought-provoking", desc: "Books that make you think" },
    { key: "romantic", icon: "💞", label: "Romantic", desc: "Love stories and longing" },
  ];
  // Keys match the "level" values in data/books.json.
  const LEVELS = [
    { key: "beginner", icon: "🌱", label: "Beginner", desc: "Simple language and easy reading." },
    { key: "intermediate", icon: "🌿", label: "Intermediate", desc: "Moderate vocabulary and storytelling." },
    { key: "advanced", icon: "🌳", label: "Advanced", desc: "Complex themes and detailed writing." },
  ];
  // Keys match the "type" values in data/books.json ("any" means no preference).
  const TYPES = [
    { key: "Fiction", icon: "🪄", label: "Fiction", desc: "Novels and made-up stories." },
    { key: "Non-fiction", icon: "🧭", label: "Non-fiction", desc: "Real people, facts and ideas." },
    { key: "any", icon: "📚", label: "Any Type", desc: "Surprise me with either." },
  ];

  const labelOf = (list, key) => (list.find((o) => o.key === key) || {}).label || key;
  const levelText = (key) => {
    const o = LEVELS.find((x) => x.key === key);
    return o ? o.label + " – " + o.desc.replace(/\.$/, "") : key;
  };

  // ---------- Step builders ----------
  function genreStep() {
    const grid = el("div", "opt-grid genre-grid");
    GENRES.forEach((g, i) => {
      const b = option("genres", g.key, "genre-opt");
      b.style.setProperty("--hue", (i * 17) % 40); // warm hues only
      b.append(el("span", "opt-icon", g.icon), el("span", "opt-label", g.key), el("span", "opt-check", "✓"));
      grid.appendChild(b);
    });
    return grid;
  }
  function moodStep() {
    const grid = el("div", "opt-grid mood-grid");
    MOODS.forEach((m) => {
      const b = option("mood", m.key, "mood-opt");
      const text = el("span", "opt-text");
      text.append(el("span", "opt-label", m.label), el("span", "opt-desc", m.desc));
      b.append(el("span", "opt-icon", m.icon), text, el("span", "opt-check", "✓"));
      grid.appendChild(b);
    });
    return grid;
  }
  // Used for both the reading-level and book-type steps: three tall cards.
  function pickStep(group, list) {
    return () => {
      const grid = el("div", "opt-grid pick-grid");
      list.forEach((o) => {
        const b = option(group, o.key, "pick-opt");
        b.append(el("span", "opt-icon", o.icon), el("span", "opt-label", o.label), el("span", "opt-desc", o.desc), el("span", "opt-check", "✓"));
        grid.appendChild(b);
      });
      return grid;
    };
  }

  // ---------- Quiz definition ----------
  CineBook.createQuiz({
    root: document.getElementById("bookQuiz"),
    startBtn: document.getElementById("startBookQuiz"),
    title: "📚 Book Preference Quiz",
    buttonClass: "btn-book",
    prefsKey: "bookPreferences",
    eventName: "cinebook:book-preferences",
    freshPrefs: () => ({ genres: [], mood: null, level: null, type: null }),
    multi: ["genres"],
    steps: [
      { name: "Genres", title: "What kind of books do you enjoy reading?", hint: "Pick one or more.", build: genreStep,
        validate: (p) => (p.genres.length ? "" : "Please choose at least one genre to continue.") },
      { name: "Mood", title: "What are you in the mood to read?", hint: "Pick one.", build: moodStep,
        validate: (p) => (p.mood ? "" : "Please choose a reading mood to continue.") },
      { name: "Level", title: "What is your reading experience?", hint: "Pick one.", build: pickStep("level", LEVELS),
        validate: (p) => (p.level ? "" : "Please choose your reading level to continue.") },
      { name: "Type", title: "What type of books would you prefer?", hint: "Pick one.", build: pickStep("type", TYPES),
        validate: (p) => (p.type ? "" : "Please choose a book type to continue.") },
    ],
    review: (p) => [
      [0, "Genres", p.genres],
      [1, "Reading mood", p.mood ? labelOf(MOODS, p.mood) : ""],
      [2, "Reading level", p.level ? levelText(p.level) : ""],
      [3, "Book type", p.type ? labelOf(TYPES, p.type) : ""],
    ],
    summary: (d) => [
      ["Genres", d.genres.join(", ")],
      ["Reading mood", labelOf(MOODS, d.mood)],
      ["Reading level", levelText(d.level)],
      ["Book type", labelOf(TYPES, d.type)],
    ],
    resultSub: "Here is what CineBook will use to match books.",
    summaryInfo: () => ({
      title: "Ready for the rule engine",
      text:
        (CineBook.books.ready ? CineBook.books.list.length + " books are" : "The book data is not") +
        " loaded. Press “See recommendations” to apply the IF–THEN rules to your answers and rank the best matches.",
    }),
    processingSteps: () => [
      "Reading your preferences",
      "Loading " + (CineBook.books.ready ? CineBook.books.list.length : "the") + " books from the knowledge base",
      "Applying " + CineBook.bookEngine.rules.length + " IF–THEN rules to every book",
      "Ranking by priority score and writing explanations",
    ],
    results: (data, hooks) => CineBook.bookResults(data, hooks),
    dataNote: () => {
      if (CineBook.books.ready) return { text: "✔ Book knowledge base loaded: " + CineBook.books.list.length + " books." };
      if (CineBook.books.error)
        return {
          warn: true,
          text: "⚠ Book data could not be loaded. Open the site with VS Code's Live Server (not by double-clicking the file) so the browser may read data/books.json.",
        };
      return { text: "Loading book knowledge base…" };
    },
    dataPromise: CineBook.bookDataPromise,
  });
})();
