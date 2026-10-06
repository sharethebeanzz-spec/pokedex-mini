import { Link } from "react-router-dom";
import PokeballSpinner from "../components/PokeballSpinner.jsx";

// #12 — a friendly 404 for unknown routes, instead of a blank page.
// A big "404" + a short, warm message + a back-to-home pill.
function NotFoundPage() {
  return (
    <div className="not-found">
      <PokeballSpinner size={64} />
      <p className="not-found-title">404</p>
      <p className="not-found-sub">
        This page ran off like a wild Pokémon. Let's get you back to the list.
      </p>
      <Link to="/" className="not-found-button">
        Back to the Pokédex
      </Link>
    </div>
  );
}

export default NotFoundPage;
