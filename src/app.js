import { createAssistantMessage, createUserMessage, getLilGResponse } from "./chatEngine.js";
import {
  clearMemories,
  extractMemoryFact,
  formatMemoryList,
  getRelevantMemoryText,
  isClearMemoryRequest,
  isMemoryRecallRequest,
  loadMemories,
  rememberAutomaticFacts,
  rememberFact,
  saveMemories
} from "./memory.js";
import { canSpeak, speakText, stopSpeaking } from "./speech.js";
import {
  createPresetSettings,
  createVoiceOptions,
  getVoicePreset,
  loadVoiceSettings,
  saveVoiceSettings,
  voicePresets
} from "./voiceSettings.js";
import { detectWakePhrase } from "./wakeWord.js";
import { createWebSearchUrl, detectSearchIntent, formatSearchReply, searchInternet } from "./webSearch.js";

const messages = [
  createAssistantMessage(
    "What's up? I'm Lil-G. I can talk back, search the internet, and remember facts on this device. Try \"search the internet for AI news\" or \"remember that I like basketball.\""
  )
];

const elements = {
  form: document.querySelector("[data-chat-form]"),
  input: document.querySelector("[data-chat-input]"),
  install: document.querySelector("[data-install]"),
  memoryList: document.querySelector("[data-memory-list]"),
  clearMemory: document.querySelector("[data-clear-memory]"),
  messages: document.querySelector("[data-chat-messages]"),
  status: document.querySelector("[data-status]"),
  talkBack: document.querySelector("[data-talk-back]"),
  stopSpeech: document.querySelector("[data-stop-speech]"),
  mic: document.querySelector("[data-mic]"),
  wake: document.querySelector("[data-wake]"),
  voicePresets: document.querySelector("[data-voice-presets]"),
  voicePitch: document.querySelector("[data-voice-pitch]"),
  voicePitchValue: document.querySelector("[data-voice-pitch-value]"),
  voiceRate: document.querySelector("[data-voice-rate]"),
  voiceRateValue: document.querySelector("[data-voice-rate-value]")
};

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecognitionActive = false;
let isWakeListening = false;
let isAwaitingWakeCommand = false;
let deferredInstallPrompt;
let memories = loadMemories();
let voiceSettings = loadVoiceSettings();
let availableVoices = [];

renderMessages();
renderMemories();
setupVoiceSettings();
updateStatus();
setupSpeechRecognition();
setupAppInstall();
registerServiceWorker();

elements.form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(elements.input.value);
});

elements.talkBack.addEventListener("change", () => {
  updateStatus();
  if (!elements.talkBack.checked) {
    stopSpeaking();
  }
});

elements.voicePitch.addEventListener("input", () => {
  applyVoiceSettings({
    ...voiceSettings,
    pitch: Number(elements.voicePitch.value)
  });
});

elements.voiceRate.addEventListener("input", () => {
  applyVoiceSettings({
    ...voiceSettings,
    rate: Number(elements.voiceRate.value)
  });
});

elements.stopSpeech.addEventListener("click", () => {
  stopSpeaking();
  setStatus("Speech stopped.");
});

elements.clearMemory.addEventListener("click", () => {
  memories = clearMemories();
  renderMemories();
  const reply = createAssistantMessage("I cleared my saved memories on this device.");
  messages.push(reply);
  renderMessages();
  speakAssistantReply(reply);
  setStatus("Memory cleared.");
});

async function sendMessage(rawInput) {
  const content = rawInput.trim();

  if (!content) {
    setStatus("Type a message first.");
    return;
  }

  const userMessage = createUserMessage(content);
  messages.push(userMessage);
  elements.input.value = "";
  renderMessages();

  const assistantMessage = await buildAssistantReply(content);
  messages.push(assistantMessage);
  renderMessages();
  speakAssistantReply(assistantMessage);
}

async function buildAssistantReply(content) {
  if (isClearMemoryRequest(content)) {
    memories = clearMemories();
    renderMemories();
    return createAssistantMessage("I forgot the memories saved on this device.");
  }

  if (isMemoryRecallRequest(content)) {
    return createAssistantMessage(formatMemoryList(memories));
  }

  const memoryFact = extractMemoryFact(content);

  if (memoryFact) {
    const result = rememberFact(memoryFact, memories);
    memories = result.memories;
    saveMemories(memories);
    renderMemories();

    return createAssistantMessage(
      result.duplicate
        ? `I already remember that ${result.memory.text}.`
        : `Got it. I'll remember that ${result.memory.text}.`
    );
  }

  const automaticMemoryResult = rememberAutomaticFacts(content, memories);

  if (automaticMemoryResult.added.length) {
    memories = automaticMemoryResult.memories;
    saveMemories(memories);
    renderMemories();
  }

  const searchIntent = detectSearchIntent(content);

  if (searchIntent.isSearch) {
    return searchAndReply(searchIntent.query);
  }

  const relevantMemories = getRelevantMemoryText(content, memories);
  const reply = getLilGResponse(content, messages, { relevantMemories });
  const savedMemoryText = formatSavedMemoryText(automaticMemoryResult.added);

  return createAssistantMessage(savedMemoryText ? `${reply}\n\n${savedMemoryText}` : reply);
}

