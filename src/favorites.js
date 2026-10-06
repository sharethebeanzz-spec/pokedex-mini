// Favorites: a small localStorage-backed set of Pokémon names. Persisted
// across reloads; a custom window event keeps every mounted component in
// sync without prop drilling. Used by the heart toggle on grid cards (#3)
// and the "Favorites" filter chip in the navbar.

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "pokedex:favorites";
const STORAGE_EVENT = "pokedex:favorites-change";

function read() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw);
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function write(set) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  } catch {
    // localStorage unavailable (private mode etc.) → in-memory only
  }
}

function loadInitial() {
  return typeof window === "undefined" ? new Set() : read();
}

export function getFavorites() {
  return loadInitial();
}

export function isFavorite(name) {
  return loadInitial().has(name);
}

export function toggleFavorite(name) {
  const set = loadInitial();
  if (set.has(name)) set.delete(name);
  else set.add(name);
  write(set);
  return set.has(name); // true if now favorited
}

// Subscribes to favorite changes; returns the current Set and a
// toggle(name) that updates it. The Set is stored as state so consumers
// re-render on change.
export function useFavorites() {
  const [favorites, setFavorites] = useState(loadInitial);

  useEffect(() => {
    function sync(event) {
      // The storage event fires from other tabs; read the fresh value.
      setFavorites(event && event.key === STORAGE_KEY ? read() : read());
    }
    window.addEventListener(STORAGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(STORAGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((name) => {
    toggleFavorite(name);
    setFavorites(read());
  }, []);

  return { favorites, toggle };
}
