// A spinning Pokéball used as a loading indicator (list + TCG).
// The whole ball spins; the red top half against the white bottom makes
// the rotation actually visible (a single flat color would look frozen).
export default function PokeballSpinner({ size = 56 }) {
  return (
    <div className="pokeball-spinner" role="status" aria-label="Loading">
      <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true">
        <circle cx="50" cy="50" r="42" fill="#FFFDF8" />
        <path d="M8 50 a42 42 0 0 1 84 0 Z" fill="#E33B2E" />
        <rect x="8" y="45" width="84" height="10" fill="#151e2b" />
        <circle cx="50" cy="50" r="13" fill="#FFD800" />
        <circle cx="50" cy="50" r="8" fill="#fffdf8" />
        <circle cx="50" cy="50" r="42" fill="none" stroke="#151e2b" strokeWidth="5" />
      </svg>
    </div>
  );
}
