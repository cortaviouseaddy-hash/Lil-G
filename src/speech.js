const defaultVoiceOptions = {
  rate: 1,
  pitch: 1,
  volume: 1
};

export function canSpeak(synth = globalThis.speechSynthesis) {
  return Boolean(synth);
}

export function speakText(text, options = {}) {
  const synth = options.synth ?? globalThis.speechSynthesis;
  const Utterance = options.Utterance ?? globalThis.SpeechSynthesisUtterance;

  if (!text || !canSpeak(synth) || typeof Utterance !== "function") {
    return false;
  }

  if (options.cancelCurrent !== false && typeof synth.cancel === "function") {
    synth.cancel();
  }

  const utterance = new Utterance(text);
  const voiceOptions = { ...defaultVoiceOptions, ...options.voice };

  utterance.rate = voiceOptions.rate;
  utterance.pitch = voiceOptions.pitch;
  utterance.volume = voiceOptions.volume;

  if (voiceOptions.voice) {
    utterance.voice = voiceOptions.voice;
  }

  synth.speak(utterance);
  return true;
}

export function stopSpeaking(synth = globalThis.speechSynthesis) {
  if (!canSpeak(synth) || typeof synth.cancel !== "function") {
    return false;
  }

  synth.cancel();
  return true;
}
