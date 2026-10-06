import { useState, useEffect, useRef } from "react";
import { TCGDEX_API_URL } from "../config.js";
import { capitalize } from "../utils.js";
import PokeballSpinner from "./PokeballSpinner.jsx";

// Exactly 3 visible: [prev] [center] [next]. The center (chosen) card is
// the bigger one; the sides are smaller + dimmer; no card is ever clipped.
const SLOTS = [-1, 0, 1]; // left, center (active), right

function TcgCards({ dexId, name }) {
  const [cards, setCards] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = next, -1 = prev
  const [detail, setDetail] = useState(null);
  const detailsCache = useRef({});

  // The TCGdex API intermittently drops the connection (transient resets),
  // so a single fetch would surface an error even when a retry would succeed.
  // This retries the list request a few times with a short backoff.
  async function fetchWithRetry(url, attempts = 4, delayMs = 500) {
    let lastError = null;
    for (let i = 0; i < attempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return await response.json();
        }
        // 4xx (except 429) is a bad request, not a transient blip: stop fast
        if (response.status < 500 && response.status !== 429) {
          throw new Error(`Card service responded with status ${response.status}`);
        }
        lastError = new Error(`Card service responded with status ${response.status}`);
      } catch (err) {
        lastError = err;
      }
      // back off before the next attempt (skip after the final one)
      if (i < attempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs * (i + 1)));
      }
    }
    throw lastError;
  }

  // Load the card list for this Pokémon (only cards that have an image)
  useEffect(() => {
    let isCurrent = true;

    async function loadCards() {
      setIsLoading(true);
      setError(null);
      setCards([]);
      setActive(0);
      setDetail(null);
      detailsCache.current = {};

      try {
        const data = await fetchWithRetry(`${TCGDEX_API_URL}?dexId=eq:${dexId}`);

        if (isCurrent) {
          setCards(data.filter((card) => card.image));
        }
      } catch (err) {
        if (isCurrent) {
          setError(err.message);
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false);
        }
      }
    }

    loadCards();

    return () => {
      isCurrent = false;
    };
  }, [dexId]);

  // Load full details (set name, rarity, variants) for the active card, lazily
  useEffect(() => {
    const card = cards[active];
    if (!card) {
      setDetail(null);
      return;
    }

    if (detailsCache.current[card.id]) {
      setDetail(detailsCache.current[card.id]);
      return;
    }

    let isCurrent = true;
    fetch(`${TCGDEX_API_URL}/${encodeURIComponent(card.id)}`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!isCurrent) return;
        if (data) {
          detailsCache.current[card.id] = data;
          setDetail(data);
        }
      })
      .catch(() => {});

    return () => {
      isCurrent = false;
    };
  }, [cards, active]);

  const goPrev = () => {
    if (active > 0) {
      setDirection(-1);
      setActive((current) => Math.max(0, current - 1));
    }
  };

  const goNext = () => {
    if (active < cards.length - 1) {
      setDirection(1);
      setActive((current) => Math.min(cards.length - 1, current + 1));
    }
  };

  // #5 — swipe support (touch). A horizontal swipe of >40px on the row moves
  // to the prev/next card; swipes under the threshold are ignored so they
  // don't compete with vertical scrolling.
  const swipeStart = useRef(null);

  function onSwipeStart(event) {
    swipeStart.current = event.touches[0].clientX;
  }

  function onSwipeEnd(event) {
    if (swipeStart.current === null) return;
    const delta = event.changedTouches[0].clientX - swipeStart.current;
    swipeStart.current = null;
    if (delta > 40) goPrev();
    else if (delta < -40) goNext();
  }

  // #5 + #7 — keyboard control. The carousel only owns ←/→ while focus is
  // INSIDE its card row (e.g. after tabbing to an arrow button); anywhere
  // else on the detail page the page-level handler (DetailPage) uses the
  // arrows to jump to the previous/next Pokémon.
  useEffect(() => {
    function onKeyDown(event) {
      const tag = event.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (!event.target?.closest?.(".cards-viewport")) return;
      if (event.key === "ArrowRight") goNext();
      else if (event.key === "ArrowLeft") goPrev();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [active]); // goPrev/goNext close over `active`, so re-bind on change

  if (isLoading) {
    return (
      <section className="cards-section">
        <div className="cards-loading" role="status" aria-label="Loading cards">
          <PokeballSpinner />
          <span>Loading cards…</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="cards-section">
        <p className="status status-error">Couldn't load the cards: {error}</p>
      </section>
    );
  }

  if (cards.length === 0) {
    return (
      <section className="cards-section">
        <p className="status">No card images are available for {capitalize(name)} yet.</p>
      </section>
    );
  }

  const card = cards[active];

  return (
    <section className="cards-section">
      <div className="cards-header">
        <span className="cards-header-icon" aria-hidden="true">
          🎴
        </span>
        <h3>{capitalize(name)} Cards</h3>
      </div>

      <div className="cards-viewport">
        <button
          type="button"
          className="cards-arrow cards-arrow-left"
          disabled={active === 0}
          onClick={goPrev}
          aria-label="Previous card"
        >
          ‹
        </button>

        <div
          className="cards-row"
          data-dir={direction}
          key={active}
          onTouchStart={onSwipeStart}
          onTouchEnd={onSwipeEnd}
        >
          {SLOTS.map((delta) => {
            const idx = active + delta;
            const inBounds = idx >= 0 && idx < cards.length;
            const slotCls =
              delta === 0 ? "cards-slot-center" : "cards-slot-side";
            return (
              <div key={delta} className={`cards-slot ${slotCls}`}>
                {inBounds ? (
                  <img
                    className="tcg-card-img"
                    src={`${cards[idx].image}/low.webp`}
                    alt={`${capitalize(cards[idx].name)} card`}
                    loading={delta === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <div className="cards-slot-empty" aria-hidden="true" />
                )}
                {/* light sweep that runs across the chosen card (CSS-only
                    animation; hidden on side slots, see .cards-shine) */}
                <i className="cards-shine" aria-hidden="true" />
              </div>
            );
          })}
        </div>

        <button
          type="button"
          className="cards-arrow cards-arrow-right"
          disabled={active === cards.length - 1}
          onClick={goNext}
          aria-label="Next card"
        >
          ›
        </button>
      </div>

      <div className="cards-footer">
        <span className="cards-footer-name">{capitalize(card.name)}</span>
        <span className="cards-footer-code">
          {card.localId}
          {detail?.variants?.holo && (
            <span className="cards-shiny" title="Holo variant">
              ★
            </span>
          )}
        </span>
      </div>

      {/* #6 — where you are in the card list */}
      <div className="cards-position" aria-live="polite">
        {active + 1} of {cards.length}
      </div>
    </section>
  );
}

export default TcgCards;
