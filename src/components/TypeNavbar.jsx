import { useEffect, useRef } from "react";
import { capitalize } from "../utils.js";
import { ALL_TYPES, TYPE_COLORS, typeTextColor } from "../types.js";
import NavbarSearch from "./NavbarSearch.jsx";
import HeartIcon from "./HeartIcon.jsx";
import ShinyToggle from "./ShinyToggle.jsx";

// A sticky, pill-shaped type-filter bar that sits below the main page card.
// Left: Pokémon (Pokéball) logo. Middle: horizontally scrollable type pills
// (capped so ~9 show at a time; the thin scrollbar signals more to scroll).
// Right: the "Favorites" chip grouped next to the search box — the two read
// as one unit on the far right. The whole bar recolors to whichever type is
// currently selected, and the selected pill is centered so its neighbors
// slide a bit to the side.
function TypeNavbar({
  activeType,
  onSelectType,
  favorites,
  favoritesOnly,
  onToggleFavorites,
}) {
  const stripRef = useRef(null);

  const isNeutral = !activeType;
  const bg = isNeutral ? "#151e2b" : TYPE_COLORS[activeType];
  const color = isNeutral ? "#ffffff" : typeTextColor(activeType);

  // When the selection changes, center that type's pill in the strip so the
  // nearby pills on either side slide out of the way ("shift a bit").
  // "All" (null) → scroll back to the very left.
  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    let target = 0;
    if (activeType) {
      const pill = strip.querySelector(`[data-type="${activeType}"]`);
      if (!pill) return;
      // pill.offsetLeft is relative to the NAVBAR (the strip itself is not
      // positioned), so subtract the strip's own offset to get the pill's
      // position within the strip's content. Without this the target
      // overshoots by the width of the left logo zone and the pill scrolls
      // out of view.
      const pillLeft = pill.offsetLeft - strip.offsetLeft;
      target = pillLeft - (strip.clientWidth - pill.clientWidth) / 2;
      // Clamp: the outermost 2 pills on each side can't actually be centered
      // (no scroll room), so their target lands at the edge instead.
      target = Math.max(0, Math.min(target, strip.scrollWidth - strip.clientWidth));
    }

    strip.scrollTo({ left: target, behavior: "smooth" });
  }, [activeType]);

  function scrollToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <nav
      className="type-navbar"
      style={{ background: bg, color }}
      aria-label="Filter Pokémon by type"
    >
      <div className="type-navbar-left">
        <button
          type="button"
          className="type-navbar-logo"
          aria-label="Back to the top"
          onClick={scrollToTop}
        >
          <Pokeball />
        </button>

        {/* Shiny mode toggle — the site-wide "show shiny forms" switch.
            Lives on the left side of the dark type-filter bar; its state is
            persisted and shared with the detail page's toggle + every
            sprite on site. */}
        <ShinyToggle variant="pill" />
      </div>

      <div className="type-navbar-types" ref={stripRef}>
        <button
          type="button"
          data-type="all"
          className={activeType === null ? "type-pill active" : "type-pill"}
          aria-pressed={activeType === null}
          onClick={() => onSelectType(null)}
        >
          All
        </button>
        {ALL_TYPES.map((type) => {
          const isActive = activeType === type;
          return (
            <button
              key={type}
              type="button"
              data-type={type}
              className={isActive ? "type-pill active" : "type-pill"}
              aria-pressed={isActive}
              onClick={() => onSelectType(type)}
            >
              {capitalize(type)}
            </button>
          );
        })}
      </div>

      <div className="type-navbar-right">
        <button
          type="button"
          data-type="favorites"
          className={`type-pill type-pill-favorites${
            favoritesOnly ? " active" : ""
          }`}
          aria-label="Filter by favorites"
          aria-pressed={favoritesOnly}
          onClick={onToggleFavorites}
        >
          <HeartIcon active={favoritesOnly} size={14} />
          <span className="favorites-label">Favorites</span>
        </button>
        <div className="type-navbar-search">
          <NavbarSearch />
        </div>
      </div>
    </nav>
  );
}

function Pokeball() {
  return (
    <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true">
      <circle cx="50" cy="50" r="42" fill="#fff" />
      <path d="M8 50 a42 42 0 0 1 84 0 Z" fill="#ff3b3b" />
      <rect x="8" y="45" width="84" height="10" fill="#141414" />
      <circle cx="50" cy="50" r="13" fill="#141414" />
      <circle cx="50" cy="50" r="8" fill="#fff" />
      <circle cx="50" cy="50" r="42" fill="none" stroke="#141414" strokeWidth="5" />
    </svg>
  );
}

export default TypeNavbar;
