// Shared Pokémon type metadata: official type colors + which types need
// dark text for contrast. Reused by the type-filter navbar.

export const TYPE_COLORS = {
  normal: "#9D9D9D",
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

// Light types where dark text reads better than white on the type color
export const DARK_TEXT_TYPES = new Set([
  "normal",
  "electric",
  "grass",
  "rock",
  "ground",
  "ice",
  "steel",
  "fairy",
  "bug",
]);

// Only the types that exist among dex #0001–#0100 (gen 1 has no dragon or
// dark type, so those are intentionally omitted).
export const ALL_TYPES = [
  "normal",
  "fire",
  "water",
  "grass",
  "electric",
  "ice",
  "fighting",
  "poison",
  "ground",
  "flying",
  "psychic",
  "bug",
  "rock",
  "ghost",
  "steel",
  "fairy",
];

// Text color that reads well on top of a type-colored background
export function typeTextColor(type) {
  return DARK_TEXT_TYPES.has(type) ? "#222" : "#fff";
}

// Defensive type chart: for each type, the types it is weak to (2x),
// resists (0.5x) and is immune to (0x). Full 18-type chart (used for the
// detail-page "Weak / Resists / Immune" panel, #7).
const TYPE_DEFENSIVE = {
  normal:   { weakTo: ["fighting"], resists: [], immune: [] },
  fire:     { weakTo: ["water", "ground", "rock"], resists: ["fire", "grass", "ice", "bug", "steel"], immune: [] },
  water:    { weakTo: ["grass", "electric"], resists: ["fire", "water", "ice", "steel"], immune: [] },
  grass:    { weakTo: ["fire", "ice", "poison", "flying", "bug"], resists: ["water", "ground", "grass", "steel"], immune: [] },
  electric: { weakTo: ["ground"], resists: ["electric", "flying", "steel"], immune: [] },
  ice:      { weakTo: ["fire", "fighting", "rock", "ground"], resists: ["ice"], immune: [] },
  fighting: { weakTo: ["flying", "psychic", "fairy"], resists: ["normal", "rock", "steel"], immune: [] },
  poison:   { weakTo: ["ground", "psychic"], resists: ["poison"], immune: [] },
  ground:   { weakTo: ["grass", "ice"], resists: ["poison", "rock", "steel"], immune: [] },
  flying:   { weakTo: ["electric", "ice", "rock"], resists: ["grass", "fighting", "bug"], immune: [] },
  psychic:  { weakTo: ["bug", "ghost", "dark"], resists: ["fighting", "poison"], immune: [] },
  bug:      { weakTo: ["fire", "flying", "rock", "ghost"], resists: ["grass", "fighting", "ground"], immune: [] },
  rock:     { weakTo: ["water", "grass", "fighting", "ground", "steel"], resists: ["normal", "fire", "ice", "flying"], immune: [] },
  ghost:    { weakTo: ["ghost", "dark"], resists: ["poison", "ghost"], immune: ["fighting"] },
  dragon:   { weakTo: ["ice", "dragon", "fairy"], resists: [], immune: [] },
  dark:     { weakTo: ["fighting", "bug"], resists: ["ghost", "dark"], immune: ["psychic"] },
  steel:    { weakTo: ["fire", "fighting", "ground"], resists: ["normal", "grass", "ice", "flying", "psychic", "bug", "rock", "steel"], immune: ["poison"] },
  fairy:    { weakTo: ["poison", "steel"], resists: ["fighting", "bug", "dark"], immune: ["dragon"] },
};

// Combine a Pokémon's types into its defensive multipliers. Returns
// { weakTo, resists, immune, neutral } where each is an array of
// { type, mult } (mult = 2 or 4 for weakTo). Multi-type stacking is the
// product of each type's multiplier against the attacker.
export function analyzeTypes(types) {
  const weakTo = [];
  const resists = [];
  const immune = [];
  const neutral = [];

  for (const attacker of Object.keys(TYPE_DEFENSIVE)) {
    let mult = 1;
    for (const t of types) {
      const d = TYPE_DEFENSIVE[t];
      if (!d) continue;
      if (d.weakTo.includes(attacker)) mult *= 2;
      else if (d.resists.includes(attacker)) mult *= 0.5;
      else if (d.immune.includes(attacker)) mult = 0;
      // same-type / otherwise → 1 (no change)
    }
    if (mult === 0) immune.push({ type: attacker, mult });
    else if (mult > 1) weakTo.push({ type: attacker, mult });
    else if (mult < 1) resists.push({ type: attacker, mult });
    else neutral.push({ type: attacker });
  }

  return { weakTo, resists, immune, neutral };
}
