import { createAssistantMessage, createUserMessage, getLilGResponse } from "./chatEngine.js";
import { detectActionIntent, formatActionReply, getLaunchTargets } from "./appActions.js";
import {
  applyAvatarUpdate,
  avatarOptions,
  detectAvatarCommand,
  formatAvatarSummary,
  loadAvatarSettings,
  saveAvatarSettings
} from "./avatarSettings.js";
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
import {
  createProfileSyncCode,
  loadProfile,
  parseProfileSyncCode,
  saveProfile
} from "./profileSync.js";
import {
  handleRaidListInput,
  isRaidListInput,
  loadRaidList,
  saveRaidList
} from "./raidList.js";
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
import {
  createWebSearchUrl,
  detectKnowledgeQuestion,
  detectSearchIntent,
  formatSearchReply,
  searchInternet
} from "./webSearch.js";

const REPLY_SETTINGS_STORAGE_KEY = "lil-g-reply-settings-v1";
const defaultReplySettings = {
  length: "medium"
};

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
  voiceRateValue: document.querySelector("[data-voice-rate-value]"),
  replyLength: document.querySelector("[data-reply-length]"),
  profileName: document.querySelector("[data-profile-name]"),
  saveProfile: document.querySelector("[data-save-profile]"),
  exportProfile: document.querySelector("[data-export-profile]"),
  copyProfile: document.querySelector("[data-copy-profile]"),
  profileSyncCode: document.querySelector("[data-profile-sync-code]"),
  importProfileCode: document.querySelector("[data-import-profile-code]"),
  importProfile: document.querySelector("[data-import-profile]"),
  quickLaunch: document.querySelector("[data-quick-launch]"),
  screenShare: document.querySelector("[data-screen-share]"),
  screenStop: document.querySelector("[data-screen-stop]"),
  screenState: document.querySelector("[data-screen-state]"),
  startup: document.querySelector("[data-startup-screen]"),
  startCustomizing: document.querySelector("[data-start-customizing]"),
  skipStartup: document.querySelector("[data-skip-startup]"),
  settingsPanel: document.querySelector("#settings-panel"),
  avatarFigure: document.querySelector("[data-avatar-figure]"),
  avatarSummary: document.querySelector("[data-avatar-summary]"),
  avatarOptionControls: document.querySelectorAll("[data-avatar-options]"),
  openLaunch: document.querySelector("[data-open-launch]")
};

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecognitionActive = false;
let isWakeListening = false;
let isAwaitingWakeCommand = false;
let deferredInstallPrompt;
let memories = loadMemories();
let voiceSettings = loadVoiceSettings();
let replySettings = loadReplySettings();
let profile = loadProfile();
let avatarSettings = loadAvatarSettings();
let raidList = loadRaidList();
let availableVoices = [];
let screenShareStream;

setupStartupIntro();
renderMessages();
renderMemories();
setupAvatarCustomization();
setupVoiceSettings();
setupReplySettings();
setupProfileSync();
setupQuickLaunch();
setupScreenContext();
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
  if (isRaidListInput(content, raidList)) {
    const raidListResult = handleRaidListInput(content, raidList);

    if (raidListResult.handled) {
      raidList = saveRaidList(raidListResult.raidList);
      return createAssistantMessage(raidListResult.reply);
    }
  }

  const avatarCommand = detectAvatarCommand(content, avatarSettings);

  if (avatarCommand.isAvatarCommand) {
    avatarSettings = saveAvatarSettings(avatarCommand.settings);
    renderAvatar();
    return createAssistantMessage(
      `Done. I updated my avatar ${formatChangedAvatarKeys(avatarCommand.changedKeys)}. Now I look like a ${formatAvatarSummary(
        avatarSettings
      )}.`
    );
  }

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

  const screenReply = await handleScreenContextRequest(content);

  if (screenReply) {
    return createAssistantMessage(withSavedMemoryText(screenReply, automaticMemoryResult.added));
  }

  const actionIntent = detectActionIntent(content);

  if (actionIntent.isAction) {
    openExternalUrl(actionIntent.url);
    return createAssistantMessage(withSavedMemoryText(formatActionReply(actionIntent), automaticMemoryResult.added), {
      sources: [
        {
          title: actionIntent.title,
          url: actionIntent.url
        }
      ]
    });
  }

  const searchIntent = detectSearchIntent(content);

  if (searchIntent.isSearch) {
    return searchAndReply(searchIntent.query);
  }

  const knowledgeQuestion = detectKnowledgeQuestion(content);

  if (knowledgeQuestion.isSearch) {
    return searchAndReply(knowledgeQuestion.query, { automatic: true });
  }

  const relevantMemories = getRelevantMemoryText(content, memories);
  const reply = getLilGResponse(content, messages, {
    relevantMemories,
    replyLength: replySettings.length
  });

  return createAssistantMessage(withSavedMemoryText(reply, automaticMemoryResult.added));
}

