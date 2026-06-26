export const DEFAULT_ASSISTANT_NAME = "Lil-G";

const renamePatterns = [
  /^\s*(?:call yourself|rename yourself(?:\s+to)?|your name is|i call you|i'll call you|i will call you)\s+(.+?)\s*$/i,
  /^\s*(?:change|set)\s+(?:your|my assistant'?s?)\s+name\s+to\s+(.+?)\s*$/i,
  /^\s*from now on (?:you are|you're|your name is)\s+(.+?)\s*$/i
];

export function normalizeAssistantName(value) {
  return String(value ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/[.?!]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 40);
}

export function detectAssistantRenameCommand(input) {
  const content = input.trim();

  if (!content) {
    return { isRename: false, name: "" };
  }

  for (const pattern of renamePatterns) {
    const match = content.match(pattern);

    if (match) {
      const name = normalizeAssistantName(match[1]);

      if (name) {
        return {
          isRename: true,
          name
        };
      }
    }
  }

  return { isRename: false, name: "" };
}

export function formatAssistantRenameReply(name) {
  return `Got it. Call me ${name}. Say "Hey ${name}" or just "${name}" when the floating orb is up and I will respond.`;
}

export function formatWakePhraseHint(assistantName = DEFAULT_ASSISTANT_NAME) {
  const name = normalizeAssistantName(assistantName) || DEFAULT_ASSISTANT_NAME;
  return `Say "Hey ${name}" to get my attention.`;
}

export function formatOrbWakeHint(assistantName = DEFAULT_ASSISTANT_NAME) {
  const name = normalizeAssistantName(assistantName) || DEFAULT_ASSISTANT_NAME;
  return `Say "${name}" or "Hey ${name}" and I will answer out loud.`;
}

export function mentionsAssistantName(transcript, assistantName = DEFAULT_ASSISTANT_NAME) {
  const normalizedTranscript = transcript.trim().toLowerCase();
  const normalizedName = normalizeAssistantName(assistantName).toLowerCase();

  if (!normalizedTranscript || !normalizedName) {
    return false;
  }

  const pattern = new RegExp(`\\b${nameToPattern(normalizedName)}\\b`, "i");
  return pattern.test(normalizedTranscript);
}

export function stripAssistantNamePrefix(transcript, assistantName = DEFAULT_ASSISTANT_NAME) {
  const normalizedName = normalizeAssistantName(assistantName);

  if (!normalizedName) {
    return transcript.trim();
  }

  const pattern = new RegExp(
    `^\\s*(?:hey\\s+)?${nameToPattern(normalizedName)}[\\s,.:;!?-]*`,
    "i"
  );

  return transcript.replace(pattern, "").trim();
}

function nameToPattern(name) {
  return name
    .split(/\s+/)
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("\\s+");
}
