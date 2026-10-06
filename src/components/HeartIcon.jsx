// A small heart used on the grid cards' favorite toggle (#3).
// `active` (filled) = favorited; unfilled = not yet. Clicking the whole
// button (not the <Link>) toggles favorites without navigating.
export default function HeartIcon({
  active = false,
  size = 22,
  // default fill when not favorited; the card passes a visible grey so the
  // "off" heart is still findable on a white card, while the navbar keeps
  // the original near-transparent white.
  inactiveFill = "rgba(255,255,255,0.75)",
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      aria-hidden="true"
      style={{
        fill: active ? "#e33b2e" : inactiveFill,
        stroke: "#fff",
        strokeWidth: 1.5,
        transition: "transform 0.15s ease",
      }}
    >
      <path
        d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
      />
    </svg>
  );
}
