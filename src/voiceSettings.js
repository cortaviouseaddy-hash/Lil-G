export const VOICE_SETTINGS_STORAGE_KEY = "lil-g-voice-settings-v1";

export const voicePresets = [
  {
    id: "balanced",
    label: "Balanced",
    description: "A clear everyday voice.",
    pitch: 1,
    rate: 1,
    voiceHints: ["Google US English", "Samantha", "Microsoft Aria"]
  },
  {
    id: "warm",
    label: "Warm",
    description: "Lower and calmer for relaxed replies.",
    pitch: 0.82,
    rate: 0.9,
    voiceHints: ["Google UK English Female", "Karen", "Microsoft Jenny"]
  },
  {
    id: "bright",
    label: "Bright",
    description: "Higher energy and a little quicker.",
    pitch: 1.28,
    rate: 1.08,
    voiceHints: ["Google US English", "Tessa", "Microsoft Michelle"]
  },
  {
    id: "deep",
    label: "Deep",
    description: "Lower pitch with a steady pace.",
    pitch: 0.62,
    rate: 0.88,
    voiceHints: ["Google UK English Male", "Daniel", "Microsoft David"]
  },
  {
    id: "quick",
    label: "Quick",
    description: "Fast, short-response style.",
    pitch: 1.05,
    rate: 1.28,
    voiceHints: ["Google US English", "Alex", "Microsoft Mark"]
  },
  {
    id: "robotic",
    label: "Robotic",
    description: "A low, synthetic-sounding robot style.",
    pitch: 0.55,
    rate: 0.78,
    voiceHints: ["Zarvox", "Fred", "Google UK English Male", "Microsoft David"]
  }
];

const defaultVoiceSettings = {
  presetId: "balanced",
  pitch: 1,
  rate: 1
};

export function loadVoiceSettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultVoiceSettings };
  }

  try {
    const rawSettings = storage.getItem(VOICE_SETTINGS_STORAGE_KEY);
    return normalizeVoiceSettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultVoiceSettings };
  }
}

export function saveVoiceSettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeVoiceSettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(VOICE_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

export function normalizeVoiceSettings(settings = {}) {
  const preset = getVoicePreset(settings.presetId);

  return {
    presetId: preset.id,
    pitch: clampNumber(settings.pitch ?? preset.pitch, 0.4, 1.8),
    rate: clampNumber(settings.rate ?? preset.rate, 0.65, 1.45)
  };
}

export function getVoicePreset(presetId) {
  return voicePresets.find((preset) => preset.id === presetId) ?? voicePresets[0];
}

export function createPresetSettings(presetId) {
  const preset = getVoicePreset(presetId);

  return normalizeVoiceSettings({
    presetId: preset.id,
    pitch: preset.pitch,
    rate: preset.rate
  });
}

export function createVoiceOptions(settings, availableVoices = []) {
  const normalizedSettings = normalizeVoiceSettings(settings);
  const preset = getVoicePreset(normalizedSettings.presetId);

  return {
    pitch: normalizedSettings.pitch,
    rate: normalizedSettings.rate,
    volume: 1,
    voice: pickPresetVoice(preset, availableVoices)
  };
}

function pickPresetVoice(preset, availableVoices) {
  if (!Array.isArray(availableVoices) || !availableVoices.length) {
    return undefined;
  }

  const englishVoices = availableVoices.filter((voice) => /^en\b/i.test(voice.lang ?? ""));
  const voices = englishVoices.length ? englishVoices : availableVoices;

  for (const hint of preset.voiceHints) {
    const matchedVoice = voices.find((voice) => voice.name?.toLowerCase().includes(hint.toLowerCase()));

    if (matchedVoice) {
      return matchedVoice;
    }
  }

  return voices[0];
}

function clampNumber(value, min, max) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return min;
  }

  return Math.min(max, Math.max(min, number));
}
