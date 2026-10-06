// E — the closing footer for the bottom of the page. A small red-and-white Pokéball
// divider + one caption line, centered. Fills the "scroll ends in a grey
// void" so the list page feels finished instead of abruptly cut off.
// Kept intentionally quiet (small, low-contrast) so it's a soft landing,
// not a second hero.
function Footer() {
  return (
    <footer className="site-footer">
      <div className="site-footer-divider" aria-hidden="true">
        <span className="site-footer-line" />
        <svg viewBox="0 0 100 100" width="26" height="26">
          <circle cx="50" cy="50" r="42" fill="#FFFDF8" />
          <path d="M8 50 a42 42 0 0 1 84 0 Z" fill="#E33B2E" />
          <rect x="8" y="45" width="84" height="10" fill="#151e2b" />
          <circle cx="50" cy="50" r="13" fill="#FFD800" />
          <circle cx="50" cy="50" r="8" fill="#fffdf8" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="#151e2b" strokeWidth="5" />
        </svg>
        <span className="site-footer-line" />
      </div>
      <p className="site-footer-caption">Mini Pokédex · 100 Pokémon, Gen 1</p>
    </footer>
  );
}

export default Footer;
