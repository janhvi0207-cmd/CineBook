# CineBook – Smart Movie & Book Recommendation System

A college AI mini-project: a website that recommends **movies** and **books** using a genuine
**rule-based expert system** (Knowledge Base + IF–THEN Rule Base + Inference Engine + Explanation Facility).

It is **not** machine learning and uses **no randomness**: the same answers always give the same recommendations,
and every recommendation shows exactly which rules produced it.

---

## 1. Problem statement and objectives

**Problem.** Choosing a movie or a book from hundreds of titles is slow. Most recommenders are "black boxes":
they say *what* to watch or read, but not *why*.

**Objectives**

1. Collect a user's preferences with a friendly step-by-step questionnaire.
2. Recommend suitable movies and books using **explicit, readable IF–THEN rules**.
3. Rank results by **priority** (weighted scores) and show a 0–100 **match percentage**.
4. Handle partial matches honestly, and never show unrelated items just to fill a list.
5. **Explain** every recommendation using the rules that actually fired.
6. Let users save favourites in their own browser.

## 2. Technologies used

| Used | Purpose |
|---|---|
| HTML5 | Page structure |
| CSS3 | Styling, animation, responsive layout (dark movie theme, warm book theme) |
| Vanilla JavaScript (ES6) | Questionnaires, rule engine, favourites |
| JSON | Knowledge bases (`data/movies.json`, `data/books.json`) |
| Local Storage | Saving favourites in the browser |

No frameworks, no build tools, no server code, no database, no login and no external API or API key.
(Fonts come from Google Fonts and posters/covers are loaded from Wikipedia / Open Library image links; if they
are offline the site still works with default fonts and fallback artwork.)

## 3. Main features

- Home, Movies, Books, Favourites and About sections with smooth navigation and a mobile menu.
- **Movie quiz** (4 steps + review): genres (multi-select), mood, language, duration, release period.
- **Book quiz** (4 steps + review): genres (multi-select), reading mood, reading level, book type.
- Progress bar, validation, Back/Next, edit-from-review, Start over.
- **Recommendation engine** for movies and books with priority scoring, partial matching and no-match handling.
- **Explanation facility** on every card, plus an expandable "how was this scored?" rule trace.
- **Favourites**: ♡/♥ on every card, saved in Local Storage, search, filters, sort, remove, and Clear All with confirmation.
- 48 real movies and 49 real books in the knowledge bases.
- Responsive for desktop, tablet and mobile.

## 4. System architecture

```
 ┌──────────────┐   preferences   ┌────────────────────────────────────────────┐
 │ Questionnaire│ ──────────────► │             INFERENCE ENGINE               │
 │ (movie/book) │                 │  facts → test every rule → add up weights  │
 └──────────────┘                 │  → % → filter invalid → rank               │
                                  └───────▲──────────────────────────▲─────────┘
                                          │                          │
                              ┌───────────┴──────────┐   ┌───────────┴──────────┐
                              │  KNOWLEDGE BASE      │   │  RULE BASE           │
                              │  data/*.json         │   │  movie-rules.js      │
                              │  (movies, books)     │   │  book-rules.js       │
                              └──────────────────────┘   └──────────────────────┘
                                          │
                                          ▼
                       ┌──────────────────────────────────────┐        ┌───────────────┐
                       │ RESULTS + EXPLANATION FACILITY        │ ─ ♥ ─► │ Favourites    │
                       │ cards, match %, "why", rule trace     │        │ (Local Storage)│
                       └──────────────────────────────────────┘        └───────────────┘
```

The same generic engine (`inference-engine.js`) serves both movies and books. Only the **rule base** and the
**knowledge base** differ, which keeps knowledge, rules and engine cleanly separated.

### Knowledge Base
The facts the system knows about the world: `data/movies.json` (title, genres, language, year, duration,
description, poster, mood tags) and `data/books.json` (title, author, genres, year, reading level, fiction /
non-fiction, mood tags, cover). `movie-data.js` / `book-data.js` load and validate them, and add derived
fields such as a movie's duration band (`short`/`medium`/`long`) and release period.

### Rule Base
The expert knowledge: readable IF–THEN rules written as JavaScript objects in `js/movie-rules.js` and
`js/book-rules.js`. Each rule has an `ifText`, a `test`, a `weight` (points added when the rule fires), a `priority`
label, and a `because` function that writes its explanation sentence.

