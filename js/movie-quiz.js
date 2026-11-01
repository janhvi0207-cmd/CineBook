// CineBook – Stage 2: movie preference questionnaire (4 steps + review).
// It only COLLECTS preferences. Recommendations are produced by the rule engine in Stage 4.
// The step logic lives in quiz-engine.js; this file describes the movie questions.

(function () {
  "use strict";

  const CineBook = window.CineBook;
  const { el, option } = CineBook.quizKit;

  // ---------- Question data ----------
  // Genre keys match the "genres" values in data/movies.json.
  const GENRES = [
    { key: "Action", icon: "💥" }, { key: "Adventure", icon: "🧭" },
    { key: "Comedy", icon: "😂" }, { key: "Drama", icon: "🎭" },
    { key: "Horror", icon: "👻" }, { key: "Thriller", icon: "🔦" },
    { key: "Romance", icon: "💕" }, { key: "Science Fiction", icon: "🚀" },
    { key: "Fantasy", icon: "🐉" }, { key: "Mystery", icon: "🔍" },
    { key: "Animation", icon: "🎨" }, { key: "Documentary", icon: "🎥" },
  ];
  // Mood keys match the "moods" values in data/movies.json.
  const MOODS = [
    { key: "happy", icon: "😄", label: "Happy and Lighthearted", desc: "Feel-good fun and laughs" },
    { key: "exciting", icon: "🔥", label: "Exciting and Adventurous", desc: "Big thrills and journeys" },
    { key: "suspenseful", icon: "🕵️", label: "Suspenseful and Mysterious", desc: "Twists and edge-of-seat tension" },
    { key: "emotional", icon: "🥹", label: "Emotional and Heartwarming", desc: "Stories that touch the heart" },
    { key: "romantic", icon: "💞", label: "Romantic", desc: "Love stories and chemistry" },
    { key: "thoughtful", icon: "🧠", label: "Thought-provoking", desc: "Ideas that stay with you" },
    { key: "scary", icon: "😱", label: "Scary and Thrilling", desc: "Chills, screams and dread" },
  ];
  const LANGUAGES = [
    { key: "English", icon: "🇬🇧" }, { key: "Hindi", icon: "🇮🇳" }, { key: "Marathi", icon: "🏵️" },
    { key: "Korean", icon: "🇰🇷" }, { key: "Japanese", icon: "🇯🇵" }, { key: "Other", icon: "🌍" },
  ];
  // Keys match the bands computed in movie-data.js.
  const DURATIONS = [
    { key: "short", label: "Short", hint: "Under 90 minutes" },
    { key: "medium", label: "Medium", hint: "90–120 minutes" },
    { key: "long", label: "Long", hint: "Above 120 minutes" },
    { key: "any", label: "Any Duration", hint: "No preference" },
  ];
  const PERIODS = [
    { key: "classic", label: "Classic", hint: "Before 2000" },
    { key: "2000-2010", label: "2000–2010", hint: "The 2000s" },
    { key: "2011-2020", label: "2011–2020", hint: "The 2010s" },
    { key: "recent", label: "Recent", hint: "2021 onwards" },
    { key: "any", label: "Any Period", hint: "No preference" },
  ];

  const labelOf = (list, key) => (list.find((o) => o.key === key) || {}).label || key;
  function describe(list, key) {
    const o = list.find((x) => x.key === key);
    return o ? (key === "any" ? o.label : o.label + " (" + o.hint + ")") : key;
  }

  // ---------- Step builders ----------
  function genreStep() {
    const grid = el("div", "opt-grid genre-grid");
    GENRES.forEach((g, i) => {
      const b = option("genres", g.key, "genre-opt");
      b.style.setProperty("--hue", (i * 30) % 360);
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
  function languageStep() {
    const grid = el("div", "opt-grid lang-grid");
    LANGUAGES.forEach((l) => {
      const b = option("language", l.key, "lang-opt");
      b.append(el("span", "opt-icon", l.icon), el("span", "opt-label", l.key), el("span", "opt-check", "✓"));
      grid.appendChild(b);
    });
    return grid;
  }
  function extrasStep() {
    const wrap = el("div", "extras");
    [["duration", "🕒 Movie duration", DURATIONS], ["period", "📅 Release period", PERIODS]].forEach(
      ([group, title, list]) => {
        const block = el("div", "extras-block");
        block.appendChild(el("h4", "", title));
        const row = el("div", "chip-row");
        list.forEach((o) => {
          const b = option(group, o.key, "chip-opt");
          b.append(el("span", "opt-label", o.label), el("span", "opt-desc", o.hint));
          row.appendChild(b);
        });
        block.appendChild(row);
        wrap.appendChild(block);
      }
    );
    return wrap;
  }

  // ---------- Quiz definition ----------
  CineBook.createQuiz({
    root: document.getElementById("movieQuiz"),
    startBtn: document.getElementById("startMovieQuiz"),
    title: "🎬 Movie Preference Quiz",
    buttonClass: "btn-movie",
    prefsKey: "moviePreferences",
    eventName: "cinebook:movie-preferences",
    freshPrefs: () => ({ genres: [], mood: null, language: null, duration: "any", period: "any" }),
    multi: ["genres"],
    steps: [
      { name: "Genre", title: "Select your favourite genres", hint: "Pick one or more.", build: genreStep,
        validate: (p) => (p.genres.length ? "" : "Please choose at least one genre to continue.") },
      { name: "Mood", title: "What kind of movie are you in the mood for?", hint: "Pick one.", build: moodStep,
        validate: (p) => (p.mood ? "" : "Please choose a mood to continue.") },
      { name: "Language", title: "Which language do you prefer?", hint: "Pick one.", build: languageStep,
        validate: (p) => (p.language ? "" : "Please choose a language to continue.") },
      { name: "Extras", title: "Any additional preferences?", hint: "Optional — leave on “Any” if you don't mind.", build: extrasStep },
    ],
    review: (p) => [
      [0, "Genres", p.genres],
      [1, "Mood", p.mood ? labelOf(MOODS, p.mood) : ""],
      [2, "Language", p.language || ""],
      [3, "Duration", describe(DURATIONS, p.duration)],
      [3, "Release period", describe(PERIODS, p.period)],
    ],
    summary: (d) => [
      ["Genres", d.genres.join(", ")],
      ["Mood", labelOf(MOODS, d.mood)],
      ["Language", d.language],
      ["Duration", describe(DURATIONS, d.duration)],
      ["Release period", describe(PERIODS, d.period)],
    ],
    resultSub: "Here is what CineBook will use to match movies.",
    summaryInfo: () => ({
      title: "Ready for the rule engine",
      text:
        (CineBook.movies.ready ? CineBook.movies.list.length + " movies are" : "The movie data is not") +
        " loaded. Press “See recommendations” to apply the IF–THEN rules to your answers and rank the best matches.",
    }),
    processingSteps: () => [
      "Reading your preferences",
      "Loading " + (CineBook.movies.ready ? CineBook.movies.list.length : "the") + " movies from the knowledge base",
      "Applying " + CineBook.movieEngine.rules.length + " IF–THEN rules to every movie",
      "Ranking by priority score and writing explanations",
    ],
    results: (data, hooks) => CineBook.movieResults(data, hooks),
    dataNote: () => {
      if (CineBook.movies.ready) return { text: "✔ Movie knowledge base loaded: " + CineBook.movies.list.length + " films." };
      if (CineBook.movies.error)
        return {
          warn: true,
          text: "⚠ Movie data could not be loaded. Open the site with VS Code's Live Server (not by double-clicking the file) so the browser may read data/movies.json.",
        };
      return { text: "Loading movie knowledge base…" };
    },
    dataPromise: CineBook.movieDataPromise,
  });
})();
