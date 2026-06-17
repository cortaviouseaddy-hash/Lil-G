const wakePhrasePattern =
  /\b(?:hey\s+)?(?:lil[\s-]*g|little\s+g|lil\s+gee|little\s+gee)\b[\s,.:;!?-]*/i;

export function detectWakePhrase(transcript) {
  const normalizedTranscript = transcript.trim();

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

export function isWakePhrase(transcript) {
  return detectWakePhrase(transcript).isWakePhrase;
}
