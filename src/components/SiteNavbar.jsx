import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import ShinyToggle from "./ShinyToggle.jsx";

// Small helper: scroll to a section id, retrying via rAF until the element
// exists (list data / section may still be mounting). Falls back to top.
function scrollToId(id, maxTries = 60) {
  let tries = 0;
  function step() {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (++tries < maxTries) requestAnimationFrame(step);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }
  step();
}

function SiteNavbar({ isDetailPage }) {
  const navigate = useNavigate();
  const location = useLocation();
  // "top" | "grid" | null — what to scroll to after a route change lands.
  const [pendingScroll, setPendingScroll] = useState(null);

  const isHome = location.pathname === "/";

  const [hidden, setHidden] = useState(false);
  const tickingRef = useRef(false);

  // Main page only: hide the bar the moment the sticky type pill reaches
  // its stuck position (top: 56px) so the two don't stack. The pill
  // doesn't exist on the detail page, so the bar stays visible there.
  useEffect(() => {
    const pill = document.querySelector(".type-navbar");
    if (!pill) {
      setHidden(false);
      return;
    }

    function update() {
      // The pill pins at top: 56px (just under the bar). Retracting the bar
      // 25px *before* that contact moment → fire when the pill's top is at
      // 81px. The bar slides up off-screen (translateY, no fade) and the
      // pill takes its place near the top of the page.
      const near = pill.getBoundingClientRect().top <= 81;
      setHidden((prev) => (prev === near ? prev : near));
      tickingRef.current = false;
    }
    function onScroll() {
      if (!tickingRef.current) {
        tickingRef.current = true;
        requestAnimationFrame(update);
      }
    }

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      setHidden(false);
    };
  }, [isDetailPage]);

  // One shared class on <body> drives the seamless hand-off: the bar fades
  // out while the pill eases up from 56px to 8px (see index.css). Both
  // transition together so it never looks like two separate events.
  useEffect(() => {
    document.body.classList.toggle("site-navbar-hidden", hidden);
    return () => document.body.classList.remove("site-navbar-hidden");
  }, [hidden]);

  useEffect(() => {
    if (!pendingScroll) return;
    const timer = setTimeout(() => {
      if (pendingScroll === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else scrollToId("pokemon-grid");
      setPendingScroll(null);
    }, 80);
    return () => clearTimeout(timer);
  }, [pendingScroll, location]);

  function goHome() {
    if (location.pathname !== "/") {
      navigate("/");
      setPendingScroll("top");
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goTcg() {
    scrollToId("tcg-cards");
  }

  // On the home page the Home button would be a no-op, so we swap it for
  // "Browse", which scrolls straight down to the Pokémon grid section.
  function goBrowse() {
    scrollToId("pokemon-grid");
  }

  return (
    <nav className="site-navbar" aria-label="Site navigation">
      <button className="site-navbar-logo" onClick={goHome} aria-label="Pokédex home">
        <span className="pokeball-logo" aria-hidden="true" />
        <span className="site-navbar-wordmark">Pokédex</span>
      </button>
      <div className="site-navbar-actions">
        {isHome ? (
          /* Already home — the Home button would be a no-op. Fill the slot
             with "Browse" instead: it scrolls down to the Pokémon grid. */
          <button className="site-nav-btn site-nav-btn-browse" onClick={goBrowse}>
            Browse
          </button>
        ) : (
          <button className="site-nav-btn site-nav-btn-home" onClick={goHome}>
            Home
          </button>
        )}
        {isDetailPage && (
          <button className="site-nav-btn site-nav-btn-tcg" onClick={goTcg}>
            TCG Cards
          </button>
        )}
        {isDetailPage && (
          <ShinyToggle variant="bar" />
        )}
      </div>
    </nav>
  );
}

export default SiteNavbar;
