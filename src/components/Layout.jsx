import { Outlet, useLocation } from "react-router-dom";
import Toast from "./Toast.jsx";
import SiteNavbar from "./SiteNavbar.jsx";

function Layout() {
  const location = useLocation();
  // detail routes are /pokemon/<name> — the TCG button only makes sense there
  const isDetailPage = location.pathname.startsWith("/pokemon/");

  return (
    <div className="app">
      {/* #6 — fixed dot-texture layer (see .bg-dots in index.css): behind
          everything, composited, so it never repaints on scroll */}
      <div className="bg-dots" aria-hidden="true" />
      <SiteNavbar isDetailPage={isDetailPage} />
      <main>
        <Outlet />
      </main>
      <Toast />
    </div>
  );
}

export default Layout;