import { createAssistantMessage, createUserMessage, getLilGResponse } from "./chatEngine.js";
import { canSpeak, speakText, stopSpeaking } from "./speech.js";

const messages = [
  createAssistantMessage(
    "What's up? I'm Lil-G. Send me a message and I can respond here. Turn on talk-back if you want me to speak out loud."
  )
];

const elements = {
  form: document.querySelector("[data-chat-form]"),
  input: document.querySelector("[data-chat-input]"),
  messages: document.querySelector("[data-chat-messages]"),
  status: document.querySelector("[data-status]"),
  talkBack: document.querySelector("[data-talk-back]"),
  stopSpeech: document.querySelector("[data-stop-speech]"),
  mic: document.querySelector("[data-mic]")
};

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

renderMessages();
updateStatus();
setupSpeechRecognition();

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
    elements.mic.textContent = "Mic unavailable";
    return;
  }

  recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.addEventListener("start", () => {
    elements.mic.classList.add("is-listening");
    setStatus("Listening...");
  });

  recognition.addEventListener("end", () => {
    elements.mic.classList.remove("is-listening");
  });

  recognition.addEventListener("result", (event) => {
    const transcript = event.results[0][0].transcript;
    elements.input.value = transcript;
    sendMessage(transcript);
  });

  recognition.addEventListener("error", () => {
    setStatus("I couldn't hear that clearly. Try typing or tap the mic again.");
  });

  elements.mic.addEventListener("click", () => {
    recognition.start();
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