async function searchAndReply(query, options = {}) {
  setStatus(`${options.automatic ? "Going online to answer" : "Searching the internet for"} "${query}"...`);

  try {
    const searchResult = await searchInternet(query);
    return createAssistantMessage(formatSearchReply(searchResult, {
      automatic: Boolean(options.automatic),
      replyLength: replySettings.length
    }), {
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

function withSavedMemoryText(reply, addedMemories) {
  const savedMemoryText = formatSavedMemoryText(addedMemories);

  return savedMemoryText ? `${reply}\n\n${savedMemoryText}` : reply;
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
  renderVoicePresetOptions();
  syncVoiceControls();
  loadAvailableVoices();

  elements.voicePresets.addEventListener("change", () => {
    applyVoiceSettings(createPresetSettings(elements.voicePresets.value));
  });

  if (canSpeak() && typeof window.speechSynthesis.addEventListener === "function") {
    window.speechSynthesis.addEventListener("voiceschanged", loadAvailableVoices);
  }
}

function setupReplySettings() {
  syncReplyControls();

  elements.replyLength.addEventListener("change", () => {
    replySettings = saveReplySettings({
      length: elements.replyLength.value
    });
    setStatus(`AI response length set to ${formatAvatarOptionLabel(replySettings.length)}.`);
  });
}

function setupProfileSync() {
  elements.profileName.value = profile.displayName;

  elements.saveProfile.addEventListener("click", () => {
    profile = saveProfile({
      displayName: elements.profileName.value
    });
    elements.profileName.value = profile.displayName;
    setStatus(profile.displayName ? `Profile saved for ${profile.displayName}.` : "Profile name cleared.");
  });

  elements.exportProfile.addEventListener("click", () => {
    elements.profileSyncCode.value = createProfileSyncCode({
      profile,
      memories,
      voiceSettings,
      replySettings,
      avatarSettings
    });
    setStatus("Profile sync code created. Paste it on another device to connect this profile.");
  });

  elements.copyProfile.addEventListener("click", async () => {
    if (!elements.profileSyncCode.value) {
      elements.profileSyncCode.value = createProfileSyncCode({
        profile,
        memories,
        voiceSettings,
        replySettings,
        avatarSettings
      });
    }

    try {
      await navigator.clipboard.writeText(elements.profileSyncCode.value);
      setStatus("Profile sync code copied.");
    } catch {
      setStatus("Copy is unavailable. Select and copy the sync code manually.");
    }
  });

  elements.importProfile.addEventListener("click", () => {
    try {
      const payload = parseProfileSyncCode(elements.importProfileCode.value);
      profile = saveProfile(payload.profile);
      memories = saveMemories(payload.memories);
      voiceSettings = saveVoiceSettings(payload.voiceSettings);
      replySettings = saveReplySettings(payload.replySettings);
      avatarSettings = saveAvatarSettings(payload.avatarSettings);
      elements.profileName.value = profile.displayName;
      elements.importProfileCode.value = "";
      renderMemories();
      renderAvatar();
      syncVoiceControls();
      syncReplyControls();
      setStatus("Profile imported on this device.");
    } catch (error) {
      setStatus(error.message);
    }
  });
}

function setupStartupIntro() {
  document.body.classList.add("has-startup-open");

  elements.startCustomizing.addEventListener("click", () => {
    hideStartupIntro();
    elements.settingsPanel.open = true;
    elements.settingsPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    setStatus("Settings opened. Use the dropdowns to customize Lil-G.");
  });

  elements.skipStartup.addEventListener("click", () => {
    hideStartupIntro();
    setStatus("Lil-G is ready.");
  });
}

function hideStartupIntro() {
  elements.startup.classList.add("is-hidden");
  document.body.classList.remove("has-startup-open");
}

function setupAvatarCustomization() {
  for (const control of elements.avatarOptionControls) {
    const key = control.dataset.avatarOptions;
    control.replaceChildren(
      ...avatarOptions[key].map((option) => {
        const item = document.createElement("option");
        item.value = option;
        item.textContent = formatAvatarOptionLabel(option);
        return item;
      })
    );

    control.addEventListener("change", () => {
      avatarSettings = saveAvatarSettings(applyAvatarUpdate(avatarSettings, { [key]: control.value }));
      renderAvatar();
      setStatus(`Avatar ${formatAvatarOptionLabel(key)} set to ${formatAvatarOptionLabel(control.value)}.`);
    });
  }

  renderAvatar();
}

function renderAvatar() {
  const avatar = avatarSettings;
  elements.avatarFigure.dataset.identity = avatar.identity;
  elements.avatarFigure.dataset.color = avatar.color;
  elements.avatarFigure.dataset.shape = avatar.shape;
  elements.avatarFigure.dataset.hair = avatar.hair;
  elements.avatarFigure.dataset.face = avatar.face;
  elements.avatarFigure.dataset.body = avatar.body;
  elements.avatarFigure.dataset.clothes = avatar.clothes;
  elements.avatarSummary.textContent = `Current avatar: ${formatAvatarSummary(avatar)}.`;

  for (const control of elements.avatarOptionControls) {
    const key = control.dataset.avatarOptions;
    control.value = avatar[key];
  }
}

function setupQuickLaunch() {
  elements.quickLaunch.replaceChildren(
    ...getLaunchTargets().map((target) => {
      const item = document.createElement("option");
      item.value = target.url;
      item.textContent = target.title;
      return item;
    })
  );

  elements.openLaunch.addEventListener("click", () => {
    const target = getLaunchTargets().find((launchTarget) => launchTarget.url === elements.quickLaunch.value);

    if (!target) {
      setStatus("Choose something to open first.");
      return;
    }

    openExternalUrl(target.url);
    setStatus(`Opening ${target.title}.`);
  });
}

function formatChangedAvatarKeys(keys) {
  if (keys.length === 1) {
    return keys[0];
  }

  return keys.slice(0, -1).join(", ") + ` and ${keys.at(-1)}`;
}

function formatAvatarOptionLabel(value) {
  return value.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setupScreenContext() {
  if (!canShareScreen()) {
    elements.screenShare.disabled = true;
    elements.screenStop.disabled = true;
    elements.screenState.textContent = "Screen sharing is unavailable in this browser.";
    return;
  }

  elements.screenShare.addEventListener("click", async () => {
    const result = await requestScreenShare();
    setStatus(result.message);
  });

  elements.screenStop.addEventListener("click", () => {
    stopScreenShare();
    setStatus("Screen sharing stopped.");
  });

  updateScreenState();
}

function renderVoicePresetOptions() {
  elements.voicePresets.replaceChildren(
    ...voicePresets.map((preset) => {
      const item = document.createElement("option");
      item.value = preset.id;
      item.textContent = preset.label;
      item.title = preset.description;
      return item;
    })
  );
}

function syncVoiceControls() {
  const preset = getVoicePreset(voiceSettings.presetId);

  elements.voicePitch.value = String(voiceSettings.pitch);
  elements.voiceRate.value = String(voiceSettings.rate);
  elements.voicePitchValue.textContent = voiceSettings.pitch.toFixed(2);
  elements.voiceRateValue.textContent = voiceSettings.rate.toFixed(2);
  elements.voicePresets.value = preset.id;
}

function applyVoiceSettings(nextSettings) {
  voiceSettings = saveVoiceSettings(nextSettings);
  syncVoiceControls();

  if (elements.talkBack.checked) {
    const preset = getVoicePreset(voiceSettings.presetId);
    setStatus(`Talk-back is on with the ${preset.label} voice.`);
  }
}

function syncReplyControls() {
  elements.replyLength.value = replySettings.length;
}

function loadReplySettings(storage = globalThis.localStorage) {
  if (!storage) {
    return { ...defaultReplySettings };
  }

  try {
    const rawSettings = storage.getItem(REPLY_SETTINGS_STORAGE_KEY);
    return normalizeReplySettings(rawSettings ? JSON.parse(rawSettings) : {});
  } catch {
    return { ...defaultReplySettings };
  }
}

function saveReplySettings(settings, storage = globalThis.localStorage) {
  const normalizedSettings = normalizeReplySettings(settings);

  if (!storage) {
    return normalizedSettings;
  }

  try {
    storage.setItem(REPLY_SETTINGS_STORAGE_KEY, JSON.stringify(normalizedSettings));
  } catch {
    return normalizedSettings;
  }

  return normalizedSettings;
}

function normalizeReplySettings(settings = {}) {
  return {
    length: ["short", "medium", "long"].includes(settings.length) ? settings.length : defaultReplySettings.length
  };
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

async function handleScreenContextRequest(content) {
  if (!isScreenContextRequest(content)) {
    return "";
  }

  const result = await requestScreenShare();

  if (!result.active) {
    return result.message;
  }

  return `${result.message} I can keep track that you are sharing your screen, but this browser-only version does not run visual OCR or image understanding yet. Tell me what app or text you want help with, or paste the text, and I will respond using that context.`;
}

async function requestScreenShare() {
  if (screenShareStream?.active) {
    return {
      active: true,
      message: "Screen sharing is already active."
    };
  }

  if (!canShareScreen()) {
    return {
      active: false,
      message: "This browser does not support screen sharing for Lil-G."
    };
  }

  try {
    screenShareStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false
    });

    const [track] = screenShareStream.getVideoTracks();
    track?.addEventListener?.("ended", () => {
      screenShareStream = undefined;
      updateScreenState();
    });
    updateScreenState();

    return {
      active: true,
      message: "Screen sharing is active."
    };
  } catch {
    updateScreenState();
    return {
      active: false,
      message: "Screen sharing was canceled or blocked."
    };
  }
}

function stopScreenShare() {
  for (const track of screenShareStream?.getTracks() ?? []) {
    track.stop();
  }

  screenShareStream = undefined;
  updateScreenState();
}

function updateScreenState() {
  const isSharing = Boolean(screenShareStream?.active);
  elements.screenStop.disabled = !isSharing;
  elements.screenState.textContent = isSharing
    ? "Screen sharing is on. Full visual understanding needs a future OCR/vision service."
    : "Screen sharing is off.";
}

function canShareScreen() {
  return typeof navigator.mediaDevices?.getDisplayMedia === "function";
}

function isScreenContextRequest(content) {
  return /\b(look at|see|watch|read|scan)\b.*\b(my\s+)?screen\b|\bscreen\b.*\b(context|share|sharing)\b/i.test(content);
}

function openExternalUrl(url) {
  window.open(url, "_blank", "noopener,noreferrer");
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

  const hadController = Boolean(navigator.serviceWorker.controller);
  let didReloadAfterUpdate = false;

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!hadController || didReloadAfterUpdate) {
      return;
    }

    didReloadAfterUpdate = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("./sw.js", { updateViaCache: "none" })
      .then((registration) => {
        registration.update().catch(() => {});
      })
      .catch(() => {
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
