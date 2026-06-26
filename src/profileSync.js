export const PROFILE_STORAGE_KEY = "lil-g-profile-v1";
export const PROFILE_SYNC_VERSION = 1;

const defaultProfile = {
  displayName: ""
};

export function loadProfile(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultProfile };
  }

  try {
    const rawProfile = storage.getItem(PROFILE_STORAGE_KEY);
    return normalizeProfile(rawProfile ? JSON.parse(rawProfile) : {});
  } catch {
    return { ...defaultProfile };
  }
}

export function saveProfile(profile, storage = globalThis.localStorage) {
  const normalizedProfile = normalizeProfile(profile);

  if (!storage) {
    return normalizedProfile;
  }

  try {
    storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(normalizedProfile));
  } catch {
    return normalizedProfile;
  }

  return normalizedProfile;
}

export function createProfileSyncCode(
  { profile, memories, voiceSettings, replySettings, avatarSettings, screenControlSettings, thinkingSettings },
  options = {}
) {
  const payload = {
    version: PROFILE_SYNC_VERSION,
    createdAt: options.createdAt ?? new Date().toISOString(),
    profile: normalizeProfile(profile),
    memories: Array.isArray(memories) ? memories : [],
    voiceSettings: voiceSettings ?? {},
    replySettings: replySettings ?? {},
    avatarSettings: avatarSettings ?? {},
    screenControlSettings: screenControlSettings ?? {},
    thinkingSettings: thinkingSettings ?? {}
  };

  return encodePayload(payload);
}

export function parseProfileSyncCode(code) {
  try {
    const payload = JSON.parse(decodePayload(code.trim()));

    if (payload.version !== PROFILE_SYNC_VERSION) {
      throw new Error("Unsupported profile sync version.");
    }

    return {
      version: PROFILE_SYNC_VERSION,
      createdAt: String(payload.createdAt ?? ""),
      profile: normalizeProfile(payload.profile),
      memories: Array.isArray(payload.memories) ? payload.memories.filter(isValidMemory) : [],
      voiceSettings: payload.voiceSettings ?? {},
      replySettings: payload.replySettings ?? {},
      avatarSettings: payload.avatarSettings ?? {},
      screenControlSettings: payload.screenControlSettings ?? {},
      thinkingSettings: payload.thinkingSettings ?? {}
    };
  } catch (error) {
    throw new Error("That profile sync code is not valid.");
  }
}

export function normalizeProfile(profile = {}) {
  return {
    displayName: cleanProfileValue(profile.displayName)
  };
}

function encodePayload(payload) {
  const json = JSON.stringify(payload);
  const bytes = new TextEncoder().encode(json);
  let binary = "";

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return base64Encode(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodePayload(code) {
  const normalizedCode = code.replace(/-/g, "+").replace(/_/g, "/");
  const paddedCode = normalizedCode.padEnd(Math.ceil(normalizedCode.length / 4) * 4, "=");
  const binary = base64Decode(paddedCode);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function base64Encode(value) {
  if (typeof btoa === "function") {
    return btoa(value);
  }

  return Buffer.from(value, "binary").toString("base64");
}

function base64Decode(value) {
  if (typeof atob === "function") {
    return atob(value);
  }

  return Buffer.from(value, "base64").toString("binary");
}

function cleanProfileValue(value) {
  return String(value ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 80);
}

function isValidMemory(memory) {
  return Boolean(memory && typeof memory.id === "string" && typeof memory.text === "string");
}