async function searchAndReply(query) {
  setStatus(`Searching the internet for "${query}"...`);

  try {
    const searchResult = await searchInternet(query);
    return createAssistantMessage(formatSearchReply(searchResult), {
      sources: createSources(searchResult)
    });
  } catch {
    const webSearchUrl = createWebSearchUrl(query);
    return createAssistantMessage(
      `I tried to search the internet for "${query}", but I could not reach the search service from this browser. You can open a web search here: ${webSearchUrl}`,
      {
        sources: [
          {
            title: `Search the web for ${query}`,
            url: webSearchUrl
          }
        ]
      }
    );
  }
}

function speakAssistantReply(assistantMessage) {
  if (elements.talkBack.checked) {
    const preset = getVoicePreset(voiceSettings.presetId);
    const didSpeak = speakText(assistantMessage.content, {
      voice: createVoiceOptions(voiceSettings, availableVoices)
    });
    setStatus(
      didSpeak
        ? `Lil-G answered with the ${preset.label} voice.`
        : "Lil-G answered. Speech is not available in this browser."
    );
  } else {
    setStatus("Lil-G answered in chat.");
  }
}

function createSources(searchResult) {
  const resultSources = searchResult.results
    .filter((result) => result.url)
    .map((result) => ({
      title: result.title,
      url: result.url
    }));

  return [
    ...resultSources,
    {
      title: `Search the web for ${searchResult.query}`,
      url: searchResult.webSearchUrl
    }
  ];
}

function acknowledgeWakePhrase() {
  const reply = "I'm listening. What do you want to ask me?";
  messages.push(createAssistantMessage(reply));
  renderMessages();

  if (elements.talkBack.checked) {
    speakText(reply, {
      voice: createVoiceOptions(voiceSettings, availableVoices)
    });
  }

  setStatus("Wake phrase heard. Say your message now.");
}

function formatSavedMemoryText(addedMemories) {
  if (!addedMemories.length) {
    return "";
  }

  const memoryText = addedMemories.map((memory) => memory.text).join("; ");
  return `I saved that to your local profile memory: ${memoryText}.`;
}

function renderMessages() {
  elements.messages.replaceChildren(
    ...messages.map((message) => {
      const item = document.createElement("article");
      item.className = `message message--${message.role}`;

      const label = document.createElement("strong");
      label.textContent = message.role === "assistant" ? "Lil-G" : "You";

      const body = document.createElement("p");
      body.textContent = message.content;

      item.append(label, body);

      if (message.sources?.length) {
        item.append(createSourceList(message.sources));
      }

      return item;
    })
  );

  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function createSourceList(sources) {
  const list = document.createElement("ul");
  list.className = "sources";

  for (const source of sources) {
    const listItem = document.createElement("li");
    const link = document.createElement("a");
    link.href = source.url;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = source.title;
    listItem.append(link);
    list.append(listItem);
  }

  return list;
}

function renderMemories() {
  elements.memoryList.replaceChildren(
    ...memories.map((memory) => {
      const item = document.createElement("li");
      item.textContent = memory.text;
      return item;
    })
  );

  if (!memories.length) {
    const item = document.createElement("li");
    item.textContent = 'No memories yet. Try: "remember that I like basketball."';
    elements.memoryList.append(item);
  }
}

function setupSpeechRecognition() {
  if (!Recognition) {
    elements.mic.disabled = true;
    elements.wake.disabled = true;
    elements.mic.textContent = "Mic unavailable";
    elements.wake.textContent = "Wake unavailable";
    return;
  }

  recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    isRecognitionActive = true;
    elements.mic.classList.add("is-listening");
    setStatus(isWakeListening ? 'Wake listening... Say "Hey Lil-G".' : "Listening...");
  });

  recognition.addEventListener("end", () => {
    isRecognitionActive = false;
    elements.mic.classList.remove("is-listening");
    elements.wake.classList.toggle("is-listening", isWakeListening);

    if (isWakeListening) {
      window.setTimeout(() => startRecognition({ continuous: true }), 250);
    }
  });

  recognition.addEventListener("result", (event) => {
    const result = event.results[event.resultIndex] ?? event.results[0];
    const transcript = result[0].transcript;
    elements.input.value = transcript;
    handleVoiceTranscript(transcript);
  });

  recognition.addEventListener("error", (event) => {
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      isWakeListening = false;
      updateWakeButton();
      setStatus("Microphone permission is blocked. Allow mic access to use voice wake.");
      return;
    }

    setStatus(
      isWakeListening
        ? 'Still wake listening... Say "Hey Lil-G" when you want me.'
        : "I couldn't hear that clearly. Try typing or tap the mic again."
    );
  });

  elements.mic.addEventListener("click", () => {
    isWakeListening = false;
    isAwaitingWakeCommand = false;
    updateWakeButton();
    startRecognition();
  });

  elements.wake.addEventListener("click", () => {
    isWakeListening = !isWakeListening;
    isAwaitingWakeCommand = false;
    updateWakeButton();

    if (isWakeListening) {
      startRecognition({ continuous: true });
      return;
    }

    recognition.stop();
    setStatus("Wake listening stopped.");
  });
}

