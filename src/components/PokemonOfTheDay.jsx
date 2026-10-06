import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config.js";
import { capitalize, getOfficialArtworkUrl, getCryUrl } from "../utils.js";
import PokeballSpinner from "./PokeballSpinner.jsx";
import TypeIcon from "./TypeIcon.jsx";
import { TYPE_MOTIFS, DEPTH_LAYERS } from "./typeMotifs.js";
import { useShinyMode } from "../shiny.js";

const MAX_DEX_ID = 100;

// Classic type colors (used for the card theme + type badges)
const TYPE_COLORS = {
  fire: "#F08030",
  water: "#6890F0",
  grass: "#78C850",
  electric: "#F0D024",
  ice: "#98D8D8",
  fighting: "#C03060",
  poison: "#A040A0",
  ground: "#E0C068",
  flying: "#A890F0",
  psychic: "#F85888",
  bug: "#A8B820",
  rock: "#B8A038",
  ghost: "#705898",
  dragon: "#7038F8",
  dark: "#705848",
  steel: "#B8B8D0",
  fairy: "#EE99AC",
};

// Light types that need dark text on top of their badge
const DARK_TEXT_TYPES = new Set([
  "electric",
  "grass",
  "rock",
  "ground",
  "ice",
  "steel",
  "fairy",
  "bug",
]);

// Same Pokémon for everyone on the same day; resets at local midnight.
// The calendar date seeds mulberry32 (same PRNG as typeMotifs.js) so the
// day-to-day rotation is genuinely random — the old `dayNumber % 100`
// version just cycled #1→#100 in a predictable order.
function getTodayDexId() {
  const now = new Date();
  const daySeed =
    now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  let a = daySeed | 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rand(); // discard the first output — it mixes the seed better
  return Math.floor(rand() * MAX_DEX_ID) + 1;
}

