import {STORAGE_KEY} from './map-state.js';

export const TAB_DRAFT_KEY = `${STORAGE_KEY}:tab`;

function readStorage(browser, area, key) {
  try { return browser[area].getItem(key); }
  catch { return undefined; }
}

export function openDraftStorage(browser = window, storageKey = STORAGE_KEY) {
  const tabKey = `${storageKey}:tab`;
  let shared = readStorage(browser, 'localStorage', storageKey);
  const tab = readStorage(browser, 'sessionStorage', tabKey);
  let tabOnly = tab != null;
  let saved = null;
  let invalid = false;
  try {
    saved = JSON.parse(tab ?? shared ?? 'null');
  } catch {
    invalid = true;
    tabOnly = true;
  }

  return {
    saved,
    invalid,
    status: tab != null && !invalid ? 'tab' : shared === undefined ? 'unavailable' : 'shared',
    save(serialized) {
      if (!tabOnly) {
        try {
          const storage = browser.localStorage;
          if (storage.getItem(storageKey) === shared) {
            storage.setItem(storageKey, serialized);
            shared = serialized;
            return 'shared';
          }
        } catch {
          // The tab can retain a draft when shared storage is unavailable.
        }
        tabOnly = true;
      }
      try {
        browser.sessionStorage.setItem(tabKey, serialized);
        return 'tab';
      } catch {
        return 'unavailable';
      }
    },
  };
}