function setupVoiceSettings() {
  renderVoicePresetButtons();
  syncVoiceControls();
  loadAvailableVoices();

  if (canSpeak() && typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", loadAvailableVoices);
  }
}

function renderVoicePresetButtons() {
  elements.voicePresets.replaceChildren(
    ...voicePresets.map((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "secondary-button voice-preset-button";
      button.dataset.voicePreset = preset.id;
      button.textContent = preset.label;
      button.title = preset.description;
      button.setAttribute("aria-pressed", String(preset.id === voiceSettings.presetId));
      button.addEventListener("click", () => applyVoiceSettings(createPresetSettings(preset.id)));
      return button;
    })
  );
}

function syncVoiceControls() {
  const preset = getVoicePreset(voiceSettings.presetId);

  elements.voicePitch.value = String(voiceSettings.pitch);
  elements.voiceRate.value = String(voiceSettings.rate);
  elements.voicePitchValue.textContent = voiceSettings.pitch.toFixed(2);
  elements.voiceRateValue.textContent = voiceSettings.rate.toFixed(2);

  for (const button of elements.voicePresets.querySelectorAll("[data-voice-preset]")) {
    const isActive = button.dataset.voicePreset === preset.id;
    button.classList.toggle("is-selected", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  }
}

function applyVoiceSettings(nextSettings) {
  voiceSettings = saveVoiceSettings(nextSettings);
  syncVoiceControls();

  if (elements.talkBack.checked) {
    const preset = getVoicePreset(voiceSettings.presetId);
    setStatus(`Talk-back is on with the ${preset.label} voice.`);
  }
}

function loadAvailableVoices() {
  if (!canSpeak() || typeof window.speechSynthesis.getVoices !== "function") {
    availableVoices = [];
    return;
  }

  availableVoices = window.speechSynthesis.getVoices();
}

function handleVoiceTranscript(transcript) {
  const wakeResult = detectWakePhrase(transcript);

  if (isWakeListening) {
    if (wakeResult.isWakePhrase) {
      if (wakeResult.command) {
        isAwaitingWakeCommand = false;
        sendMessage(wakeResult.command);
        return;
      }

      isAwaitingWakeCommand = true;
      acknowledgeWakePhrase();
      return;
    }

    if (isAwaitingWakeCommand) {
      isAwaitingWakeCommand = false;
      sendMessage(transcript);
      return;
    }

    setStatus('Wake listening... Say "Hey Lil-G" to get my attention.');
    return;
  }

  if (wakeResult.isWakePhrase) {
    if (wakeResult.command) {
      sendMessage(wakeResult.command);
      return;
    }

    acknowledgeWakePhrase();
    return;
  }

  sendMessage(transcript);
}

function startRecognition(options = {}) {
  if (!recognition || isRecognitionActive) {
    return;
  }

  recognition.continuous = Boolean(options.continuous);

  try {
    recognition.start();
  } catch {
    setStatus("Voice recognition is already starting. Try again in a moment.");
  }
}

function updateWakeButton() {
  elements.wake.classList.toggle("is-listening", isWakeListening);
  elements.wake.textContent = isWakeListening ? "Stop wake listening" : "Start wake listening";
}

function setupAppInstall() {
  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    elements.install.hidden = false;
  });

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = undefined;
    elements.install.hidden = true;
    setStatus("Lil-G is installed on this device.");
  });

  elements.install.addEventListener("click", async () => {
    if (!deferredInstallPrompt) {
      setStatus("Use your browser menu to add Lil-G to your home screen.");
      return;
    }

    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = undefined;
    elements.install.hidden = true;
    setStatus(choice.outcome === "accepted" ? "Installing Lil-G." : "Install canceled.");
  });
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      setStatus("Lil-G works online, but offline app setup is unavailable.");
    });
  });
}

function updateStatus() {
  if (elements.talkBack.checked && !canSpeak()) {
    setStatus("Talk-back is on, but this browser does not support speech synthesis.");
    return;
  }

  const preset = getVoicePreset(voiceSettings.presetId);
  setStatus(elements.talkBack.checked ? `Talk-back is on with the ${preset.label} voice.` : "Talk-back is off.");
}

function setStatus(message) {
  elements.status.textContent = message;
}
