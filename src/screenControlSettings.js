export const SCREEN_CONTROL_SETTINGS_STORAGE_KEY = "lil-g-screen-control-settings-v1";

const defaultScreenControlSettings = {
  enabled: false
};

export function loadScreenControlSettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultScreenControlSettings };
  }

  try {
    const rawSettings = storage.getItem(SCREEN_CONTROL_SETTINGS_STORAGE_KEY);
    return normalizeScreenControlSettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultScreenControlSettings };
  }
}

export function saveScreenControlSettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeScreenControlSettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(SCREEN_CONTROL_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

export function normalizeScreenControlSettings(settings = {}) {
  return {
    enabled: Boolean(settings.enabled)
  };
}
