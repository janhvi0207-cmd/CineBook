// CineBook – reusable multi-step questionnaire engine (used by the movie and book quizzes).
// A quiz is described by a config object: its steps, how to validate them, and how to summarise the answers.
// The engine handles the progress bar, navigation, validation, review step, result screen and reset.

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});

  // ---------- Small DOM helpers (also shared with quiz configs) ----------
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  // A selectable button. data-group is the preference name, data-value the chosen value.
  function option(group, value, cls) {
    const b = el("button", "opt " + cls);
    b.type = "button";
    b.dataset.group = group;
    b.dataset.value = value;
    b.setAttribute("aria-pressed", "false");
    return b;
  }
  CineBook.quizKit = { el, option };

  /*
   cfg = {
     root, startBtn,                // elements
     title, buttonClass,            // "🎬 Movie Preference Quiz", "btn-movie"
     prefsKey, eventName,           // CineBook[prefsKey] and the custom event fired on submit
     freshPrefs(),                  // blank preferences object
     multi: ["genres"],             // preference names that allow several values
     steps: [{ name, title, hint, build(), validate(prefs) }],
     review(prefs):  [[stepIndex, label, string | string[]]],
     summary(data):  [[label, value]],
     resultSub, summaryInfo(): { title, text },   // preference summary page
     processingSteps(): [strings],  // lines shown while the rule engine "thinks"
     results(data, hooks): element, // the recommendations page (hooks: summaryRows, backToPreferences, changePreferences, startOver)
     dataNote(): { text, warn },    // status line about the dataset
     dataPromise                    // resolves when the dataset has loaded
   }
  */
  CineBook.createQuiz = function (cfg) {
    const { root, startBtn, steps } = cfg;
    const REVIEW = steps.length;
    const names = steps.map((s) => s.name).concat("Review");

    let prefs = cfg.freshPrefs();
    let step = 0;
    let busy = false;
    let flow = 0; // bumps when the user leaves the results flow, so a late timer does nothing
    let panels = [], progressItems = [], barFill, stepText, errorBox, backBtn, nextBtn, statusNote;

    // ---------- Build the quiz shell ----------
    function build() {
      root.replaceChildren();

      const head = el("div", "mq-head");
      head.appendChild(el("h3", "", cfg.title));
      const resetBtn = el("button", "mq-link", "↺ Start over");
      resetBtn.type = "button";
      resetBtn.addEventListener("click", reset);
      head.appendChild(resetBtn);

      const progress = el("div", "mq-progress");
      const bar = el("div", "mq-bar");
      barFill = el("div", "mq-bar-fill");
      barFill.setAttribute("role", "progressbar");
      barFill.setAttribute("aria-valuemin", "0");
      barFill.setAttribute("aria-valuemax", "100");
      bar.appendChild(barFill);
      const dots = el("ol", "mq-steps");
      progressItems = names.map((name, i) => {
        const li = el("li", "mq-dot");
        li.append(el("span", "mq-dot-num", String(i + 1)), el("span", "mq-dot-name", name));
        dots.appendChild(li);
        return li;
      });
      stepText = el("p", "mq-step-text");
      stepText.setAttribute("aria-live", "polite");
      progress.append(bar, dots, stepText);

      const stage = el("div", "mq-stage");
      const all = steps.concat([{ title: "Review your preferences", hint: "Check everything, then submit.", build: () => el("div", "review") }]);
      panels = all.map((s) => {
        const panel = el("div", "mq-panel");
        panel.hidden = true;
        const h = el("h4", "mq-q", s.title);
        h.tabIndex = -1;
        panel.append(h, el("p", "mq-hint", s.hint), s.build());
        stage.appendChild(panel);
        return panel;
      });
      stage.addEventListener("click", onOptionClick);

      errorBox = el("p", "mq-error");
      errorBox.setAttribute("role", "alert");

      const nav = el("div", "mq-nav");
      backBtn = el("button", "btn btn-ghost", "← Back");
      backBtn.type = "button";
      backBtn.addEventListener("click", () => goTo(step - 1));
      nextBtn = el("button", "btn " + cfg.buttonClass, "Next →");
      nextBtn.type = "button";
      nextBtn.addEventListener("click", next);
      nav.append(backBtn, nextBtn);

      statusNote = el("p", "mq-note");
      root.append(head, progress, stage, errorBox, nav, statusNote);
      updateDataNote();
    }

    function updateDataNote() {
      if (!statusNote) return;
      const note = cfg.dataNote();
      statusNote.classList.toggle("warn", !!note.warn);
      statusNote.textContent = note.text;
    }

    // ---------- Selecting options ----------
    function onOptionClick(event) {
      const btn = event.target.closest(".opt");
      if (!btn) return;
      const { group, value } = btn.dataset;
      if (cfg.multi.includes(group)) {
        const i = prefs[group].indexOf(value);
        if (i >= 0) prefs[group].splice(i, 1);
        else prefs[group].push(value);
      } else {
        prefs[group] = value;
      }
      errorBox.textContent = "";
      syncSelections();
    }

    function syncSelections() {
      root.querySelectorAll(".opt").forEach((btn) => {
        const { group, value } = btn.dataset;
        const on = cfg.multi.includes(group) ? prefs[group].includes(value) : prefs[group] === value;
        btn.classList.toggle("selected", on);
        btn.setAttribute("aria-pressed", String(on));
      });
    }

    // ---------- Validation ----------
    const validateStep = (i) => (steps[i] && steps[i].validate ? steps[i].validate(prefs) : "");
    function firstInvalidStep() {
      for (let i = 0; i < steps.length; i++) if (validateStep(i)) return i;
      return -1;
    }

    // ---------- Navigation ----------
    function next() {
      const problem = validateStep(step);
      if (problem) {
        errorBox.textContent = problem;
        errorBox.classList.remove("shake");
        void errorBox.offsetWidth; // restart the animation
        errorBox.classList.add("shake");
        return;
      }
      if (step === REVIEW) return submit();
      goTo(step + 1);
    }

    function goTo(target, instant) {
      if (busy || target < 0 || target > REVIEW) return;
      const forward = target >= step;
      const leaving = panels[step];
      errorBox.textContent = "";

      const show = () => {
        panels.forEach((p) => { p.hidden = true; p.classList.remove("enter-fwd", "enter-back", "leaving"); });
        step = target;
        if (step === REVIEW) renderReview();
        const panel = panels[step];
        panel.hidden = false;
        if (!instant) panel.classList.add(forward ? "enter-fwd" : "enter-back");
        updateChrome();
        panel.querySelector(".mq-q").focus({ preventScroll: true });
        busy = false;
      };

      if (instant || leaving.hidden || target === step) return show();
      busy = true;
      leaving.classList.add("leaving");
      setTimeout(show, 160);
    }

    function updateChrome() {
      const pct = Math.round((step / REVIEW) * 100);
      barFill.style.width = Math.max(pct, 4) + "%";
      barFill.setAttribute("aria-valuenow", String(pct));
      progressItems.forEach((li, i) => {
        li.classList.toggle("active", i === step);
        li.classList.toggle("done", i < step);
      });
      stepText.textContent = step === REVIEW ? "Final review" : "Step " + (step + 1) + " of " + steps.length + " · " + names[step];
      backBtn.style.visibility = step === 0 ? "hidden" : "visible";
      nextBtn.textContent = step === REVIEW ? "Submit ✓" : step === REVIEW - 1 ? "Review →" : "Next →";
    }

    // ---------- Review step ----------
    function renderReview() {
      const box = panels[REVIEW].querySelector(".review");
      box.replaceChildren();
      cfg.review(prefs).forEach(([target, name, value]) => {
        const row = el("div", "review-row");
        const val = el("div", "review-value");
        if (Array.isArray(value)) value.forEach((v) => val.appendChild(el("span", "tag", v)));
        else val.appendChild(el("span", "tag alt", value));
        const edit = el("button", "mq-link", "Edit");
        edit.type = "button";
        edit.setAttribute("aria-label", "Edit " + name);
        edit.addEventListener("click", () => goTo(target));
        row.append(el("span", "review-name", name), val, edit);
        box.appendChild(row);
      });
    }

    // ---------- Submit and result ----------
    function submit() {
      const bad = firstInvalidStep();
      if (bad >= 0) return goTo(bad);

      const data = JSON.parse(JSON.stringify(prefs));
      CineBook[cfg.prefsKey] = data; // read by the Stage 4 rule engine
      document.dispatchEvent(new CustomEvent(cfg.eventName, { detail: data }));
      showProcessing(data);
    }

    // Shows a short "thinking" screen while the rule engine works, then the recommendations.
    function showProcessing(data) {
      const myFlow = ++flow;
      root.replaceChildren();
      const box = el("div", "mq-processing");
      box.setAttribute("role", "status");
      const lines = el("ul", "mq-proc-steps");
      cfg.processingSteps().forEach((text) => lines.appendChild(el("li", "", text)));
      box.append(el("div", "mq-spinner"), el("h3", "", "Analysing your preferences…"), lines);
      root.appendChild(box);
      scrollToQuiz();
      Promise.all([cfg.dataPromise, new Promise((r) => setTimeout(r, 1400))]).then(() => {
        if (myFlow === flow) showRecommendations(data); // ignore if the user already reset or went back
      });
    }

    // The recommendations page. The buttons on it are given to the results view as "hooks".
    function showRecommendations(data) {
      root.replaceChildren();
      root.appendChild(
        cfg.results(data, {
          summaryRows: cfg.summary(data),
          backToPreferences: () => showSummary(data),
          changePreferences: () => { flow++; build(); syncSelections(); goTo(REVIEW, true); },
          startOver: reset,
        })
      );
      scrollToQuiz();
    }

    // The preference summary page (what the user answered + the data the rule engine receives).
    function showSummary(data) {
      root.replaceChildren();
      const box = el("div", "mq-result");
      box.append(el("div", "mq-done", "✓"), el("h3", "", "Your preferences"), el("p", "mq-result-sub", cfg.resultSub));

      const grid = el("div", "summary-grid");
      cfg.summary(data).forEach(([k, v]) => {
        const card = el("div", "summary-card");
        card.append(el("span", "summary-k", k), el("strong", "summary-v", v));
        grid.appendChild(card);
      });
      box.appendChild(grid);

      const note = cfg.summaryInfo();
      const info = el("div", "mq-info");
      info.append(el("strong", "", note.title), el("p", "", note.text));
      box.appendChild(info);

      const details = el("details", "mq-json");
      details.append(el("summary", "", "Show the exact data passed to the rule engine"), el("pre", "", JSON.stringify(data, null, 2)));
      box.appendChild(details);

      const actions = el("div", "mq-nav");
      const edit = el("button", "btn btn-ghost", "← Edit answers");
      edit.type = "button";
      edit.addEventListener("click", () => { flow++; build(); syncSelections(); goTo(REVIEW, true); });
      const see = el("button", "btn " + cfg.buttonClass, "See recommendations →");
      see.type = "button";
      see.addEventListener("click", () => showRecommendations(data));
      const again = el("button", "btn btn-ghost", "↺ Start over");
      again.type = "button";
      again.addEventListener("click", reset);
      actions.append(edit, again, see);
      box.appendChild(actions);

      root.appendChild(box);
      scrollToQuiz();
    }

    // ---------- Reset / open ----------
    function reset() {
      flow++;
      prefs = cfg.freshPrefs();
      step = 0;
      busy = false;
      delete CineBook[cfg.prefsKey];
      build();
      syncSelections();
      goTo(0, true);
      scrollToQuiz();
    }

    function scrollToQuiz() {
      const top = root.getBoundingClientRect().top;
      if (top < 70 || top > window.innerHeight * 0.5) {
        window.scrollTo({ top: window.scrollY + top - 80, behavior: "smooth" });
      }
    }

    function open() {
      if (root.hidden) {
        root.hidden = false;
        build();
        syncSelections();
        step = 0;
        goTo(0, true);
      }
      startBtn.hidden = true;
      scrollToQuiz();
    }

    startBtn.addEventListener("click", open);
    cfg.dataPromise.then(updateDataNote); // refresh the "knowledge base loaded" note
  };
})();
