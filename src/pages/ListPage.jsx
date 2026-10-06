import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import PokemonList from "../components/PokemonList.jsx";
import PokemonOfTheDay from "../components/PokemonOfTheDay.jsx";
import TypeNavbar from "../components/TypeNavbar.jsx";
import Footer from "../components/Footer.jsx";
import { useFavorites } from "../favorites.js";
import { TYPE_COLORS } from "../types.js";
import { hexToRgba } from "../utils.js";

function ListPage() {
  // #11 — the active type filter lives in the URL (?type=fire) so the
  // back/forward buttons restore the previous grid instead of jumping
  // to the top. A null value = no filter.
  const [searchParams, setSearchParams] = useSearchParams();
  const activeType = searchParams.get("type");

  // #1 + A — full-page tint: a fixed layer behind everything on this page
  // (main card, navbar, grid, footer), painted as a top→bottom gradient.
  // It starts at the very top of the screen (behind the main card) at the
  // active type's color (30% alpha) and fades to transparent over ~1000px
  // (long enough to reach the sticky navbar's zone below the card).
  // "All" / no filter → a faint neutral grey instead. This is the only
  // type wash on the page now (the old grid-section ::before merged in).
  const pageTintTop = activeType
    ? hexToRgba(TYPE_COLORS[activeType] ?? "#6890F0", 0.3)
    : "rgba(128,128,128,0.1)";
  const pageTintFade = activeType
    ? hexToRgba(TYPE_COLORS[activeType] ?? "#6890F0", 0)
    : "rgba(128,128,128,0)";

  // #3 — favorites: local "show favorites only" toggle (chip in the
  // navbar); the hearts themselves are persisted via the store.
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  function selectType(type) {
    if (type === null) {
      searchParams.delete("type");
    } else {
      searchParams.set("type", type);
    }
    setSearchParams(searchParams);
  }

  // Clear everything that could be filtering the grid (the empty-state
  // panel's button).
  function clearFilters() {
    selectType(null);
    setFavoritesOnly(false);
  }

  return (
    <>
      {/* #1 + A — the fixed full-page tint layer, behind everything on this
          page (z-index -1). Painted as a top→bottom gradient via the two
          CSS vars below: starts at the very top of the screen (behind the
          main card) at the active type color and fades to transparent.
          "All" → a faint neutral grey. */}
      <div
        className="page-tint"
        style={{ "--page-tint-top": pageTintTop, "--page-tint-fade": pageTintFade }}
        aria-hidden="true"
      />
      <PokemonOfTheDay />
      <TypeNavbar
        activeType={activeType}
        onSelectType={selectType}
        favorites={favorites}
        favoritesOnly={favoritesOnly}
        onToggleFavorites={() => setFavoritesOnly((prev) => !prev)}
      />
      <PokemonList
        typeFilter={activeType}
        favoritesOnly={favoritesOnly}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        onClearFilters={clearFilters}
      />
      <Footer />
    </>
  );
}

export default ListPage;