### Inference Engine
`js/inference-engine.js` is the reasoning part. For each movie/book it (1) builds *facts* comparing the item with the
user's answers, (2) tests **every** rule against those facts (forward chaining), (3) adds the weights of the rules that
fired, (4) converts the score to a match %, (5) discards invalid items and (6) ranks the rest.
It never changes the data and uses no random numbers.

### Explanation Facility
`explain()` in the engine and `results-view.js` turn the **rules that really fired** into text such as
*"M4 Its mood matches your preference (Exciting)."*, list what did **not** match for partial matches, and show a table of all
rules with ✔/✘ and points, plus rules evaluated, rules triggered, final score and match percentage.

## 5. Sample rules

**Movies** (weights add up to 100)

| Rule | IF … | THEN add | Priority |
|---|---|---|---|
| M1 | genre matches a selected genre **AND** mood matches | 20 | High |
| M2 | genre matches **AND** language matches | 15 | Medium-high |
| M3 | genre matches a selected genre | 25 | Medium |
| M4 | mood matches | 15 | Additional |
| M5 | language matches | 10 | Additional |
| M6 | duration band matches (skipped for "Any Duration") | 8 | Additional |
| M7 | release period matches (skipped for "Any Period") | 7 | Additional |

**Books** (weights add up to 100)

| Rule | IF … | THEN add | Priority |
|---|---|---|---|
| B1 | genre matches **AND** reading mood matches | 20 | High |
| B2 | genre matches **AND** reading level matches | 15 | Medium-high |
| B3 | genre matches a selected genre | 30 | Medium |
| B4 | reading mood matches | 15 | Additional |
| B5 | reading level matches | 10 | Additional |
| B6 | book type matches (skipped for "Any Type") | 10 | Additional |

A rule as it appears in the code (`js/movie-rules.js`):

```js
{
  id: "M1", name: "Genre + mood", kind: "combo", priority: "High", weight: 20, usesGenre: true,
  ifText: "IF the movie's genre matches a selected genre AND its mood matches the selected mood",
  appliesTo: always,
  test: (f) => f.genreMatch && f.moodMatch,
  because: () => "Combination bonus: it matches both your genre and your mood.",
}
```

## 6. Scoring and recommendation logic

1. **Base rules** check one preference. **Combo rules** (M1, M2 / B1, B2) add a bonus when two important preferences match
   together. Only genre can earn points from several rules; every other preference earns from exactly one rule, so nothing is over-counted.
2. **Genre strength:** genre rules give full points if the item matches as many of your genres as possible (up to two),
   otherwise 60% of the points. This rewards items that fit several chosen genres.
3. **"Any" answers** (duration, period, type) switch that rule off and remove its weight from the maximum, so nothing is penalised.
4. **Match %** = points earned ÷ maximum possible for *your* answers × 100.
5. **Categories:** Excellent Match ≥ 80%, Good Match ≥ 60%, Partial Match below that.
6. **Valid recommendation** = matches at least one chosen genre **and** scores at least **35%**. Genre is the most important
   preference and is never relaxed; other preferences only lower the score (partial match) and are listed on the card.
7. **Ranking:** score (high → low); ties are broken by number of matched genres, then title A–Z – so results are always identical for the same answers.
8. Fewer than 5 valid results → fewer are shown, with an explanation. None → "No suitable matches" with advice. Up to 5 are shown first, with "View more" for the rest.

## 7. Favourites and Local Storage

- The ♡/♥ button on every recommendation card and knowledge-base card adds/removes a favourite.
- Favourites are saved in `localStorage` under the key **`cinebookFavourites`** as a JSON list of small snapshots
  (`type`, `id`, `title`, `sub`, `image`, `genres`, `description`, `savedAt`). An item is identified by `type + id`, so duplicates are impossible.
- `js/favourites.js` is the only file that touches Local Storage. Damaged or wrongly-shaped data is ignored and cleaned,
  and if storage is blocked or full the site keeps working in memory and shows a notice.
- The Favourites page (`js/favourites-page.js`) separates Movies and Books, and offers search (title, author, genre), a type filter,
  a genre filter, sorting, Remove, and **Clear all** (asks for confirmation first).

## 8. Folder structure

