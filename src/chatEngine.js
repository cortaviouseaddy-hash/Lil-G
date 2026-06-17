const normalizers = [
  {
    pattern: /\b(hi|hello|hey|yo|sup)\b/i,
    response:
      "Hey, I'm Lil-G. I'm here with you. Tell me what's on your mind, or ask me for help with something specific."
  },
  {
    pattern: /\b(who are you|your name|what are you)\b/i,
    response:
      "I'm Lil-G, your browser-based AI companion. I can reply in chat and speak my answers out loud when talk-back is turned on."
  },
  {
    pattern: /\b(help|can you|what can you do)\b/i,
    response:
      "I can answer back, talk out loud, brainstorm ideas, help you practice conversations, and keep the chat going. Try asking me a question."
  },
  {
    pattern: /\b(sad|upset|angry|mad|lonely|stressed|anxious)\b/i,
    response:
      "I'm sorry you're dealing with that. Take one slow breath with me. What's the biggest thing weighing on you right now?"
  },
  {
    pattern: /\b(joke|funny|make me laugh)\b/i,
    response:
      "Why did the robot bring a ladder to the conversation? Because it wanted to take the chat to the next level."
  },
  {
    pattern: /\b(thanks|thank you|appreciate)\b/i,
    response:
      "You're welcome. I'm right here whenever you want to keep talking."
  },
  {
    pattern: /\b(stop talking|be quiet|mute)\b/i,
    response:
      "Got it. You can turn talk-back off with the voice toggle, and I'll keep replying in text."
  }
];

const reflectiveOpeners = [
  "I hear you.",
  "That's interesting.",
  "I'm thinking about that with you.",
  "Let's work through that."
];

const followUps = [
  "What would you like to happen next?",
  "Can you tell me a little more?",
  "What part should we focus on first?",
  "Do you want advice, ideas, or just someone to listen?"
];

export function createUserMessage(content) {
  return {
    role: "user",
    content: content.trim(),
    createdAt: new Date().toISOString()
  };
}

export function createAssistantMessage(content, metadata = {}) {
  return {
    role: "assistant",
    content,
    ...metadata,
    createdAt: new Date().toISOString()
  };
}

export function getLilGResponse(input, history = [], context = {}) {
  const message = input.trim();

  if (!message) {
    return "I'm listening. Type something or use the mic so I know what to respond to.";
  }

  const matchedRule = normalizers.find(({ pattern }) => pattern.test(message));

  if (matchedRule) {
    return matchedRule.response;
  }

  const memoryContext = formatMemoryContext(context.relevantMemories);

  if (message.endsWith("?")) {
    return `Good question.${memoryContext} Based on what you said, I'd start by breaking it into one clear next step. ${pickFrom(followUps, message.length)}`;
  }

  const previousAssistantReplies = history.filter((entry) => entry.role === "assistant").length;
  const opener = pickFrom(reflectiveOpeners, message.length + previousAssistantReplies);
  const followUp = pickFrom(followUps, message.length + history.length);

  return `${opener}${memoryContext} You said: "${message}". ${followUp}`;
}

function pickFrom(items, seed) {
  return items[Math.abs(seed) % items.length];
}

function formatMemoryContext(relevantMemories = []) {
  if (!relevantMemories.length) {
    return "";
  }

  return ` I remember ${relevantMemories.join(" and ")}.`;
}
