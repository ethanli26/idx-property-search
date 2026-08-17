import { useSyncExternalStore, useCallback } from "react";

const STORAGE_KEY = "idx.favorites";

function readStored() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    //anything hand-edited or written by an older version is discarded rather
    //than trusted, so a corrupt entry cannot break every page that reads it
    return Array.isArray(parsed)
      ? parsed.filter((id) => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

//One list at module scope rather than state inside the hook. Every component
//calling useFavorites reads this same array, which is what lets a heart toggled
//on a card move the count in the header in the same render.
let favoriteIds = [];
const listeners = new Set();

//Re-reads the saved list and notifies subscribers. Called once below to hydrate
//on load, and again whenever another tab writes to the same key.
export function syncFromStorage() {
  favoriteIds = readStored();
  listeners.forEach((listener) => listener());
}

syncFromStorage();

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

//useSyncExternalStore compares snapshots by reference, so this must return the
//cached array and never a fresh one, or React re-renders forever
function getSnapshot() {
  return favoriteIds;
}

function commit(next) {
  favoriteIds = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    //storage can be full or disabled; the interaction should still work for
    //this session rather than throwing under the user's click
  }
  listeners.forEach((listener) => listener());
}

//another tab changing favorites should be reflected here, not silently diverge
if (typeof window !== "undefined") {
  window.addEventListener("storage", (event) => {
    if (event.key === STORAGE_KEY) syncFromStorage();
  });
}

export function toggleFavorite(listingId) {
  const key = String(listingId);
  commit(
    favoriteIds.includes(key)
      ? favoriteIds.filter((id) => id !== key)
      : [...favoriteIds, key]
  );
}

export function clearFavorites() {
  commit([]);
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const isFavorite = useCallback(
    (listingId) => ids.includes(String(listingId)),
    [ids]
  );

  return {
    favoriteIds: ids,
    count: ids.length,
    isFavorite,
    toggle: toggleFavorite,
    clear: clearFavorites,
  };
}
