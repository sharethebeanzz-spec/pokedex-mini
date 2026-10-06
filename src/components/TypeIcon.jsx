// One small monochrome glyph per type, rendered inside the hero's type
// badges (a white icon on a slightly darker disc, like the reference).
// Each glyph is tiny (~11px), so the shapes are deliberately simple and
// recognizable at a glance rather than detailed.
const GLYPHS = {
  normal: (
    <path d="M12 2l2.7 6.3 6.3.6-4.8 4.2 1.4 6.2L12 15.8 6.4 19.5l1.4-6.2L3 9.9l6.3-.6L12 2z" />
  ),
  fire: <path d="M12 2c3 3.5 5 6.5 5 9.5A5 5 0 0 1 7 11.5C7 8.5 10 5.5 12 2z" />,
  water: <path d="M12 2c3.5 4.4 6 7.8 6 11a6 6 0 1 1-12 0c0-3.2 2.5-6.6 6-11z" />,
  grass: <path d="M20 4C11 4 4 11 4 20c9 0 16-7 16-16z" />,
  electric: <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />,
  ice: (
    <g fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
      <path d="M12 2v20" />
      <path d="M3 7l18 10" />
      <path d="M21 7L3 17" />
    </g>
  ),
  fighting: (
    <path d="M2 8h3.5v8H2zM18.5 8H22v8h-3.5zM8 11h8v2H8z" />
  ),
  poison: (
    <path
      fillRule="evenodd"
      d="M12 3a7 7 0 0 0-7 7c0 2.4 1.2 4.2 3 5.4V19h2.5v-2h3V19H16v-3.6c1.8-1.2 3-3 3-5.4a7 7 0 0 0-7-7zM9.5 11a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"
    />
  ),
  ground: (
    <path d="M3 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0v4H3zM3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0v4H3z" />
  ),
  flying: (
    <path d="M2 12c4-4 8-6 10-6 2 0 6 2 10 6-4-2-6-3-10-3s-6 1-10 3z" />
  ),
  psychic: (
    <g fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <path d="M12 2v9" />
      <path d="M5 21c0-6 3-10 7-10s7 4 7 10" />
      <path d="M5 21h14" />
    </g>
  ),
  bug: (
    <g>
      <path d="M12 5c2.2 0 3.5 1.6 3.5 3.5v5.5a3.5 3.5 0 0 1-7 0V8.5C8.5 6.6 9.8 5 12 5z" />
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M9.5 6L7 3.5" />
        <path d="M14.5 6L17 3.5" />
        <path d="M6.5 10H3" />
        <path d="M6.5 14H4" />
        <path d="M6.5 17.5L4 20" />
        <path d="M17.5 10H21" />
        <path d="M17.5 14H20" />
        <path d="M17.5 17.5L20 20" />
      </g>
    </g>
  ),
  rock: <path d="M4 19l6-12 3 5 2-3 5 10H4z" />,
  ghost: <path d="M5 20V11a7 7 0 0 1 14 0v9l-2.5-2-2.5 2-2-2-2 2-2.5-2L5 20z" />,
  dragon: (
    <g fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
      <path d="M6 19c0-4 3-5 6-6s6-2 6-6" />
      <path d="M14.5 5.5L18 7l-1.5 3.5" />
    </g>
  ),
  dark: <path d="M15 3a9 9 0 1 0 6.5 14.5A8 8 0 0 1 15 3z" />,
  steel: <path d="M12 3l7.5 4.5v9L12 21l-7.5-4.5v-9L12 3z" />,
  fairy: (
    <g>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" />
      <path d="M18.5 14.5l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6z" />
    </g>
  ),
};

export default function TypeIcon({ type, size = 11 }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{ fill: "currentColor" }}
    >
      {GLYPHS[type] || GLYPHS.normal}
    </svg>
  );
}
