export const AVATAR_STORAGE_KEY = "lil-g-avatar-v1";

export const avatarOptions = {
  identity: ["boy", "girl", "custom", "no-label"],
  color: ["white", "mint", "blue", "purple", "gold", "pink", "red"],
  shape: ["orb", "soft-square", "star", "diamond", "capsule"],
  hair: ["none", "short", "curls", "long", "spikes"],
  face: ["friendly", "calm", "focused", "playful"],
  body: ["float", "slim", "soft", "strong"],
  clothes: ["glow-suit", "hoodie", "jacket", "robe", "armor"]
};

const defaultAvatarSettings = {
  identity: "custom",
  color: "white",
  shape: "orb",
  hair: "none",
  face: "friendly",
  body: "float",
  clothes: "glow-suit",
  customized: false
};

const commandPatterns = [
  {
    key: "identity",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+(?:a\s+|an\s+)?(boy|girl)\b/i
  },
  {
    key: "identity",
    pattern: /\b(?:identity|gender)\s+(?:is|to)\s+(boy|girl|custom|no[-\s]?label)\b/i
  },
  {
    key: "color",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+(?:color\s+)?(?:to\s+|a\s+|an\s+)?(white|mint|blue|purple|gold|pink|red)\b/i
  },
  {
    key: "color",
    pattern: /\bavatar\s+color\s+(?:is|to)\s+(white|mint|blue|purple|gold|pink|red)\b/i
  },
  {
    key: "shape",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+(?:shape\s+)?(?:to\s+|a\s+|an\s+)?(orb|soft[-\s]?square|star|diamond|capsule)\b/i
  },
  {
    key: "hair",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+hair\s+(?:to\s+|as\s+)?(none|short|curls|curly|long|spikes|spiky)\b/i
  },
  {
    key: "face",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+face\s+(?:to\s+|as\s+)?(friendly|calm|focused|playful)\b/i
  },
  {
    key: "body",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+body\s+(?:to\s+|as\s+)?(float|floating|slim|soft|strong)\b/i
  },
  {
    key: "clothes",
    pattern: /\b(?:make|set|change)\s+(?:my\s+)?avatar\s+(?:clothes|clothing|outfit)\s+(?:to\s+|as\s+)?(glow[-\s]?suit|hoodie|jacket|robe|armor)\b/i
  }
];

export function loadAvatarSettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultAvatarSettings };
  }

  try {
    const rawSettings = storage.getItem(AVATAR_STORAGE_KEY);
    return normalizeAvatarSettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultAvatarSettings };
  }
}

export function saveAvatarSettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeAvatarSettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(AVATAR_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

export function normalizeAvatarSettings(settings = {}) {
  return {
    identity: normalizeOption("identity", settings.identity),
    color: normalizeOption("color", settings.color),
    shape: normalizeOption("shape", settings.shape),
    hair: normalizeOption("hair", settings.hair),
    face: normalizeOption("face", settings.face),
    body: normalizeOption("body", settings.body),
    clothes: normalizeOption("clothes", settings.clothes),
    customized: Boolean(settings.customized)
  };
}

export function applyAvatarUpdate(currentSettings, update) {
  return normalizeAvatarSettings({
    ...currentSettings,
    ...update,
    customized: true
  });
}

export function detectAvatarCommand(input, currentSettings = defaultAvatarSettings) {
  const update = {};

  for (const { key, pattern } of commandPatterns) {
    const match = input.match(pattern);

    if (match) {
      update[key] = normalizeOption(key, normalizeAlias(match[1]));
    }
  }

  const changedKeys = Object.keys(update).filter((key) => update[key] !== currentSettings[key]);

  if (!changedKeys.length) {
    return {
      isAvatarCommand: false,
      settings: normalizeAvatarSettings(currentSettings),
      changedKeys: []
    };
  }

  return {
    isAvatarCommand: true,
    settings: applyAvatarUpdate(currentSettings, update),
    changedKeys
  };
}

export function formatAvatarSummary(settings) {
  const avatar = normalizeAvatarSettings(settings);

  return `${formatOption(avatar.color)} ${formatOption(avatar.shape)} avatar with ${formatOption(
    avatar.hair
  )} hair, a ${formatOption(avatar.face)} face, a ${formatOption(avatar.body)} body style, and ${formatOption(
    avatar.clothes
  )} clothes`;
}

function normalizeOption(key, value) {
  const normalizedValue = normalizeAlias(value);
  const options = avatarOptions[key];

  if (!options.includes(normalizedValue)) {
    return defaultAvatarSettings[key];
  }

  return normalizedValue;
}

function normalizeAlias(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/^curly$/, "curls")
    .replace(/^spiky$/, "spikes")
    .replace(/^floating$/, "float")
    .replace(/^no-label$/, "no-label");
}

function formatOption(value) {
  return value.replace(/-/g, " ");
}
