// CineBook – shared JSON dataset loader (used for data/movies.json and data/books.json).
//
// createDataset({ url, key, prepare }) returns { list, ready, error, load() }.
//   key     – name of the array inside the JSON file ("movies" / "books")
//   prepare – turns the raw records into clean, validated records (skips bad ones)

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});

  CineBook.createDataset = function ({ url, key, prepare }) {
    const dataset = {
      list: [],
      ready: false,
      error: null,
      load() {
        return fetch(url)
          .then((res) => {
            if (!res.ok) throw new Error("HTTP " + res.status);
            return res.json();
          })
          .then((json) => {
            dataset.list = prepare(json[key] || []);
            dataset.ready = true;
            return dataset.list;
          })
          .catch((err) => {
            dataset.error = err;
            console.error("CineBook: could not load " + url, err);
            throw err;
          });
      },
    };
    return dataset;
  };

  // Keeps valid records and warns (in the console) about the rest.
  // checks: (record) => array of problem strings; derive: (record) => extra fields to add.
  CineBook.prepareRecords = function (raw, checks, derive) {
    const seen = new Set();
    const clean = [];
    raw.forEach((record) => {
      const problems = checks(record);
      if (!record.id || seen.has(record.id)) problems.push("missing or duplicate id");
      if (problems.length) {
        console.warn("CineBook: skipped record", record.id || record.title, problems);
        return;
      }
      seen.add(record.id);
      clean.push(Object.assign({}, record, derive(record)));
    });
    return clean;
  };
})();
