"use client";

import { useCallback, useSyncExternalStore } from "react";

const STORAGE_KEY = "ala:favourites";
const FAVOURITES_EVENT = "ala:favourites-changed";
const DEFAULT_FAVOURITES = ["/dashboard", "/accounting-inventory/masters"];

function readFavourites(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : DEFAULT_FAVOURITES;
  } catch {
    return DEFAULT_FAVOURITES;
  }
}

function writeFavourites(favourites: string[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(favourites));
  window.dispatchEvent(new Event(FAVOURITES_EVENT));
}

function subscribe(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(FAVOURITES_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(FAVOURITES_EVENT, onStoreChange);
  };
}

/**
 * Pinned-shortcut state, persisted to localStorage per browser (no backend
 * yet — this is the "mock pins" the shell renders under Favourites).
 */
export function useFavourites() {
  const favourites = useSyncExternalStore(
    subscribe,
    readFavourites,
    () => DEFAULT_FAVOURITES,
  );

  const toggleFavourite = useCallback((href: string) => {
    const current = readFavourites();
    const next = current.includes(href)
      ? current.filter((item) => item !== href)
      : [...current, href];
    writeFavourites(next);
  }, []);

  const isFavourite = useCallback(
    (href: string) => favourites.includes(href),
    [favourites],
  );

  return { favourites, toggleFavourite, isFavourite };
}
