import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { getIdFromUrl, capitalize, getSpriteUrl } from "../utils.js";
import { useShinyMode } from "../shiny.js";

// Right end of the type-filter navbar. The magnifying glass button stays in
// the bar and toggles a separate floating panel that hangs just below it:
// an input box (name or #id) plus the matching Pokémon. The button turns
// into an × while the panel is open; clicking outside the panel closes it.
function NavbarSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [all, setAll] = useState([]);
  const [results, setResults] = useState([]);
  const wrapRef = useRef(null);
  const navigate = useNavigate();

  // Shiny mode: the search thumbnails match the site-wide shiny/normal
  // version (so a search while shiny shows the shiny forms).
  const { shiny } = useShinyMode();

  // The same 100-pokémon list the card grid uses — the search candidates
  useEffect(() => {
    let isCurrent = true;

    (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/pokemon?limit=100`);
        if (!response.ok) return;
        const data = await response.json();
        if (isCurrent) setAll(data.results);
      } catch {
        // without the list the search just returns no results
      }
    })();

    return () => {
      isCurrent = false;
    };
  }, []);

  // "25" / "0025" → match the dex id; anything else → name prefix match
  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (!q || all.length === 0) {
      setResults([]);
      return;
    }

    let matches;
    if (/^\d+$/.test(q)) {
      matches = all.filter((pokemon) => Number(getIdFromUrl(pokemon.url)) === Number(q));
    } else {
      matches = all.filter((pokemon) => pokemon.name.startsWith(q));
    }
    setResults(matches.slice(0, 6));
  }, [query, all]);

  function close() {
    setOpen(false);
    setQuery("");
    setResults([]);
  }

  // Close the panel when the user clicks/taps anywhere outside of it
  useEffect(() => {
    if (!open) return;

    function onPointerDown(event) {
      if (wrapRef.current && !wrapRef.current.contains(event.target)) {
        close();
      }
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  function pick(pokemon) {
    navigate(`/pokemon/${pokemon.name}`);
    close();
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (results.length > 0) pick(results[0]);
  }

  return (
    <div className="navbar-search" ref={wrapRef}>
      <button
        type="button"
        className="navbar-search-button"
        aria-label={open ? "Close search" : "Search Pokémon"}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {open ? <CloseIcon /> : <SearchIcon />}
      </button>

      {open && (
        <div className="navbar-search-panel">
          <form className="navbar-search-form" onSubmit={handleSubmit}>
            <input
              id="pokemon-search-input"
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => event.key === "Escape" && close()}
              placeholder="Name or #id…"
              autoFocus
              aria-label="Search Pokémon by name or id"
            />
          </form>

          {query.trim() !== "" && results.length === 0 && (
            <p className="navbar-search-empty">No Pokémon found.</p>
          )}

          {results.length > 0 && (
            <ul className="navbar-search-results">
              {results.map((pokemon) => {
                const id = getIdFromUrl(pokemon.url);
                return (
                  <li key={pokemon.name}>
                    <button type="button" onClick={() => pick(pokemon)}>
                      <img
                        src={getSpriteUrl(id, shiny)}
                        alt={shiny ? `Shiny ${pokemon.name}` : pokemon.name}
                        width={32}
                        height={32}
                      />
                      <span className="navbar-search-name">
                        {capitalize(pokemon.name)}
                      </span>
                      <span className="navbar-search-id">
                        #{String(id).padStart(3, "0")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="6" stroke="currentColor" strokeWidth="2.2" />
      <line
        x1="15.5"
        y1="15.5"
        x2="20"
        y2="20"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" aria-hidden="true">
      <line
        x1="6"
        y1="6"
        x2="18"
        y2="18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <line
        x1="18"
        y1="6"
        x2="6"
        y2="18"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default NavbarSearch;
