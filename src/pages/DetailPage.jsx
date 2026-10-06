import { useState, useEffect, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import {
  capitalize,
  getIdFromUrl,
  getOfficialArtworkUrl,
  hexToRgba,
} from "../utils.js";
import { TYPE_COLORS, typeTextColor, analyzeTypes } from "../types.js";
import { useShinyMode } from "../shiny.js";
import TcgCards from "../components/TcgCards.jsx";
import Footer from "../components/Footer.jsx";
import PokeballSpinner from "../components/PokeballSpinner.jsx";
import TypeIcon from "../components/TypeIcon.jsx";

const MAX_DEX_ID = 100;

// Wrap-around prev/next within the #0001–#0100 range
function getPrevId(id) {
  return id <= 1 ? MAX_DEX_ID : id - 1;
}

function getNextId(id) {
  return id >= MAX_DEX_ID ? 1 : id + 1;
}

// Darken a #rrggbb color (factor 0..1). Accepts "rgb(r, g, b)" strings too,
// so a lightened/mixed result can be fed straight back in.
function shadeColor(source, factor) {
  let r, g, b;
  if (source.startsWith("#")) {
    const num = parseInt(source.slice(1), 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  } else {
    const m = source.match(/\d+/g).map(Number);
    [r, g, b] = m;
  }
  return `rgb(${Math.round(r * factor)}, ${Math.round(g * factor)}, ${Math.round(b * factor)})`;
}

// Lighten a color toward white (amount 0..1). Used for the hero's "sunny"
// gradient stops: bright type tints that pop without going murky. Accepts
// #rrggbb or "rgb(r, g, b)" input.
function lightenColor(source, amount) {
  let r, g, b;
  if (source.startsWith("#")) {
    const num = parseInt(source.slice(1), 16);
    r = (num >> 16) & 255;
    g = (num >> 8) & 255;
    b = num & 255;
  } else {
    const m = source.match(/\d+/g).map(Number);
    [r, g, b] = m;
  }
  const mix = (v) => Math.round(v + (255 - v) * amount);
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`;
}

// #14 — "shiny" sparkles scattered around the detail-page artwork, like a
// shiny encounter in the games. Each entry: a CSS position (top/left/right/
// bottom as % of the art slot) + a staggered twinkle delay so they don't
// blink in unison.
const ART_SPARKS = [
  { style: { top: "12%", left: "16%" }, delay: "0s", size: "16px" },
  { style: { top: "20%", right: "12%" }, delay: "0.4s", size: "20px" },
  { style: { bottom: "22%", left: "10%" }, delay: "0.8s", size: "14px" },
  { style: { bottom: "12%", right: "18%" }, delay: "0.2s", size: "18px" },
  { style: { top: "44%", left: "4%" }, delay: "1.0s", size: "12px" },
];

// Flattens the nested evolution chain into an ordered list of species
function flattenChain(node) {
  const result = [];
  if (node) {
    result.push(node);
    for (const next of node.evolves_to || []) {
      result.push(...flattenChain(next));
    }
  }
  return result;
}

// Level-100 MAX stat (the figure other Pokédex sites list).
//  Assumes a helping nature, 31 IVs, and 252 EVs (floor(252/4) = 63).
//  non-HP: floor((2*base + 31 + 63) * 1.1) + 5 = floor((2*base + 94)*1.1) + 5
//  HP:     (2*base + 31 + 63) + 100 + 1         = 2*base + 195 (no nature for HP)
function l100Max(base, isHP) {
  return isHP ? 2 * base + 195 : Math.floor((2 * base + 94) * 1.1) + 5;
}

function DetailPage() {
  const { name } = useParams();
  const navigate = useNavigate();
  const [pokemon, setPokemon] = useState(null);
  const [description, setDescription] = useState("");
  const [evolutionChain, setEvolutionChain] = useState([]);
  const [prevName, setPrevName] = useState("");
  const [nextName, setNextName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  // #5 — sections fade + rise in with a small stagger once the data lands
  const [revealed, setRevealed] = useState(false);
  const audioRef = useRef(null); // #3 — current cry audio element (one at a time)

  // Shiny mode: the hero artwork swaps to the shiny official-art form. The
  // state is shared + persisted (src/shiny.js), so this page always loads in
  // the same "version" the user was last on (home → detail keeps it).
  const { shiny } = useShinyMode();

  // #7 — page-level prev/next on ←/→. The TCG carousel keeps the arrows
  // while focus is INSIDE its card row (it checks the same thing on its
  // side); anywhere else on the page the arrows switch Pokémon.
  useEffect(() => {
    function onKeyDown(event) {
      const target = event.target;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (target?.closest?.(".cards-viewport")) return; // carousel owns the keys
      if (!pokemon?.id) return;
      if (event.key === "ArrowLeft") navigate(`/pokemon/${getPrevId(pokemon.id)}`);
      else if (event.key === "ArrowRight") navigate(`/pokemon/${getNextId(pokemon.id)}`);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [pokemon, navigate]);

  // #1 — reset the scroll to the top whenever the Pokémon (route param)
  // changes. Without this, pressing the next/prev chevrons or ←/→ while deep
  // in the page (e.g. the TCG section) would land you in the *new* Pokémon's
  // section at the same scroll depth instead of its top. Keyed on `name` so
  // it also runs on mount (entering the page from the list) and on back-nav.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [name]);

  useEffect(() => {
    if (pokemon) {
      // one frame later so the transition actually runs from the hidden state
      const frame = requestAnimationFrame(() => setRevealed(true));
      return () => cancelAnimationFrame(frame);
    }
    setRevealed(false);
  }, [pokemon]);

  useEffect(() => {
    let isCurrent = true;

    async function loadPokemon() {
      setIsLoading(true);
      setError(null);
      setPokemon(null);
      setDescription("");
      setEvolutionChain([]);

      try {
        const response = await fetch(`${API_BASE_URL}/pokemon/${name}`);

        if (!response.ok) {
          throw new Error(`No Pokémon named "${name}" — check the spelling.`);
        }

        const data = await response.json();

        if (!isCurrent) return;
        setPokemon(data);

        // Load the neighbor's names so the nav buttons can show them
        try {
          const prevId = getPrevId(data.id);
          const nextId = getNextId(data.id);
          const [prevResponse, nextResponse] = await Promise.all([
            fetch(`${API_BASE_URL}/pokemon/${prevId}`),
            fetch(`${API_BASE_URL}/pokemon/${nextId}`),
          ]);
          if (prevResponse.ok) {
            setPrevName((await prevResponse.json()).name);
          }
          if (nextResponse.ok) {
            setNextName((await nextResponse.json()).name);
          }
        } catch (neighborError) {
          // neighbor names are cosmetic; a failure shouldn't break the page
        }

        // Species data: flavor text (description) + evolution chain
        try {
          const speciesResponse = await fetch(
            `${API_BASE_URL}/pokemon-species/${data.id}`
          );
          if (speciesResponse.ok) {
            const species = await speciesResponse.json();

            // Use the LONGEST English flavor entry: later-generation dex
            // entries are far more detailed than gen-1's, so the hero's
            // description column stays filled out with real Pokédex text
            // instead of a short one-liner. Falls back to any entry if no
            // English one exists.
            const englishEntries = species.flavor_text_entries.filter(
              (entry) => entry.language.name === "en"
            );
            const english =
              (englishEntries.length > 0
                ? englishEntries.reduce((longest, entry) =>
                    entry.flavor_text.length > longest.flavor_text.length
                      ? entry
                      : longest
                  )
                : species.flavor_text_entries[0]) || null;

            if (english) {
              setDescription(
                english.flavor_text
                  .replace(/[\n\f]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              );
            }

            const chainResponse = await fetch(
              species.evolution_chain.url
            );
            if (chainResponse.ok) {
              const chain = await chainResponse.json();
              const chainSpecies = flattenChain(chain.chain);

              // Look up each member's types (needed for the evolution row)
              const typedMembers = await Promise.all(
                chainSpecies.map(async (node) => {
                  const member = {
                    id: getIdFromUrl(node.species.url),
                    name: node.species.name,
                    types: [],
                  };
                  try {
                    const pokemonResponse = await fetch(
                      `${API_BASE_URL}/pokemon/${member.id}`
                    );
                    if (pokemonResponse.ok) {
                      const pokemonData = await pokemonResponse.json();
                      member.types = pokemonData.types.map(
                        (t) => t.type.name
                      );
                    }
                  } catch (typeError) {
                    // keep an empty types array if a member fails to load
                  }
                  return member;
                })
              );

              setEvolutionChain(typedMembers);
            }
          }
        } catch (speciesError) {
          // Missing species data shouldn't break the whole page
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

    loadPokemon();

    return () => {
      isCurrent = false;
    };
  }, [name]);

  if (isLoading) {
    return (
      <div className="detail-page">
        <div className="pod-loading" role="status" aria-label={`Loading ${name}`}>
          <PokeballSpinner size={64} />
          <span>Loading {name}…</span>
        </div>
      </div>
    );
  }
  if (error) return <p className="status status-error">{error}</p>;

  const dexId = pokemon.id;
  const prevId = getPrevId(dexId);
  const nextId = getNextId(dexId);

  // #1 — height (m) + weight (kg) for the profile, shown as "H x.x m · W x kg".
  // PokeAPI uses decimetres / decigrams, so 150 → 15.0 m is wrong; 15.0 m
  // = 150 dm, weight 6000 dg = 60.0 kg.
  const heightM = pokemon.height ? (pokemon.height / 10).toFixed(1) : "0.0";
  const weightKg = pokemon.weight ? (pokemon.weight / 10).toFixed(1) : "0.0";

  // #4 — total of the six base stats, shown as a single summary number
  // under the stat bars.
  const totalBase = pokemon.stats.reduce((sum, s) => sum + s.base_stat, 0);

  // #3 — the cry audio. PokeAPI returns `cries.legacy` and `cries.latest`
  // as plain URL strings (e.g. ".../legacy/25.ogg"), NOT nested arrays —
  // so use the legacy clip directly (it exists for every gen-1 Pokémon)
  // with latest as a fallback. A missing cry → null → the button just
  // doesn't render.
  const cryUrl = pokemon.cries?.legacy || pokemon.cries?.latest || null;

  function playCry() {
    if (!cryUrl) return;
    // A fresh Audio each click re-triggers the same file from the top.
    audioRef.current?.pause();
    audioRef.current = new Audio(cryUrl);
    audioRef.current.play().catch(() => {});
  }

  // #2 — type-tinted wash behind the whole page + the hero panel's
  // gradient stops. The hero is now a three-stop "sunny" gradient of the
  // first type's color: a lightened top, a bright-but-hued middle, and a
  // slightly deeper bottom for depth (kept light, never murky). The soft
  // page wash behind everything stays at 10% of the same color.
  const firstType = pokemon.types[0]?.type.name;
  const heroColor = TYPE_COLORS[firstType] || "#6890F0";
  const pageWash = hexToRgba(heroColor, 0.1);
  const heroMid = lightenColor(heroColor, 0.35);
  const heroTop = lightenColor(heroColor, 0.55);
  const heroBottom = shadeColor(heroMid, 0.8);
  // #14 — the sparkles are a light tint of the type color (brighter + a bit
  // further toward white than the hero's top stop) so they read as "shiny"
  // but stay on-theme with this Pokémon's type.
  const sparkColor = lightenColor(heroColor, 0.62);

  return (
    <div
      className={`detail-page${revealed ? " revealed" : ""}`}
      style={{
        "--wash-color": pageWash,
        "--hero-top": heroTop,
        "--hero-mid": heroMid,
        "--hero-bottom": heroBottom,
        "--spark-color": sparkColor,
      }}
    >
      <div
        className="detail-hero detail-section"
        style={{ "--reveal-delay": "0ms" }}
      >
        {/* #3 (reference) — prev/next pills float in the hero's top corners,
            over the type-colored panel, like the reference's nav buttons */}
        <div className="profile-nav">
          <button
            type="button"
            className="profile-nav-button profile-nav-prev"
            onClick={() => navigate(`/pokemon/${prevId}`)}
            aria-label={`Previous Pokémon (#${String(prevId).padStart(4, "0")})`}
          >
            <span className="profile-nav-arrow" aria-hidden="true">
              ‹
            </span>
            <span className="profile-nav-label">
              {prevName && (
                <span className="profile-nav-name">
                  {capitalize(prevName)}
                </span>
              )}
              <span className="profile-nav-id">
                #{String(prevId).padStart(4, "0")}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="profile-nav-button profile-nav-next"
            onClick={() => navigate(`/pokemon/${nextId}`)}
            aria-label={`Next Pokémon (#${String(nextId).padStart(4, "0")})`}
          >
            <span className="profile-nav-label">
              {nextName && (
                <span className="profile-nav-name">
                  {capitalize(nextName)}
                </span>
              )}
              <span className="profile-nav-id">
                #{String(nextId).padStart(4, "0")}
              </span>
            </span>
            <span className="profile-nav-arrow" aria-hidden="true">
              ›
            </span>
          </button>
        </div>

        <div className="detail-hero-body">
          <div className="detail-art">
            {/* #14 — "shiny" sparkles scattered around the artwork, like a
                shiny encounter. Staggered delays/delays in ART_SPARKS; the
                twinkle itself is pure CSS. */}
            {ART_SPARKS.map((spark, i) => (
              <span
                key={i}
                className="detail-art-spark"
                style={{ ...spark.style, fontSize: spark.size, animationDelay: spark.delay }}
                aria-hidden="true"
              >
                ✦
              </span>
            ))}
            <img
              src={getOfficialArtworkUrl(pokemon.id, shiny)}
              alt={shiny ? `Shiny ${pokemon.name}` : pokemon.name}
              width={200}
              height={200}
            />
          </div>
          <div className="detail-info">
            <div className="detail-name-row">
              <h2 className="pokemon-name-title">{capitalize(pokemon.name)}</h2>
              {cryUrl && (
                <button
                  type="button"
                  className="cry-button"
                  onClick={playCry}
                  aria-label={`Play ${capitalize(pokemon.name)} cry`}
                >
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
                    <path
                      d="M4 9v6h4l5 4V5L8 9H4z"
                      fill="currentColor"
                    />
                    <path
                      d="M16 8.5c1 .9 1 6.1 0 7"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                    <path
                      d="M18.5 6c2.4 2.8 2.4 9.2 0 12"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                </button>
              )}
            </div>
            <span className="pokemon-dex-id">
              #{String(dexId).padStart(4, "0")}
            </span>
            <div className="detail-types">
              {pokemon.types.map((t) => {
                const typeName = t.type.name;
                return (
                  <span
                    key={typeName}
                    className="detail-type-pill"
                    style={{
                      background: TYPE_COLORS[typeName] || "#d8d8d8",
                      color: typeTextColor(typeName),
                    }}
                  >
                    <span className="detail-type-icon">
                      <TypeIcon type={typeName} />
                    </span>
                    {typeName}
                  </span>
                );
              })}
            </div>
            <div className="detail-measurements">
              <span className="measurement">
                <span className="measurement-label">H</span>
                <span className="measurement-value">{heightM} m</span>
              </span>
              <span className="measurement">
                <span className="measurement-label">W</span>
                <span className="measurement-value">{weightKg} kg</span>
              </span>
            </div>
            {pokemon.abilities?.length > 0 && (
              <div className="detail-abilities">
                <span className="detail-abilities-label">Abilities</span>
                <div className="detail-abilities-list">
                  {pokemon.abilities.map((ability) => (
                    <span
                      key={ability.ability.name}
                      className="detail-ability-pill"
                    >
                      {capitalize(ability.ability.name)}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
          {description && (
            <div className="detail-description-card">
              <p className="detail-description">{description}</p>
            </div>
          )}
        </div>
      </div>

      <div className="detail-cols detail-section" style={{ "--reveal-delay": "120ms" }}>
        {evolutionChain.length > 1 && (
          <section className="detail-panel evolution">
            <h3>Evolution</h3>
            <div className="evolution-row">
              {evolutionChain.map((member, index) => {
                // the card for THIS Pokémon lights up in its primary type
                // color (CSS vars below feed .evolution-link.is-current).
                // member.id is a string (getIdFromUrl), pokemon.id a number —
                // normalize before comparing.
                const isCurrent = Number(member.id) === pokemon.id;
                const accent =
                  TYPE_COLORS[member.types[0]] ?? "#e33b2e";
                return (
                  <div key={member.id} className="evolution-member">
                    {index > 0 && <span className="evolution-arrow">→</span>}
                    <Link
                      to={`/pokemon/${member.name}`}
                      className={`evolution-link${isCurrent ? " is-current" : ""}`}
                      style={
                        isCurrent
                          ? {
                              "--evo-accent": accent,
                              "--evo-accent-soft": hexToRgba(accent, 0.14),
                              "--evo-accent-glow": hexToRgba(accent, 0.25),
                            }
                          : undefined
                      }
                    >
                    <img
                      src={getOfficialArtworkUrl(member.id, shiny)}
                      alt={shiny ? `Shiny ${member.name}` : member.name}
                      width={120}
                      height={120}
                    />
                    <span className="evolution-name">
                      {capitalize(member.name)}
                    </span>
                    {member.types.length > 0 && (
                      <span className="evolution-types">
                        {member.types.map((t) => capitalize(t)).join(", ")}
                      </span>
                    )}
                  </Link>
                </div>
                );
              })}
            </div>
          </section>
        )}

        <section className="detail-panel stat-section">
          <h3>Base Stats</h3>
          <ul className="stat-list">
            {pokemon.stats.map((s, index) => {
              const isHP = s.stat.name === "hp";
              const l100 = l100Max(s.base_stat, isHP);
              // fill = how far the current base stat is toward its level-100
              // max, as a percentage (0% base → 0% fill, L100 max → 100%)
              const barPct = Math.round((s.base_stat / l100) * 100);
              return (
                <li key={s.stat.name}>
                  <span className="stat-name">{s.stat.name}</span>
                  <div className="stat-bar">
                    <div
                      className="stat-bar-fill"
                      style={{
                        // #6 — the fill grows from 0 to its value when the
                        // section reveals; the extra delay is this row's
                        // index × 80ms so the bars fill left-to-right
                        width: revealed ? `${barPct}%` : "0%",
                        transitionDelay: `calc(var(--reveal-delay, 0ms) + ${index * 80}ms)`,
                      }}
                    />
                  </div>
                  <span className="stat-value">{s.base_stat}</span>
                  <span className="stat-l100">{l100}</span>
                </li>
              );
            })}
          </ul>
          <div className="stat-total">
            <span className="stat-total-label">Total</span>
            <span className="stat-total-value">{totalBase}</span>
          </div>
        </section>
      </div>

      <div
        className="detail-section"
        style={{ "--reveal-delay": "240ms" }}
      >
        <TypeMatchupPanel types={pokemon.types.map((t) => t.type.name)} />
      </div>

      <div
        className="detail-section"
        id="tcg-cards"
        style={{ "--reveal-delay": "360ms" }}
      >
        <TcgCards dexId={pokemon.id} name={pokemon.name} />
      </div>

      {/* A quiet closing footer (the same Pokéball divider the main page
          uses) so the bottom of the detail page feels finished instead of
          just ending on the TCG panel. */}
      <Footer />
    </div>
  );
}

export default DetailPage;

// #7 — "Weak / Resists / Immune" panel. Shows the attacker types this
// Pokémon is weak to (2x or 4x), resists (0.5x) and is immune to (0x),
// using the static type chart in types.js. A compact two-column grid:
// Weak (left) + Resists (right), Immune underneath if any.
function TypeMatchupPanel({ types }) {
  const { weakTo, resists, immune } = analyzeTypes(types);

  function pills(list, withMult) {
    if (!list || list.length === 0) {
      return <span className="type-panel-none">—</span>;
    }
    return (
      <div className="type-panel-pills">
        {list.map((entry) => {
          const label = entry.type ? capitalize(entry.type) : capitalize(entry);
          return (
            <span
              key={label}
              className="type-panel-pill"
              style={{
                background: TYPE_COLORS[entry.type] || "#d8d8d8",
                color: typeTextColor(entry.type),
              }}
            >
              {label}
              {withMult && (
                <span className="mult">
                  {entry.mult === 0 ? "×0" : `${entry.mult}×`}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <section className="type-panel" aria-label="Type effectiveness">
      <h3>Type Matchups</h3>
      <div className="type-panel-grid">
        <div className="type-panel-col">
          <h4>Weak to</h4>
          {pills(weakTo, true)}
        </div>
        <div className="type-panel-col">
          <h4>Resists</h4>
          {pills(resists, true)}
        </div>
        <div className="type-panel-col type-panel-col-wide">
          <h4>Immune to</h4>
          {immune.length === 0 ? (
            <span className="type-panel-none">No immunities</span>
          ) : (
            pills(immune, true)
          )}
        </div>
      </div>
    </section>
  );
}