```
CineBook/
├── index.html                 Single page: Home, Movies, Books, Favourites, About
├── README.md
├── css/
│   ├── style.css              Base design, navigation, hero, sections
│   ├── movie-quiz.css         Movie quiz + poster shelf (dark cinematic)
│   ├── book-quiz.css          Book quiz + cover shelf (warm cream)
│   ├── results.css            "Analysing" screen + recommendation cards
│   └── favourites.css         ♥ buttons, Favourites page, confirm dialog
├── data/
│   ├── movies.json            Movie knowledge base (48 movies)
│   └── books.json             Book knowledge base (49 books)
├── js/
│   ├── main.js                Navigation, scroll effects, toast
│   ├── dataset.js             Shared JSON loader + record validation
│   ├── quiz-engine.js         Shared multi-step questionnaire engine
│   ├── movie-quiz.js          Movie questions (uses quiz-engine)
│   ├── book-quiz.js           Book questions (uses quiz-engine)
│   ├── movie-data.js          Loads/validates movies, adds derived fields
│   ├── book-data.js           Loads/validates books
│   ├── inference-engine.js    Generic engine: facts, rules, score, %, rank, explain
│   ├── movie-rules.js         Movie rule base (M1–M7) + movie inference functions
│   ├── book-rules.js          Book rule base (B1–B6) + book inference functions
│   ├── results-view.js        Recommendation page (cards, explanations, rule trace)
│   ├── movie-results.js       Connects movie engine to results page
│   ├── book-results.js        Connects book engine to results page
│   ├── shelf.js               Poster/cover shelf + fallback artwork
│   ├── movie-shelf.js         Movie knowledge-base preview
│   ├── book-shelf.js          Book knowledge-base preview
│   ├── favourites.js          Favourites store (Local Storage)
│   └── favourites-page.js     Favourites page (search, filters, clear all)
└── assets/                    (reserved for future images)
```

## 9. How to run (VS Code + Live Server)

1. Install **Visual Studio Code** and open the `CineBook` folder (**File → Open Folder**).
2. Open the Extensions panel (`Ctrl+Shift+X`), search **Live Server** (by Ritwick Dey) and install it.
3. Right-click `index.html` and choose **Open with Live Server**. The site opens in your browser and refreshes when you save changes.

> Why not just double-click `index.html`? Browsers block `fetch()` of local JSON files opened from `file://`, so the movie and
> book data would not load. A local server (Live Server) fixes this. The site shows a clear message if the data cannot be loaded.

**Try it:** Movies → *Start Movie Quiz* → answer the 4 steps → *Submit* → see ranked results, open "Why was this recommended?"
and "How the expert system scored this". Tap ♡ to save a favourite, then open **Favourites**.

## 10. Testing

Automated browser tests (Chrome, driven by a temporary script kept outside the project) plus engine unit tests were run at
desktop (1366 px), tablet (820 px) and phone (390 px) widths. They covered:

- **Engine:** hand-calculated scores, weights sum to 100, "Any" not penalised, genre strength, ranking order, deterministic output
  (same answers → same ranking, even if the dataset order changes), explanations match the rules that fired, partial matches, fewer-than-5 and no-match cases, data not mutated.
- **Questionnaires:** all steps, multi/single selection, validation, Back/Next, edit from review, summary, reset, data-load failure.
- **Results:** order and percentages on screen equal the engine's output; badges; rule trace; View more; Back/Change/Start over.
- **Favourites:** add/remove from shelf and result cards, no duplicates, persistence after refresh, search/filter/sort, empty and no-result states,
  Clear all with Cancel/Esc/Confirm, hearts staying in sync, damaged / wrong-shaped / blocked / full Local Storage, two tabs staying in step.
- **General:** no console errors, no horizontal overflow, poster/cover fallbacks.

## 11. Limitations and future scope

**Limitations**

- Rule weights and thresholds (35 % / 60 % / 80 %) are design choices made by the developer, not learned from data.
- The knowledge bases are small (48 movies, 49 books); some genres have few items (e.g. Documentary, Horror books), so lists can be short.
- Mood tags and book reading levels are the author's own judgement.
- Genre is mandatory: an item with the right mood and language but a different genre is never recommended.
- Posters/covers need an internet connection; a few covers are foreign-language editions.
- Favourites live only in one browser on one device (no accounts or syncing).

**Future scope**

- Larger datasets, more genres and more rules (e.g. director, author, page count, awards).
- Let users adjust rule weights, or add "dislike" / "already seen" preferences.
- Combined movie-and-book recommendations ("watch Dune, then read Foundation").
- Export / import favourites, and shareable result links.
- Accessibility audit and multi-language interface.
