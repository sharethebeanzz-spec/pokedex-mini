export const API_BASE_URL = "https://pokeapi.co/api/v2";
// Same PokeAPI sprite repo, but served through the jsDelivr CDN instead of
// raw.githubusercontent.com (which is flaky/blocked on many connections).
// Verified byte-identical to the raw-GitHub source for the same IDs.
export const SPRITE_BASE_URL =
  "https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/pokemon";

// TCGdex REST API (English) — source of official Pokémon TCG card data
export const TCGDEX_API_URL = "https://api.tcgdex.net/v2/en/cards";