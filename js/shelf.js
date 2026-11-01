// CineBook – reusable "knowledge base preview" shelf: a scrollable row of poster / cover cards.
// If an image is missing or fails to load, a coloured fallback with the title is shown instead.

(function () {
  "use strict";

  const CineBook = (window.CineBook = window.CineBook || {});
  const { el } = CineBook.quizKit;

  // A poster/cover frame. Also used by the recommendation cards.
  // `image` may be null/empty or may fail to load: both show the fallback art.
  CineBook.posterFrame = function ({ id, title, image, icon, alt }) {
    function fallback() {
      let hash = 0;
      for (const ch of id + title) hash = (hash * 31 + ch.charCodeAt(0)) % 360;
      const box = el("div", "poster-fallback");
      box.style.background =
        "linear-gradient(155deg, hsl(" + hash + " 55% 32%), hsl(" + ((hash + 50) % 360) + " 60% 14%))";
      box.append(el("span", "", icon), el("strong", "", title));
      return box;
    }

    const frame = el("div", "poster-frame");
    if (image) {
      const img = document.createElement("img");
      img.src = image;
      img.alt = alt;
      img.loading = "lazy";
      img.addEventListener("error", () => img.replaceWith(fallback()));
      frame.appendChild(img);
    } else {
      frame.appendChild(fallback());
    }
    return frame;
  };

  /*
   cfg = {
     shelf, track, sub,           // elements
     promise,                     // resolves with the record list
     type,                        // "movie" / "book" (used by the ♥ button)
     icon,                        // emoji used on fallback art
     subText(count),              // sentence under the heading
     describe(item): { id, image, title, meta, tooltip }
   }
  */
  CineBook.createShelf = function (cfg) {
    function buildCard(item) {
      const card = cfg.describe(item);
      const article = el("article", "shelf-card");

      const meta = el("div", "shelf-meta");
      meta.append(el("h4", "", card.title), el("p", "", card.meta));

      article.title = card.tooltip;
      article.append(
        CineBook.posterFrame({ id: card.id, title: card.title, image: card.image, icon: cfg.icon, alt: "Cover of " + card.title }),
        meta
      );
      article.appendChild(CineBook.favourites.button(cfg.type, item));
      return article;
    }

    cfg.promise.then((list) => {
      if (!list || !list.length) return; // the quiz shows the load error message
      cfg.track.replaceChildren(...list.map(buildCard));
      cfg.sub.textContent = cfg.subText(list.length);
      cfg.shelf.hidden = false;
    });
  };
})();
