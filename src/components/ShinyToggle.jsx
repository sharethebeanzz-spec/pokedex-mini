import { useShinyMode } from "../shiny.js";

// A "Shiny mode" toggle. `variant` shapes it for where it lives:
//  - "pill" → a type-pill on the dark type-filter bar (home page)
//  - "bar"  → a small pill on the light site navbar (detail page)
// Reads/writes the shared persisted shiny state, so it's always in sync with
// the sprites and the other toggle on the other page.
function ShinyToggle({ variant = "pill" }) {
  const { shiny, toggle } = useShinyMode();

  const cls =
    variant === "pill"
      ? `type-pill type-pill-shiny${shiny ? " type-pill-shiny-on" : ""}`
      : `site-nav-btn site-nav-btn-shiny${shiny ? " site-nav-btn-shiny-on" : ""}`;

  return (
    <button
      type="button"
      className={cls}
      onClick={toggle}
      aria-pressed={shiny}
      aria-label={shiny ? "Switch to normal (non-shiny) Pokémon" : "Switch to shiny Pokémon"}
    >
      <span className="shiny-glyph" aria-hidden="true">
        ✦
      </span>
      <span className="shiny-label">Shiny</span>
    </button>
  );
}

export default ShinyToggle;
