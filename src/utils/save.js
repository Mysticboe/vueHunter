const STORAGE_KEY = "vue-hunter-save-v1";

// Load the latest local save when the app boots in the browser.
export function loadGame() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn("Unable to parse saved game.", error);
    return null;
  }
}

// Persist the full store snapshot because the game is entirely client-side.
export function saveGame(state) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

// Remove the save when the player chooses to fully reset the run.
export function clearGameSave() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(STORAGE_KEY);
}
