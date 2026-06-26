export const FLOATING_ORB_SETTINGS_STORAGE_KEY = "lil-g-floating-orb-settings-v1";

const defaultFloatingOrbSettings = {
  enabled: false,
  autoWakeOnMinimize: true,
  preferPictureInPicture: true,
  minimized: false,
  x: null,
  y: null
};

export function loadFloatingOrbSettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultFloatingOrbSettings };
  }

  try {
    const rawSettings = storage.getItem(FLOATING_ORB_SETTINGS_STORAGE_KEY);
    return normalizeFloatingOrbSettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultFloatingOrbSettings };
  }
}

export function saveFloatingOrbSettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeFloatingOrbSettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(FLOATING_ORB_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

export function normalizeFloatingOrbSettings(settings = {}) {
  return {
    enabled: Boolean(settings.enabled),
    autoWakeOnMinimize: settings.autoWakeOnMinimize !== false,
    preferPictureInPicture: settings.preferPictureInPicture !== false,
    minimized: Boolean(settings.minimized),
    x: normalizeCoordinate(settings.x),
    y: normalizeCoordinate(settings.y)
  };
}

function normalizeCoordinate(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
