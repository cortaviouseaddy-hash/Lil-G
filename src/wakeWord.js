import { DEFAULT_ASSISTANT_NAME, normalizeAssistantName } from "./assistantName.js";

const defaultAliasPatterns = ["lil[\\s-]*g", "little\\s+g", "lil\\s+gee", "little\\s+gee"];

export function buildWakePhrasePattern(assistantName = DEFAULT_ASSISTANT_NAME) {
  const aliases = new Set(defaultAliasPatterns);
  const customPattern = assistantNameToPattern(assistantName);

  if (customPattern) {
    aliases.add(customPattern);
  }

  return new RegExp(`\\b(?:hey\\s+)?(?:${[...aliases].join("|")})\\b[\\s,.:;!?-]*`, "i");
}

export function detectWakePhrase(transcript, options = {}) {
  const normalizedTranscript = transcript.trim();
  const assistantName = normalizeAssistantName(options.assistantName) || DEFAULT_ASSISTANT_NAME;
  const wakePhrasePattern = buildWakePhrasePattern(assistantName);

  if (!normalizedTranscript) {
    return {
      isWakePhrase: false,
      command: ""
    };
  }

  const match = normalizedTranscript.match(wakePhrasePattern);

  if (!match) {
    return {
      isWakePhrase: false,
      command: normalizedTranscript
    };
  }

  return {
    isWakePhrase: true,
    command: normalizedTranscript.slice(match.index + match[0].length).trim()
  };
}

export function isWakePhrase(transcript, options = {}) {
  return detectWakePhrase(transcript, options).isWakePhrase;
}

function assistantNameToPattern(name) {
  const normalized = normalizeAssistantName(name).toLowerCase();

  if (!normalized || normalized === "lil-g") {
    return "";
  }

  return normalized
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}
