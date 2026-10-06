// Shiny mode: a site-wide "show shiny forms" toggle, persisted in
// localStorage so it survives reloads and carries between the home page and
// the Pokémon detail page (the last version you were on is what loads).
// A custom window event keeps every mounted consumer in sync without prop
// drilling — same pattern as favorites.js.

import { useState, useEffect, useCallback } from "react";
import { playShinySound } from "./shinySound.js";

const STORAGE_KEY = "pokedex:shiny";
const CHANGE_EVENT = "pokedex:shiny-change";

function read() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function write(shiny) {
  try {
    window.localStorage.setItem(STORAGE_KEY, shiny ? "1" : "0");
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // localStorage unavailable (private mode etc.) → in-memory only
  }
}

export function getShiny() {
  return typeof window === "undefined" ? false : read();
}

// Subscribes to shiny changes; returns the current boolean and a toggle().
// Stored as state so consumers re-render when the mode flips.
export function useShinyMode() {
  const [shiny, setShiny] = useState(read);

  useEffect(() => {
    function sync() {
      setShiny(read());
    }
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback(() => {
    const next = !read();
    write(next);
    setShiny(next);
    playShinySound(next); // chime up on "on", blip down on "off"
  }, []);

  return { shiny, toggle };
}