// Darken a #rrggbb color (factor 0..1)
function shadeColor(hex, factor) {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.round(((num >> 16) & 255) * factor);
  const g = Math.round(((num >> 8) & 255) * factor);
  const b = Math.round((num & 255) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

// Lighten a #rrggbb color toward white (amount 0..1): the "sunny" top stop
// of the card gradient. amount 0.35 reads bright without washing out the
// type's hue, so every type still keeps its own identity.
function lightenColor(hex, amount) {
  const num = parseInt(hex.slice(1), 16);
  const mix = (channel) => Math.round(channel + (255 - channel) * amount);
  const r = mix((num >> 16) & 255);
  const g = mix((num >> 8) & 255);
  const b = mix(num & 255);
  return `rgb(${r}, ${g}, ${b})`;
}

// #A + #D — textures and depth layers now live in ./typeMotifs.js
// (scattered pseudo-random SVG tiles, see that file's header).

function PokemonOfTheDay() {
  const dexId = getTodayDexId();
  const [pokemon, setPokemon] = useState(null);
  const [description, setDescription] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const cryRef = useRef(null); // current cry audio element (one at a time)

  // Shiny mode: when on, the featured artwork swaps to its shiny form
  // (shared persisted state — same "version" the grid + detail page use).
  const { shiny } = useShinyMode();

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      setIsLoading(true);
      setError(null);
      setPokemon(null);
      setDescription("");

      try {
        const response = await fetch(`${API_BASE_URL}/pokemon/${dexId}`);

        if (!response.ok) {
          throw new Error(`Server responded with status ${response.status}`);
        }

        const data = await response.json();

        if (!isCurrent) return;
        setPokemon(data);

        // Description comes from the species flavor text (same source as the profile)
        try {
          const speciesResponse = await fetch(
            `${API_BASE_URL}/pokemon-species/${dexId}`
          );
          if (speciesResponse.ok && isCurrent) {
            const species = await speciesResponse.json();
            const english =
              species.flavor_text_entries.find(
                (entry) => entry.language.name === "en"
              ) || species.flavor_text_entries[0];
            if (english) {
              setDescription(
                english.flavor_text
                  .replace(/[\n\f]/g, " ")
                  .replace(/\s+/g, " ")
                  .trim()
              );
            }
          }
        } catch (speciesError) {
          // a missing description shouldn't kill the whole card
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

    load();

    return () => {
      isCurrent = false;
    };
  }, [dexId]);

  if (isLoading) {
    return (
      <section className="pod-section">
        <div className="pod-loading" role="status" aria-label="Loading Pokémon of the day">
          <PokeballSpinner size={64} />
          <span>Choosing today's Pokémon…</span>
        </div>
      </section>
    );
  }

  // If the card data fails, the page still shows the list below
  if (error || !pokemon) return null;

  const types = pokemon.types.map((t) => t.type.name);
  const themeColor = TYPE_COLORS[types[0]] ?? "#6890F0";
  // The card's Pokémon cry. PokeAPI returns `cries.legacy` and `cries.latest`
  // (ogg); a missing cry → null → the button just doesn't render. Routed
  // through the jsDelivr mirror of the cries repo (raw.githubusercontent.com
  // is the same flaky host the sprites moved off of).
  const cryUrl = getCryUrl(
    pokemon.cries?.legacy || pokemon.cries?.latest
  );

  function playCry() {
    if (!cryUrl) return;
    cryRef.current?.pause();
    cryRef.current = new Audio(cryUrl);
    cryRef.current.play().catch(() => {});
  }
  // #A — this type's texture motif (falls back to "normal" if unknown).
  // It's passed to CSS via custom properties (--pod-motif / --pod-motif-size)
  // so .pod-card::before can drift it slowly upward on its own layer.
  const motif = TYPE_MOTIFS[types[0]] ?? TYPE_MOTIFS.normal;
  // #D — background stack, top-to-bottom: the three neutral depth layers,
  // then the type gradient underneath it all. The type gradient itself is
  // a three-stop "sunny" fade: a lightened type color at the top, the full
  // type color through the middle, and a slightly darkened-but-still-bright
  // type color at the bottom. No stop ever goes murky, so every type keeps
  // its own identity while the card reads as a bright pop.
  const backgroundStack = [
    DEPTH_LAYERS[0], // top-left spotlight
    DEPTH_LAYERS[1], // halo behind the artwork
    DEPTH_LAYERS[2], // bottom vignette
    `linear-gradient(
      160deg,
      ${lightenColor(themeColor, 0.15)} 0%,
      ${themeColor} 45%,
      ${shadeColor(themeColor, 0.85)} 100%
    )`,
  ];

  return (
    <section className="pod-section">
      <div
        className="pod-card"
        style={{
          backgroundImage: backgroundStack.join(", "),
          backgroundSize: "auto, auto, auto, auto",
          backgroundRepeat: "no-repeat, no-repeat, no-repeat, no-repeat",
          "--pod-motif": motif.bg,
          "--pod-motif-size": motif.size,
        }}
      >
        <img
          className="pod-logo"
          src={`${import.meta.env.BASE_URL}pokemon-logo.svg`}
          alt="Pokémon"
        />
        <div className="pod-content">
          <div className="pod-info">
            <p className="pod-label">Pokémon of the day</p>
            <div className="pod-name-row">
              <h3 className="pod-name">{capitalize(pokemon.name)}</h3>
              <span className="pod-id">
                #{String(dexId).padStart(4, "0")}
              </span>
              {cryUrl && (
                <button
                  type="button"
                  className="pod-cry-button"
                  onClick={playCry}
                  aria-label={`Play ${capitalize(pokemon.name)} cry`}
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true">
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
            <div className="pod-types">
              {types.map((t) => (
                <span
                  key={t}
                  className="pod-type-badge"
                  style={{
                    background: TYPE_COLORS[t] ?? "#6890F0",
                    color: DARK_TEXT_TYPES.has(t) ? "#333" : "white",
                  }}
                >
                  <span className="pod-type-icon" aria-hidden="true">
                    <TypeIcon type={t} size={20} />
                  </span>
                  {capitalize(t)}
                </span>
              ))}
            </div>
            {description && (
              <p className="pod-description">{description}</p>
            )}
            <Link to={`/pokemon/${dexId}`} className="pod-button">
              ⚡ More details
            </Link>
          </div>
          <div className="pod-art">
            <img
              src={getOfficialArtworkUrl(dexId, shiny)}
              alt={shiny ? `Shiny ${pokemon.name}` : pokemon.name}
              width={445}
              height={445}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default PokemonOfTheDay;
