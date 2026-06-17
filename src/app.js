import { createAssistantMessage, createUserMessage, getLilGResponse } from "./chatEngine.js";
import { canSpeak, speakText, stopSpeaking } from "./speech.js";
import { detectWakePhrase } from "./wakeWord.js";

const messages = [
  createAssistantMessage(
    "What's up? I'm Lil-G. Send me a message, tap the mic, or start wake listening and say \"Hey Lil-G\" to get my attention."
  )
];

const elements = {
  form: document.querySelector("[data-chat-form]"),
  input: document.querySelector("[data-chat-input]"),
  install: document.querySelector("[data-install]"),
  messages: document.querySelector("[data-chat-messages]"),
  status: document.querySelector("[data-status]"),
  talkBack: document.querySelector("[data-talk-back]"),
  stopSpeech: document.querySelector("[data-stop-speech]"),
  mic: document.querySelector("[data-mic]"),
  wake: document.querySelector("[data-wake]")
};

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;
let isRecognitionActive = false;
let isWakeListening = false;
let isAwaitingWakeCommand = false;
let deferredInstallPrompt;

renderMessages();
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

elements.stopSpeech.addEventListener("click", () => {
  stopSpeaking();
  setStatus("Speech stopped.");
});

function sendMessage(rawInput) {
  const content = rawInput.trim();

  if (!content) {
    setStatus("Type a message first.");
    return;
  }

  const userMessage = createUserMessage(content);
  messages.push(userMessage);
  elements.input.value = "";
  renderMessages();

  const reply = getLilGResponse(content, messages);
  const assistantMessage = createAssistantMessage(reply);
  messages.push(assistantMessage);
  renderMessages();

  if (elements.talkBack.checked) {
    const didSpeak = speakText(reply);
    setStatus(didSpeak ? "Lil-G answered and spoke back." : "Lil-G answered. Speech is not available in this browser.");
  } else {
    setStatus("Lil-G answered in chat.");
  }
}

function acknowledgeWakePhrase() {
  const reply = "I'm listening. What do you want to ask me?";
  messages.push(createAssistantMessage(reply));
  renderMessages();

  if (elements.talkBack.checked) {
    speakText(reply);
  }

  setStatus("Wake phrase heard. Say your message now.");
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
      return item;
    })
  );

  elements.messages.scrollTop = elements.messages.scrollHeight;
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
    navigator.serviceWorker.register("/sw.js").catch(() => {
      setStatus("Lil-G works online, but offline app setup is unavailable.");
    });
  });
}

function updateStatus() {
  if (elements.talkBack.checked && !canSpeak()) {
    setStatus("Talk-back is on, but this browser does not support speech synthesis.");
    return;
  }

  setStatus(elements.talkBack.checked ? "Talk-back is on." : "Talk-back is off.");
}

function setStatus(message) {
  elements.status.textContent = message;
}
