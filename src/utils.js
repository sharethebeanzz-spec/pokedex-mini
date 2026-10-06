import { SPRITE_BASE_URL } from "./config.js";

export function getIdFromUrl(url) {
  // url looks like "https://pokeapi.co/api/v2/pokemon/25/"
  const parts = url.split("/").filter(Boolean);
  return parts[parts.length - 1];
}

export function capitalize(name) {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export function getSpriteUrl(id, shiny = false) {
  // Shiny forms live under a parallel "shiny/" path in the sprites repo.
  const folder = shiny ? "shiny" : "";
  return folder
    ? `${SPRITE_BASE_URL}/${folder}/${id}.png`
    : `${SPRITE_BASE_URL}/${id}.png`;
}

// Official artwork (the Pokedex "official" pictures) for a national dex id
export function getOfficialArtworkUrl(id, shiny = false) {
  const folder = shiny ? "shiny" : "";
  return folder
    ? `${SPRITE_BASE_URL}/other/official-artwork/${folder}/${id}.png`
    : `${SPRITE_BASE_URL}/other/official-artwork/${id}.png`;
}

// PokeAPI hands back cry files on raw.githubusercontent.com, which is flaky
// on many connections (same reason the sprites moved to the CDN). Rewrite
// the known cry-URL shape to the jsDelivr mirror of the same repo.
export function getCryUrl(url) {
  if (!url) return null;
  return url.replace(
    "https://raw.githubusercontent.com/PokeAPI/cries/main/",
    "https://cdn.jsdelivr.net/gh/PokeAPI/cries@main/"
  );
}

// #2 — rgba() string for a #rrggbb hex + alpha. Used for the detail page's
// type-tinted background wash.
export function hexToRgba(hex, alpha) {
  const num = parseInt(hex.slice(1), 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}