import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL, TCGDEX_API_URL } from "../config.js";
import { getIdFromUrl, capitalize, getSpriteUrl } from "../utils.js";
import { TYPE_COLORS, typeTextColor } from "../types.js";
import PokeballSpinner from "./PokeballSpinner.jsx";
import HeartIcon from "./HeartIcon.jsx";
import { toast } from "./Toast.jsx";
import { useShinyMode } from "../shiny.js";

// A square grid of gen-1 Pokémon (#0001–#0100). Each card shows the
// sprite, name, dex id, and type badges. The types are fetched in batches
// (the list endpoint only returns names/urls), so cards show "…" until
// their types arrive.
//
// `typeFilter` (null = all, or a type string) filters the grid locally
// against the loaded types. `favoritesOnly` restricts it to the
// user's saved favorites; `favorites` is the live Set and `onToggleFavorite`
// flips a single Pokémon in/out (both come from the favorites store).
function PokemonList({
  typeFilter = null,
  favoritesOnly = false,
  favorites = new Set(),
  onToggleFavorite,
  onClearFilters,
}) {
  const [pokemons, setPokemons] = useState([]);
  const [typesMap, setTypesMap] = useState({}); // dex id -> [type, ...]
  const [error, setError] = useState(null);
  const [tcgCounts, setTcgCounts] = useState({}); // dex id -> TCG card count
  const [flipped, setFlipped] = useState(() => new Set()); // names tapped-open on touch
  const tcgInFlight = useRef({}); // prevents a re-fetch per hover
  const sectionRef = useRef(null);

  // Shiny mode: when on, every card shows its shiny sprite instead of the
  // normal one. The state is shared/persisted (src/shiny.js), so this grid
  // and the detail page stay in the same "version" with each other.
  const { shiny } = useShinyMode();

  // #7 (touch variant) — tap-to-flip only applies to devices with no hover
  // (phones/tablets); they have no mouse to hover-flip, so the first tap
  // opens the back face and the second tap navigates.
  const isTouch = useRef(
    typeof window !== "undefined" &&
    (window.matchMedia?.("(hover: none)").matches ||
      window.matchMedia?.("(pointer: coarse)").matches)
  );

  // #7 — the card flip shows a "N TCG cards" count on the back. Fetching the
  // TCG list for 100 pokémon up front would be 100 requests, so it's lazy:
  // only the hovered card's count is requested, and it's cached.
  function ensureTcgCount(id) {
    if (tcgInFlight.current[id] !== undefined) return;
    tcgInFlight.current[id] = true;
    fetch(`${TCGDEX_API_URL}?dexId=eq:${id}`)
      .then((response) => (response.ok ? response.json() : []))
      .then((data) => {
        const count = Array.isArray(data)
          ? data.filter((card) => card.image).length
          : 0;
        tcgInFlight.current[id] = count;
        setTcgCounts((prev) => ({ ...prev, [id]: count }));
      })
      .catch(() => {
        tcgInFlight.current[id] = 0;
        setTcgCounts((prev) => ({ ...prev, [id]: 0 }));
      });
  }

  useEffect(() => {
    let isCurrent = true;

    async function loadAll() {
      setError(null);
      try {
        // The list of 100 (gen 1)
        const listResponse = await fetch(`${API_BASE_URL}/pokemon?limit=100`);
        if (!listResponse.ok) {
          throw new Error(`Server responded with status ${listResponse.status}`);
        }
        const listData = await listResponse.json();
        if (!isCurrent) return;
        setPokemons(
          listData.results.map((result) => ({
            id: getIdFromUrl(result.url),
            name: result.name,
          }))
        );

        // Details (for the types), loaded in small parallel batches so the
        // grid fills in progressively without a huge burst of requests.
        const BATCH = 10;
        for (let i = 0; i < listData.results.length; i += BATCH) {
          const batch = listData.results.slice(i, i + BATCH);
          const entries = await Promise.all(
            batch.map(async (result) => {
              const id = getIdFromUrl(result.url);
              try {
                const response = await fetch(`${API_BASE_URL}/pokemon/${id}`);
                if (!response.ok) return null;
                const detail = await response.json();
                return [id, detail.types.map((t) => t.type.name)];
              } catch {
                return null;
              }
            })
          );
          if (!isCurrent) return;
          const merge = {};
          for (const entry of entries) {
            if (entry) merge[entry[0]] = entry[1];
          }
          setTypesMap((prev) => ({ ...prev, ...merge }));
        }
      } catch (err) {
        if (isCurrent) setError(err.message);
      }
    }

    loadAll();

    return () => {
      isCurrent = false;
    };
  }, []);

  // Scroll reveal: each card starts hidden and fades in only when it
  // scrolls into view, so whole rows appear one after another as you
  // scroll down (instead of all animating on page load).
  useEffect(() => {
    const section = sectionRef.current;
    if (!section || pokemons.length === 0) return;

    const cards = Array.from(section.querySelectorAll(".pokemon-card"));

    // No IntersectionObserver support → just show everything
    if (!("IntersectionObserver" in window)) {
      cards.forEach((card) => card.classList.add("pokemon-card-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("pokemon-card-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );

    cards.forEach((card) => observer.observe(card));

    return () => observer.disconnect();
  }, [pokemons, typeFilter]);

  if (error && pokemons.length === 0) {
    return <p className="status status-error">Couldn't load the list: {error}</p>;
  }

  // #2 — while the list + types are still loading: a grid of placeholder
  // squares (each with a spinning grey Pokéball) so the page never flashes
  // an empty box. Same cell size as the real cards → no layout shift.
  if (pokemons.length === 0) {
    return (
      <section className="pokemon-grid-section" aria-busy="true">
        <div className="grid-loading" role="status" aria-label="Loading Pokémon">
          <PokeballSpinner />
          <span>Loading Pokémon…</span>
        </div>
      </section>
    );
  }

  const visible = pokemons.filter((pokemon) => {
    if (favoritesOnly && !favorites.has(pokemon.name)) return false;
    if (!typeFilter) return true;
    const types = typesMap[pokemon.id];
    return types ? types.includes(typeFilter) : false;
  });

  return (
    <section className="pokemon-grid-section" id="pokemon-grid" ref={sectionRef}>
      <ul className="pokemon-grid" key={typeFilter ?? "all"}>
      {visible.map((pokemon) => {
        const types = typesMap[pokemon.id] ?? [];
        return (
          <li key={pokemon.name} className="pokemon-grid-item">
            <Link
              to={`/pokemon/${pokemon.name}`}
              className={`pokemon-card${
                flipped.has(pokemon.name) ? " pokemon-card-flipped" : ""
              }`}
              onMouseEnter={() => ensureTcgCount(pokemon.id)}
              onClick={(event) => {
                // #7 (touch) — first tap opens the back face instead of
                // navigating; the second tap navigates as normal.
                if (!isTouch.current || flipped.has(pokemon.name)) return;
                event.preventDefault();
                setFlipped((prev) => new Set(prev).add(pokemon.name));
                ensureTcgCount(pokemon.id);
              }}
            >
              <button
                type="button"
                className={`card-heart${
                  favorites.has(pokemon.name) ? " card-heart-active" : ""
                }`}
                aria-label={
                  favorites.has(pokemon.name)
                    ? `Unfavorite ${capitalize(pokemon.name)}`
                    : `Favorite ${capitalize(pokemon.name)}`
                }
                aria-pressed={favorites.has(pokemon.name)}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  // #5 — toast feedback for the heart toggle
                  const wasFavorite = favorites.has(pokemon.name);
                  onToggleFavorite?.(pokemon.name);
                  toast(
                    `${capitalize(pokemon.name)} ${
                      wasFavorite ? "removed from" : "added to"
                    } favorites`
                  );
                }}
              >
              <HeartIcon
                active={favorites.has(pokemon.name)}
                inactiveFill="#8794a3"
              />
              {/* #3 — red-dot burst on favoriting (see .card-heart-burst) */}
              <span className="card-heart-burst" aria-hidden="true">
                <i />
                <i />
                <i />
                <i />
                <i />
                <i />
              </span>
              </button>
              <div className="pokemon-card-flip" aria-hidden="false">
                <div className="pokemon-card-face pokemon-card-front">
                  <div className="pokemon-card-inner">
                    <div className="pokemon-card-art">
                      <img
                        src={getSpriteUrl(pokemon.id, shiny)}
                        alt={shiny ? `Shiny ${pokemon.name}` : pokemon.name}
                        width={96}
                        height={96}
                      />
                    </div>
                    <span className="pokemon-card-name">
                      {capitalize(pokemon.name)}
                    </span>
                    <span className="pokemon-card-id">
                      #{String(pokemon.id).padStart(4, "0")}
                    </span>
                    <div className="pokemon-card-types">
                      {types.length === 0 ? (
                        <span className="pokemon-card-type pending">…</span>
                      ) : (
                        types.map((type) => (
                          <span
                            key={type}
                            className="pokemon-card-type"
                            style={{
                              background: TYPE_COLORS[type] ?? "#999",
                              color: typeTextColor(type),
                            }}
                          >
                            {capitalize(type)}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
                <div className="pokemon-card-face pokemon-card-back">
                  <span className="pokemon-card-back-name">
                    {capitalize(pokemon.name)}
                  </span>
                  <div className="pokemon-card-back-types">
                    {types.length === 0 ? (
                      <span className="pokemon-card-type pending">…</span>
                    ) : (
                      types.map((type) => (
                        <span
                          key={type}
                          className="pokemon-card-type"
                          style={{
                            background: TYPE_COLORS[type] ?? "#999",
                            color: typeTextColor(type),
                          }}
                        >
                          {capitalize(type)}
                        </span>
                      ))
                    )}
                  </div>
                  <p className="pokemon-card-back-tcg">
                    {tcgCounts[pokemon.id] !== undefined ? (
                      <>
                        <span className="tcg-count">
                          {tcgCounts[pokemon.id]}
                        </span>
                        TCG cards found
                      </>
                    ) : (
                      "Loading TCG cards…"
                    )}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
      {visible.length === 0 && (
        <li className="pokemon-grid-empty">
          <div className="grid-empty">
            <PokeballSpinner size={48} />
            <p>
              {favoritesOnly
                ? "No favorites yet — tap the heart on any card to save one."
                : `No gen-1 Pokémon of that${
                    typeFilter ? ` ${typeFilter}` : ""
                  } type.`}
            </p>
            {onClearFilters && (
              <button type="button" className="grid-empty-clear" onClick={onClearFilters}>
                Clear{typeFilter ? " filter" : ""}
                {favoritesOnly ? " (keep type)" : ""}
              </button>
            )}
          </div>
        </li>
      )}
      </ul>
    </section>
  );
}

export default PokemonList;
