export const THINKING_SETTINGS_STORAGE_KEY = "lil-g-thinking-settings-v1";

const defaultThinkingSettings = {
  enabled: false
};

export function loadThinkingSettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultThinkingSettings };
  }

  try {
    const rawSettings = storage.getItem(THINKING_SETTINGS_STORAGE_KEY);
    return normalizeThinkingSettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultThinkingSettings };
  }
}

export function saveThinkingSettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeThinkingSettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(THINKING_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

export function normalizeThinkingSettings(settings = {}) {
  return {
    enabled: Boolean(settings.enabled)
  };
}
